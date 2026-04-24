"use client";

import { useState, useMemo } from "react";
import type { Process, VersionMeta, ProcessKey } from "@/types/process";

interface InspectViewProps {
  process: Process;
  meta: VersionMeta;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type CompletenessStatus = "complete" | "partial" | "empty";

function getCompleteness(k: ProcessKey): CompletenessStatus {
  const hasField = !!k.process_prompt?.Field_Description?.trim();
  const hasRules = !!k.process_prompt?.Rules_Description?.trim();
  if (hasField && hasRules) return "complete";
  if (hasField || hasRules) return "partial";
  return "empty";
}

const COMPLETENESS_STYLES: Record<CompletenessStatus, string> = {
  complete: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  partial:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  empty:    "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
};

const COMPLETENESS_LABEL: Record<CompletenessStatus, string> = {
  complete: "✓",
  partial:  "~",
  empty:    "✕",
};

function CompletenessBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
        {pct}%
      </span>
    </div>
  );
}

export function InspectView({ process, meta }: InspectViewProps) {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [completenessFilter, setCompletenessFilter] = useState<CompletenessStatus | "all">("all");

  const toggleKey = (keyValue: string) =>
    setExpandedKeys((prev) => ({ ...prev, [keyValue]: !prev[keyValue] }));

  const keys = process.keys ?? [];

  // Derive unique types from the keys
  const keyTypes = useMemo(() => {
    const types = Array.from(new Set(keys.map((k) => k.type)));
    return types.sort();
  }, [keys]);

  // Completeness stats
  const completenessStats = useMemo(() => {
    const complete = keys.filter((k) => getCompleteness(k) === "complete").length;
    const partial  = keys.filter((k) => getCompleteness(k) === "partial").length;
    const empty    = keys.filter((k) => getCompleteness(k) === "empty").length;
    return { complete, partial, empty, score: keys.length ? complete / keys.length : 0 };
  }, [keys]);

  // Filtered keys
  const filteredKeys = useMemo(() => {
    const q = search.toLowerCase().trim();
    return keys.filter((k) => {
      const matchesSearch =
        !q ||
        k.label.toLowerCase().includes(q) ||
        k.keyValue.toLowerCase().includes(q) ||
        (k.process_prompt?.DocClass ?? "").toLowerCase().includes(q) ||
        (k.process_prompt?.Field_Description ?? "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || k.type === typeFilter;
      const matchesCompleteness =
        completenessFilter === "all" || getCompleteness(k) === completenessFilter;
      return matchesSearch && matchesType && matchesCompleteness;
    });
  }, [keys, search, typeFilter, completenessFilter]);

  const stats = [
    { label: "Process ID", value: process.process_id },
    { label: "Country",    value: process.country },
    { label: "Keys",       value: keys.length },
    { label: "Documents",  value: (process.documents ?? []).length },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <p className="mb-0.5 text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-600">
        Inspecting
      </p>
      <h2 className="mb-1 text-lg font-medium text-gray-900 dark:text-gray-100">
        {meta.label}
      </h2>
      <p className="mb-6 text-xs text-gray-500 dark:text-gray-500">
        {meta.processId} · {formatDate(meta.timestamp)}
      </p>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-500">{label}</p>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Completeness score card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Prompt completeness
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {completenessStats.complete} of {keys.length} keys fully described
          </p>
        </div>
        <CompletenessBar score={completenessStats.score} />
        <div className="mt-3 flex gap-3">
          {(["complete", "partial", "empty"] as CompletenessStatus[]).map((s) => {
            const count = completenessStats[s];
            const isActive = completenessFilter === s;
            return (
              <button
                key={s}
                onClick={() =>
                  setCompletenessFilter(isActive ? "all" : s)
                }
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                  isActive
                    ? COMPLETENESS_STYLES[s]
                    : "text-gray-500 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800"
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${COMPLETENESS_STYLES[s]}`}
                >
                  {COMPLETENESS_LABEL[s]}
                </span>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="font-medium">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keys section */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-500">
          Extraction keys
        </h3>
        {(search || typeFilter !== "all" || completenessFilter !== "all") && (
          <span className="text-[11px] text-gray-400 dark:text-gray-600">
            {filteredKeys.length} of {keys.length} shown
          </span>
        )}
        <button
          onClick={() => {
            setSearch("");
            setTypeFilter("all");
            setCompletenessFilter("all");
          }}
          className={`ml-auto text-[11px] text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 ${
            !search && typeFilter === "all" && completenessFilter === "all"
              ? "invisible"
              : ""
          }`}
        >
          Clear filters
        </button>
      </div>

      {/* Search + type filter bar */}
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label, key, doc class, or description…"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
        />
      </div>

      {/* Type filter tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {["all", ...keyTypes].map((t) => {
          const count =
            t === "all"
              ? keys.length
              : keys.filter((k) => k.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                typeFilter === t
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {t}{" "}
              <span className={typeFilter === t ? "opacity-70" : "opacity-50"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Keys table */}
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr_28px] border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
          {["Label", "Type", "Doc class", "Field description", "Rules description", ""].map(
            (h) => (
              <span
                key={h}
                className="text-[11px] font-medium text-gray-500 dark:text-gray-500"
              >
                {h}
              </span>
            )
          )}
        </div>

        {filteredKeys.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-600">
            No keys match your search or filters.
          </div>
        ) : (
          filteredKeys.map((k, i) => {
            const isExpanded = expandedKeys[k.keyValue];
            const fieldDesc = k.process_prompt?.Field_Description || "";
            const rulesDesc = k.process_prompt?.Rules_Description || "";
            const hasLongContent = fieldDesc.length > 80 || rulesDesc.length > 80;
            const completeness = getCompleteness(k);
            const isLast = i === filteredKeys.length - 1;

            return (
              <div
                key={k.keyValue}
                className={!isLast ? "border-b border-gray-100 dark:border-gray-800/60" : ""}
              >
                <div
                  onClick={() => hasLongContent && toggleKey(k.keyValue)}
                  className={`grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr_28px] items-start px-3 py-2 ${
                    hasLongContent
                      ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40"
                      : ""
                  }`}
                >
                  <span className="truncate text-sm text-gray-900 dark:text-gray-100">
                    {k.label}
                  </span>
                  <span className="font-mono text-[11px] text-gray-500 dark:text-gray-500">
                    {k.type}
                  </span>
                  <span className="truncate text-[11px] text-gray-500 dark:text-gray-500">
                    {k.process_prompt?.DocClass || "—"}
                  </span>
                  <span
                    className={`pr-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 ${
                      isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                    }`}
                  >
                    {fieldDesc || (
                      <span className="text-gray-300 dark:text-gray-700">—</span>
                    )}
                  </span>
                  <span
                    className={`pr-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 ${
                      isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                    }`}
                  >
                    {rulesDesc || (
                      <span className="text-gray-300 dark:text-gray-700">—</span>
                    )}
                  </span>
                  <div className="flex items-start gap-1 pt-0.5">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${COMPLETENESS_STYLES[completeness]}`}
                      title={completeness}
                    >
                      {COMPLETENESS_LABEL[completeness]}
                    </span>
                    {hasLongContent && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-600">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Documents */}
      <h3 className="mb-2.5 text-xs font-medium text-gray-500 dark:text-gray-500">
        Documents
      </h3>
      <div className="flex flex-wrap gap-2">
        {(process.documents ?? []).map((d) => (
          <div
            key={d.doc_type}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {d.doc_type}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500">
              {d.category}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}