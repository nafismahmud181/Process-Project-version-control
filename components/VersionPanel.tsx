"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { InspectView } from "./InspectView";
import { DiffView } from "./DiffView";
import { UploadModal } from "./UploadModal";
import { diffKeys, diffDocs } from "@/lib/diff";
import {
  fetchVersionIndex,
  uploadVersion,
  fetchVersionData,
  removeVersion,
} from "@/lib/storage";
import type { Process, VersionMeta } from "@/types/process";

export function VersionPanel() {
  const [versions, setVersions]   = useState<VersionMeta[]>([]);
  const [selectedIds, setSelIds]  = useState<string[]>([]);
  const [loaded, setLoaded]       = useState<Record<string, Process>>({});
  const [pendingFile, setPending] = useState<File | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{
    processId: string;
    processName: string;
    versionNumber: number;
  } | null>(null);
  const [booting, setBooting]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVersionIndex().then((v) => {
      setVersions(v);
      setBooting(false);
    });
  }, []);

  const nextVersionNumber = (processId: string) =>
    versions.filter((v) => v.processId === processId).length + 1;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPending(f);
    e.target.value = "";

    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      const proc = Array.isArray(parsed) ? parsed[0] : parsed;
      setPendingMeta({
        processId: proc.process_id ?? "—",
        processName: proc.name ?? "—",
        versionNumber: nextVersionNumber(proc.process_id ?? "—"),
      });
    } catch {
      setPendingMeta(null);
    }
  };

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

    const processId   = proc.process_id ?? "—";
    const processName = proc.name ?? "—";
    const versionNumber = nextVersionNumber(processId);
    const autoLabel =
      label ||
      (versionNumber > 1 ? `${processName} v${versionNumber}` : processName);

    const id = `v_${Date.now()}`;
    const metaWithoutUrl: Omit<VersionMeta, "blobUrl"> = {
      id,
      label: autoLabel,
      note,
      timestamp: new Date().toISOString(),
      processId,
      processName,
      keyCount:  proc.keys?.length ?? 0,
      docCount:  proc.documents?.length ?? 0,
      versionNumber,
    };

    setUploading(true);
    try {
      const saved = await uploadVersion(pendingFile, metaWithoutUrl);
      setVersions((prev) => [saved, ...prev]);
      setLoaded((prev) => ({ ...prev, [id]: proc }));
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }

    setPending(null);
    setPendingMeta(null);
  };

  const handleSelect = async (id: string) => {
    if (selectedIds.includes(id)) {
      setSelIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    // Load data if not already cached
    if (!loaded[id]) {
      const meta = versions.find((v) => v.id === id);
      if (!meta) return;
      setLoadingId(id);
      try {
        const data = await fetchVersionData(meta.blobUrl);
        setLoaded((prev) => ({ ...prev, [id]: data }));
      } catch {
        alert("Failed to load version data.");
        setLoadingId(null);
        return;
      }
      setLoadingId(null);
    }

    setSelIds((prev) =>
      prev.length < 2 ? [...prev, id] : [prev[0], id]
    );
  };

  const handleDelete = async (id: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== id));
    setSelIds((prev) => prev.filter((x) => x !== id));
    setLoaded((prev) => { const n = { ...prev }; delete n[id]; return n; });
    await removeVersion(id);
  };

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
      toMeta:   toM,
      keysDiff: diffKeys(from.keys ?? [], to.keys ?? []),
      docsDiff: diffDocs(from.documents ?? [], to.documents ?? []),
    };
  })();

  const single     = selectedIds.length === 1 ? loaded[selectedIds[0]] : null;
  const singleMeta = selectedIds.length === 1
    ? versions.find((v) => v.id === selectedIds[0])
    : null;

  if (booting) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-gray-400">
        Loading versions…
      </div>
    );
  }

  return (
    <>
      {(pendingFile && !uploading) && (
        <UploadModal
          fileName={pendingFile.name}
          detectedProcess={pendingMeta}
          onConfirm={handleConfirmUpload}
          onCancel={() => { setPending(null); setPendingMeta(null); }}
        />
      )}

      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl border border-gray-200 bg-white px-8 py-6 text-sm text-gray-700 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Uploading to Vercel Blob…
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex h-full min-h-[560px] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <Sidebar
          versions={versions}
          selectedIds={selectedIds}
          loadingId={loadingId}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onUploadClick={() => fileRef.current?.click()}
        />

        <main className="flex-1 overflow-y-auto">
          {selectedIds.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="text-4xl text-gray-300 dark:text-gray-700">⎇</span>
              <p className="max-w-xs text-sm leading-relaxed text-gray-500">
                Select a version to inspect, or select two to compare changes.
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

          {selectedIds.length === 1 && !single && (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Loading…
            </div>
          )}

          {single && singleMeta && (
            <InspectView process={single} meta={singleMeta} />
          )}

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