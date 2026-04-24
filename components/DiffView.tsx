"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { filterByStatus, type DiffItem, type DiffStatus } from "@/lib/diff";
import type { ProcessKey, ProcessDocument, VersionMeta } from "@/types/process";

type ActiveSection = "keys" | "docs";
type FilterOption = "all" | DiffStatus;

interface DiffViewProps {
  fromMeta: VersionMeta;
  toMeta: VersionMeta;
  keysDiff: DiffItem<ProcessKey>[];
  docsDiff: DiffItem<ProcessDocument>[];
}

const FILTERS: FilterOption[] = ["all", "added", "removed", "modified"];

export function DiffView({ fromMeta, toMeta, keysDiff, docsDiff }: DiffViewProps) {
  const [section, setSection] = useState<ActiveSection>("keys");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const summaryBadges: DiffStatus[] = ["added", "removed", "modified"];

  const filteredKeys = filterByStatus(keysDiff, filter);
  const filteredDocs = filterByStatus(docsDiff, filter);
  const items = section === "keys" ? filteredKeys : filteredDocs;

  const countChanged = (diff: DiffItem<unknown>[], s: DiffStatus) =>
    diff.filter((i) => i.status === s).length;

  const tabCount = (s: ActiveSection) => {
    const diff = s === "keys" ? keysDiff : docsDiff;
    return diff.filter((i) => i.status !== "unchanged").length;
  };

  const borderColor: Record<DiffStatus, string> = {
    added: "border-l-emerald-500",
    removed: "border-l-rose-500",
    modified: "border-l-amber-500",
    unchanged: "border-l-gray-200",
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-600">
            Comparing
          </p>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              A: {fromMeta.label}
            </span>
            <span className="text-gray-400">→</span>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              B: {toMeta.label}
            </span>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-2">
          {summaryBadges.map((s) => {
            const n =
              countChanged(keysDiff, s) + countChanged(docsDiff, s);
            return n > 0 ? (
              <StatusBadge key={s} status={s} />
            ) : null;
          })}
        </div>
      </div>

      {/* Tabs + filter */}
      <div className="mb-4 flex items-center border-b border-gray-200 dark:border-gray-800">
        {(["keys", "docs"] as ActiveSection[]).map((s) => {
          const n = tabCount(s);
          return (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors ${
                section === s
                  ? "border-blue-500 font-medium text-gray-900 dark:text-gray-100"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              }`}
            >
              {s === "keys" ? "Keys" : "Documents"}
              {n > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {n}
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto flex gap-1 pb-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                filter === f
                  ? "bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Diff items */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-600">
          No {filter !== "all" ? filter : "changed"}{" "}
          {section === "keys" ? "keys" : "documents"}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const eKey = `${section}_${item.key}`;
            const isExp = expanded[eKey];
            const isKey = section === "keys";
            const name = isKey
              ? (item.item as ProcessKey).label
              : (item.item as ProcessDocument).doc_type;
            const sub = isKey
              ? `${(item.item as ProcessKey).keyValue} · ${(item.item as ProcessKey).type}`
              : (item.item as ProcessDocument).category;

            return (
              <div
                key={eKey}
                className={`overflow-hidden rounded-lg border border-gray-200 border-l-2 dark:border-gray-800 ${borderColor[item.status]}`}
              >
                {/* Row */}
                <div
                  onClick={() =>
                    item.status === "modified" && toggleExpand(eKey)
                  }
                  className={`flex items-center gap-3 px-3 py-2.5 ${item.status === "modified" ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50" : ""}`}
                >
                  <StatusBadge status={item.status} />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {name}
                  </span>
                  <span className="font-mono text-[11px] text-gray-500 dark:text-gray-500">
                    {sub}
                  </span>
                  {item.status === "modified" && item.changes && (
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">
                      {item.changes.length} field
                      {item.changes.length !== 1 ? "s" : ""}{" "}
                      {isExp ? "▲" : "▼"}
                    </span>
                  )}
                </div>

                {/* Expanded changes */}
                {item.status === "modified" && isExp && item.changes && (
                  <div className="border-t border-gray-200 dark:border-gray-800">
                    {item.changes.map((ch, i) => (
                      <div
                        key={i}
                        className={`grid grid-cols-[160px_1fr_1fr] gap-2 bg-gray-50 px-3 py-2 dark:bg-gray-900 ${
                          i < item.changes!.length - 1
                            ? "border-b border-gray-200 dark:border-gray-800"
                            : ""
                        }`}
                      >
                        <span className="pt-0.5 font-mono text-[11px] text-gray-500 dark:text-gray-500">
                          {ch.field}
                        </span>
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 dark:border-rose-900 dark:bg-rose-950">
                          <span className="mb-0.5 block text-[10px] text-rose-400 dark:text-rose-600">
                            from
                          </span>
                          <span className="break-words text-xs text-rose-700 dark:text-rose-400">
                            {ch.from == null ? (
                              <em className="text-gray-400">null</em>
                            ) : (
                              String(ch.from)
                            )}
                          </span>
                        </div>
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 dark:border-emerald-900 dark:bg-emerald-950">
                          <span className="mb-0.5 block text-[10px] text-emerald-500 dark:text-emerald-600">
                            to
                          </span>
                          <span className="break-words text-xs text-emerald-700 dark:text-emerald-400">
                            {ch.to == null ? (
                              <em className="text-gray-400">null</em>
                            ) : (
                              String(ch.to)
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}