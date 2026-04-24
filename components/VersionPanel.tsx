"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { InspectView } from "./InspectView";
import { DiffView } from "./DiffView";
import { UploadModal } from "./UploadModal";
import { diffKeys, diffDocs } from "@/lib/diff";
import {
  getVersionIndex,
  saveVersionIndex,
  getVersionData,
  saveVersionData,
  deleteVersionData,
} from "@/lib/storage";
import type { Process, VersionMeta } from "@/types/process";

export function VersionPanel() {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Record<string, Process>>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{
    processId: string;
    processName: string;
    versionNumber: number;
  } | null>(null);
  const [booting, setBooting] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load version index from localStorage on mount
  useEffect(() => {
    setVersions(getVersionIndex());
    setBooting(false);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    e.target.value = "";

    // Pre-parse to detect process identity before the modal opens
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      const proc = Array.isArray(parsed) ? parsed[0] : parsed;
      const processId = proc.process_id ?? "—";
      const processName = proc.name ?? "—";
      setPendingMeta({
        processId,
        processName,
        versionNumber: nextVersionNumber(processId),
      });
    } catch {
      setPendingMeta(null);
    }
  };

  const nextVersionNumber = (processId: string) =>
    versions.filter((v) => v.processId === processId).length + 1;

  const existingVersionCount = (processId: string) =>
    versions.filter((v) => v.processId === processId).length;

  const handleConfirmUpload = async (label: string, note: string) => {
    if (!pendingFile) return;

    let proc: Process;
    try {
      const text = await pendingFile.text();
      const parsed = JSON.parse(text);
      proc = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      alert("Could not parse JSON file.");
      return;
    }

    const processId = proc.process_id ?? "—";
    const processName = proc.name ?? "—";
    const versionNumber = nextVersionNumber(processId);
    const autoLabel =
      label ||
      (versionNumber > 1 ? `${processName} v${versionNumber}` : processName);

    const id = `v_${Date.now()}`;
    const meta: VersionMeta = {
      id,
      label: autoLabel,
      note,
      timestamp: new Date().toISOString(),
      processId,
      processName,
      keyCount: proc.keys?.length ?? 0,
      docCount: proc.documents?.length ?? 0,
      versionNumber,
    };

    saveVersionData(id, proc);
    const next = [meta, ...versions];
    setVersions(next);
    saveVersionIndex(next);
    setLoaded((prev) => ({ ...prev, [id]: proc }));
    setPendingFile(null);
    setPendingMeta(null);
  };

  const loadVersion = (id: string): Process | null => {
    if (loaded[id]) return loaded[id];
    const data = getVersionData(id);
    if (data) setLoaded((prev) => ({ ...prev, [id]: data }));
    return data;
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      return;
    }
    loadVersion(id);
    setSelectedIds((prev) =>
      prev.length < 2 ? [...prev, id] : [prev[0], id]
    );
  };

  const handleDelete = (id: string) => {
    const next = versions.filter((v) => v.id !== id);
    setVersions(next);
    saveVersionIndex(next);
    deleteVersionData(id);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setLoaded((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  };

  // Resolve diff when two versions are selected
  const diff = (() => {
    if (selectedIds.length !== 2) return null;
    const [pA, pB] = [loaded[selectedIds[0]], loaded[selectedIds[1]]];
    if (!pA || !pB) return null;
    const [mA, mB] = [
      versions.find((v) => v.id === selectedIds[0])!,
      versions.find((v) => v.id === selectedIds[1])!,
    ];
    const [fromM, toM, from, to] =
      new Date(mA.timestamp) < new Date(mB.timestamp)
        ? [mA, mB, pA, pB]
        : [mB, mA, pB, pA];
    return {
      fromMeta: fromM,
      toMeta: toM,
      keysDiff: diffKeys(from.keys ?? [], to.keys ?? []),
      docsDiff: diffDocs(from.documents ?? [], to.documents ?? []),
    };
  })();

  const single =
    selectedIds.length === 1 ? loaded[selectedIds[0]] : null;
  const singleMeta =
    selectedIds.length === 1
      ? versions.find((v) => v.id === selectedIds[0])
      : null;

  if (booting) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <>
      {/* Upload modal */}
      {pendingFile && (
        <UploadModal
          fileName={pendingFile.name}
          detectedProcess={pendingMeta}
          onConfirm={handleConfirmUpload}
          onCancel={() => { setPendingFile(null); setPendingMeta(null); }}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Panel layout */}
      <div className="flex h-full min-h-[560px] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <Sidebar
          versions={versions}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onUploadClick={() => fileRef.current?.click()}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {/* Empty state */}
          {selectedIds.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="text-4xl text-gray-300 dark:text-gray-700">
                ⎇
              </span>
              <p className="max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-500">
                Select a version to inspect it, or select two to compare
                changes.
              </p>
              {versions.length === 0 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Upload first version
                </button>
              )}
            </div>
          )}

          {/* Inspect single version */}
          {single && singleMeta && (
            <InspectView process={single} meta={singleMeta} />
          )}

          {/* Compare two versions */}
          {diff && selectedIds.length === 2 && (
            <DiffView
              fromMeta={diff.fromMeta}
              toMeta={diff.toMeta}
              keysDiff={diff.keysDiff}
              docsDiff={diff.docsDiff}
            />
          )}
        </main>
      </div>
    </>
  );
}