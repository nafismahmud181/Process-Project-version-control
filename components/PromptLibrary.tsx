"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { PromptIndexEntry, PromptEntry, PromptVersion } from "@/types/prompt";
import { fetchPromptIndex, fetchPromptEntry } from "@/lib/prompts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diffText(a: string, b: string) {
  return a === b ? null : { from: a, to: b };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Key type color mapping ───────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  key:                "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  table:              "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-900",
  addressBlock:       "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
  addressBlockPartial:"bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-900",
  compound:           "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900",
  lookupCode:         "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {type}
    </span>
  );
}

// ─── Modal — full detail view ─────────────────────────────────────────────────

function DiffBlock({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
        {label} — changed
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900 dark:bg-rose-950">
          <p className="mb-1 text-[10px] text-rose-400">previous</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-rose-700 dark:text-rose-300">
            {from || <em className="opacity-40">empty</em>}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="mb-1 text-[10px] text-emerald-500">updated</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
            {to || <em className="opacity-40">empty</em>}
          </p>
        </div>
      </div>
    </div>
  );
}

function VersionPanel({
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
  const fieldDiff = prevVersion ? diffText(prevVersion.field_description, version.field_description) : null;
  const rulesDiff = prevVersion ? diffText(prevVersion.rules_description, version.rules_description) : null;
  const hasChanges = !!(fieldDiff || rulesDiff);

  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${
      isLatest ? "border-blue-200 dark:border-blue-900" : "border-gray-200 dark:border-gray-800"
    }`}>
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/40"
      >
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
          isLatest
            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
        }`}>
          v{version.versionNumber}
        </span>
        {hasChanges && (
          <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
            changed
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-500">
          from <span className="font-medium text-gray-700 dark:text-gray-300">{version.sourceVersionLabel}</span>
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-gray-400 dark:text-gray-600">{fmtDate(version.timestamp)}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-600">{isOpen ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
          {/* Meta chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            {version.doc_class && (
              <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {version.doc_class}
              </span>
            )}
            {version.extraction_type && (
              <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {version.extraction_type}
              </span>
            )}
          </div>

          {hasChanges ? (
            <>
              {fieldDiff && <DiffBlock label="Field description" from={fieldDiff.from} to={fieldDiff.to} />}
              {rulesDiff && <DiffBlock label="Rules description" from={rulesDiff.from} to={rulesDiff.to} />}
            </>
          ) : (
            <>
              {version.field_description && (
                <div className="mb-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Field description</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{version.field_description}</p>
                </div>
              )}
              {version.rules_description && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Rules description</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{version.rules_description}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PromptModal({
  indexEntry,
  onClose,
  onDelete,
}: {
  indexEntry: PromptIndexEntry;
  onClose: () => void;
  onDelete: (entry: PromptIndexEntry) => void;
}) {
  const [entry, setEntry] = useState<PromptEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [openVersions, setOpenVersions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetchPromptEntry(indexEntry.keyValue, indexEntry.processId).then((e) => {
      setEntry(e);
      if (e?.versions.length) {
        setOpenVersions({ [e.versions[e.versions.length - 1].versionNumber]: true });
      }
      setLoading(false);
    });
  }, [indexEntry.keyValue, indexEntry.processId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleVersion = (n: number) =>
    setOpenVersions((prev) => ({ ...prev, [n]: !prev[n] }));

  const reversedVersions = entry ? [...entry.versions].reverse() : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-6 pt-16"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        {/* Modal header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div className="min-w-0 flex-1 pr-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {indexEntry.label}
              </h2>
              {indexEntry.hasChanges && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                  {indexEntry.versionCount} versions
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-500">{indexEntry.keyValue}</span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <TypeBadge type={indexEntry.keyType} />
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-500">{indexEntry.processName}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => { onDelete(indexEntry); onClose(); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50 dark:border-gray-700 dark:hover:border-rose-900 dark:hover:bg-rose-950"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Loading…
            </div>
          ) : !entry ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Failed to load prompt.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reversedVersions.map((v, i) => (
                <VersionPanel
                  key={v.versionNumber}
                  version={v}
                  prevVersion={reversedVersions[i + 1] ?? null}
                  isLatest={i === 0}
                  isOpen={!!openVersions[v.versionNumber]}
                  onToggle={() => toggleVersion(v.versionNumber)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Prompt card ──────────────────────────────────────────────────────────────

function PromptCard({
  entry,
  onClick,
}: {
  entry: PromptIndexEntry;
  onClick: () => void;
}) {
  const latestFieldDesc = entry.latestFieldDesc ?? "";
  const preview = latestFieldDesc.length > 100
    ? latestFieldDesc.slice(0, 100).trimEnd() + "…"
    : latestFieldDesc;

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      {/* Top row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={entry.keyType} />
          {entry.hasChanges ? (
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
              v{entry.versionCount}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-gray-600">v1</span>
          )}
        </div>
      </div>

      {/* Label */}
      <p className="mb-1 text-sm font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
        {entry.label}
      </p>

      {/* keyValue */}
      <p className="mb-2.5 font-mono text-[11px] text-gray-400 dark:text-gray-600">
        {entry.keyValue}
      </p>

      {/* Field description preview */}
      {preview ? (
        <p className="mt-auto text-[11px] leading-relaxed text-gray-500 dark:text-gray-500">
          {preview}
        </p>
      ) : (
        <p className="mt-auto text-[11px] italic text-gray-300 dark:text-gray-700">
          No field description
        </p>
      )}

      {/* Bottom: process name + date */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <span className="truncate text-[10px] text-gray-400 dark:text-gray-600">
          {entry.processName}
        </span>
        <span className="ml-2 shrink-0 text-[10px] text-gray-400 dark:text-gray-600">
          {fmtDate(entry.updatedAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ChangeFilter = "all" | "changed" | "stable";

// Extend PromptIndexEntry locally to carry latestFieldDesc for the card preview
type PromptIndexEntryWithPreview = PromptIndexEntry & { latestFieldDesc?: string };

export function PromptLibrary() {
  const [index, setIndex]           = useState<PromptIndexEntryWithPreview[]>([]);
  const [selected, setSelected]     = useState<PromptIndexEntryWithPreview | null>(null);
  const [booting, setBooting]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
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
        i.processName.toLowerCase().includes(q) ||
        (i.latestFieldDesc ?? "").toLowerCase().includes(q);
      const matchType   = typeFilter === "all" || i.keyType === typeFilter;
      const matchChange =
        changeFilter === "all" ||
        (changeFilter === "changed" && i.hasChanges) ||
        (changeFilter === "stable"  && !i.hasChanges);
      return matchSearch && matchType && matchChange;
    });
  }, [index, search, typeFilter, changeFilter]);

  const handleDelete = useCallback((entry: PromptIndexEntry) => {
    setIndex((prev) =>
      prev.filter((i) => !(i.keyValue === entry.keyValue && i.processId === entry.processId))
    );
    fetch(`/api/prompts/${encodeURIComponent(entry.keyValue + "__" + entry.processId)}`, {
      method: "DELETE",
    }).catch(console.error);
  }, []);

  const changedCount = index.filter((i) => i.hasChanges).length;

  if (booting) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-400">
        Loading prompt library…
      </div>
    );
  }

  return (
    <>
      {/* Modal */}
      {selected && (
        <PromptModal
          indexEntry={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Search bar */}
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label, key, process name, or description…"
          className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-600"
        />
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Change filter */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
          {(["all", "changed", "stable"] as ChangeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setChangeFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                changeFilter === f
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              }`}
            >
              {f === "all" ? `All ${index.length}` : f === "changed" ? `Changed ${changedCount}` : `Stable ${index.length - changedCount}`}
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-1.5">
          {["all", ...keyTypes].map((t) => {
            const cls = t !== "all" ? (TYPE_COLORS[t] ?? "bg-gray-100 text-gray-600 border-gray-200") : "";
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  typeFilter === t
                    ? t === "all"
                      ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                      : `${cls} opacity-100 ring-2 ring-offset-1 ring-current`
                    : t === "all"
                      ? "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                      : `${cls} opacity-60 hover:opacity-100`
                }`}
              >
                {t === "all" ? "All types" : t}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        {(search || typeFilter !== "all" || changeFilter !== "all") && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-600">
              {filtered.length} of {index.length}
            </span>
            <button
              onClick={() => { setSearch(""); setTypeFilter("all"); setChangeFilter("all"); }}
              className="text-xs text-gray-400 underline hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Card grid */}
      {index.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <span className="text-3xl text-gray-300 dark:text-gray-700">📝</span>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            No prompts yet.{" "}
            <a href="/" className="text-blue-500 hover:underline">
              Upload a process
            </a>{" "}
            to populate the library.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500">No prompts match your filters.</p>
          <button
            onClick={() => { setSearch(""); setTypeFilter("all"); setChangeFilter("all"); }}
            className="text-xs text-blue-500 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <PromptCard
              key={entry.keyValue + entry.processId}
              entry={entry}
              onClick={() => setSelected(entry)}
            />
          ))}
        </div>
      )}
    </>
  );
}