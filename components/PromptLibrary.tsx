"use client";

import { useState, useEffect, useMemo } from "react";
import type { PromptIndexEntry, PromptEntry, PromptVersion } from "@/types/prompt";
import { fetchPromptIndex, fetchPromptEntry } from "@/lib/prompts";

// ─── Diff helper ─────────────────────────────────────────────────────────────

function diffText(a: string, b: string): { from: string; to: string } | null {
  if (a === b) return null;
  return { from: a, to: b };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VersionBadge({ v, isLatest }: { v: PromptVersion; isLatest: boolean }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
      isLatest
        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
    }`}>
      v{v.versionNumber}
    </span>
  );
}

function ChangedBadge() {
  return (
    <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
      changed
    </span>
  );
}

function DiffBlock({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="mt-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-600">
        {label} — changed
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 dark:border-rose-900 dark:bg-rose-950">
          <p className="mb-1 text-[10px] text-rose-400 dark:text-rose-600">previous</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-rose-700 dark:text-rose-300">
            {from || <em className="opacity-50">empty</em>}
          </p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="mb-1 text-[10px] text-emerald-500 dark:text-emerald-600">updated</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
            {to || <em className="opacity-50">empty</em>}
          </p>
        </div>
      </div>
    </div>
  );
}

function VersionBlock({
  version,
  prevVersion,
  isLatest,
  isOpen,
  onToggle,
}: {
  version: PromptVersion;
  prevVersion: PromptVersion | null;
  isLatest: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const fieldDiff = prevVersion
    ? diffText(prevVersion.field_description, version.field_description)
    : null;
  const rulesDiff = prevVersion
    ? diffText(prevVersion.rules_description, version.rules_description)
    : null;
  const hasChanges = !!(fieldDiff || rulesDiff);

  return (
    <div className={`rounded-lg border ${
      isLatest
        ? "border-blue-200 dark:border-blue-900"
        : "border-gray-200 dark:border-gray-800"
    }`}>
      {/* Version header */}
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-2.5 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/40"
      >
        <VersionBadge v={version} isLatest={isLatest} />
        {hasChanges && <ChangedBadge />}
        <span className="text-xs text-gray-500 dark:text-gray-500">
          from <span className="font-medium text-gray-700 dark:text-gray-300">{version.sourceVersionLabel}</span>
        </span>
        <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-600">
          {new Date(version.timestamp).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
          })}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-600">
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {/* Version body */}
      {isOpen && (
        <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-800">
          {/* Meta row */}
          <div className="mb-3 flex flex-wrap gap-2">
            {version.doc_class && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {version.doc_class}
              </span>
            )}
            {version.extraction_type && (
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {version.extraction_type}
              </span>
            )}
          </div>

          {/* Show diff if changed, otherwise show full content */}
          {hasChanges ? (
            <>
              {fieldDiff && (
                <DiffBlock
                  label="Field description"
                  from={fieldDiff.from}
                  to={fieldDiff.to}
                />
              )}
              {rulesDiff && (
                <DiffBlock
                  label="Rules description"
                  from={rulesDiff.from}
                  to={rulesDiff.to}
                />
              )}
            </>
          ) : (
            <>
              {version.field_description && (
                <div className="mb-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-600">
                    Field description
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                    {version.field_description}
                  </p>
                </div>
              )}
              {version.rules_description && (
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-600">
                    Rules description
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                    {version.rules_description}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DetailPanel({ indexEntry }: { indexEntry: PromptIndexEntry }) {
  const [entry, setEntry] = useState<PromptEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [openVersions, setOpenVersions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setEntry(null);
    fetchPromptEntry(indexEntry.keyValue, indexEntry.processId).then((e) => {
      setEntry(e);
      // Auto-open latest version
      if (e?.versions.length) {
        const latest = e.versions[e.versions.length - 1].versionNumber;
        setOpenVersions({ [latest]: true });
      }
      setLoading(false);
    });
  }, [indexEntry.keyValue, indexEntry.processId]);

  const toggleVersion = (n: number) =>
    setOpenVersions((prev) => ({ ...prev, [n]: !prev[n] }));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Failed to load entry.
      </div>
    );
  }

  const reversedVersions = [...entry.versions].reverse();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {entry.label}
        </h2>
        {entry.versions.length > 1 && (
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
            {entry.versions.length - 1} change{entry.versions.length > 2 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-500">
        <span className="font-mono">{entry.keyValue}</span> · {entry.keyType}
      </p>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-600">
        {entry.processName}
      </p>

      {/* Versions (newest first) */}
      <div className="flex flex-col gap-3">
        {reversedVersions.map((v, i) => {
          const prevV = reversedVersions[i + 1] ?? null;
          const isLatest = i === 0;
          return (
            <VersionBlock
              key={v.versionNumber}
              version={v}
              prevVersion={prevV}
              isLatest={isLatest}
              isOpen={!!openVersions[v.versionNumber]}
              onToggle={() => toggleVersion(v.versionNumber)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type KeyTypeFilter = "all" | string;
type ChangeFilter  = "all" | "changed" | "stable";

export function PromptLibrary() {
  const [index, setIndex]           = useState<PromptIndexEntry[]>([]);
  const [selected, setSelected]     = useState<PromptIndexEntry | null>(null);
  const [booting, setBooting]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<KeyTypeFilter>("all");
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>("all");

  useEffect(() => {
    fetchPromptIndex().then((idx) => {
      setIndex(idx);
      setBooting(false);
    });
  }, []);

  const keyTypes = useMemo(
    () => Array.from(new Set(index.map((i) => i.keyType))).sort(),
    [index]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return index.filter((i) => {
      const matchSearch =
        !q ||
        i.label.toLowerCase().includes(q) ||
        i.keyValue.toLowerCase().includes(q) ||
        i.processName.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || i.keyType === typeFilter;
      const matchChange =
        changeFilter === "all" ||
        (changeFilter === "changed" && i.hasChanges) ||
        (changeFilter === "stable" && !i.hasChanges);
      return matchSearch && matchType && matchChange;
    });
  }, [index, search, typeFilter, changeFilter]);

  const changedCount = index.filter((i) => i.hasChanges).length;

  if (booting) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-gray-400">
        Loading prompt library…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[580px] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      {/* ── Sidebar ── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        {/* Search */}
        <div className="border-b border-gray-200 p-3 dark:border-gray-800">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
          />
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-800">
          {/* Change filter */}
          <div className="mb-2 flex gap-1">
            {(["all", "changed", "stable"] as ChangeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setChangeFilter(f)}
                className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                  changeFilter === f
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "text-gray-500 hover:bg-gray-200 dark:text-gray-500 dark:hover:bg-gray-800"
                }`}
              >
                {f === "all" ? `All ${index.length}` : f === "changed" ? `Changed ${changedCount}` : "Stable"}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-1">
            {["all", ...keyTypes].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                  typeFilter === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-gray-400 dark:text-gray-600">
              {index.length === 0
                ? "No prompts yet. Upload a process to populate the library."
                : "No prompts match your filters."}
            </p>
          ) : (
            filtered.map((entry) => {
              const isSel =
                selected?.keyValue === entry.keyValue &&
                selected?.processId === entry.processId;
              return (
                <div
                  key={entry.keyValue + entry.processId}
                  onClick={() => setSelected(entry)}
                  className={`cursor-pointer border-b border-gray-200 px-4 py-3 transition-colors dark:border-gray-800 ${
                    isSel
                      ? "border-l-2 border-l-blue-500 bg-white dark:bg-gray-800"
                      : "border-l-2 border-l-transparent hover:bg-white dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {entry.label}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {entry.hasChanges && (
                        <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                          v{entry.versionCount}
                        </span>
                      )}
                      {!entry.hasChanges && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-600">
                          v1
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="truncate font-mono text-[11px] text-gray-500 dark:text-gray-500">
                    {entry.keyValue}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-600">
                    {entry.keyType}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer count */}
        {index.length > 0 && (
          <p className="border-t border-gray-200 px-4 py-2 text-center text-[11px] text-gray-400 dark:border-gray-800 dark:text-gray-600">
            {filtered.length} of {index.length} prompts
          </p>
        )}
      </aside>

      {/* ── Detail panel ── */}
      <main className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="text-3xl text-gray-300 dark:text-gray-700">📝</span>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-500">
              Select a prompt from the list to view its versions and change history.
            </p>
            {index.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Upload a process on the{" "}
                <a href="/" className="text-blue-500 hover:underline">
                  versions page
                </a>{" "}
                to populate the library.
              </p>
            )}
          </div>
        ) : (
          <DetailPanel key={selected.keyValue + selected.processId} indexEntry={selected} />
        )}
      </main>
    </div>
  );
}