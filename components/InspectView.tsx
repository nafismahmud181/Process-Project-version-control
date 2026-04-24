"use client";

import { useState } from "react";
import type { Process, VersionMeta } from "@/types/process";

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

export function InspectView({ process, meta }: InspectViewProps) {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleKey = (keyValue: string) =>
    setExpandedKeys((prev) => ({ ...prev, [keyValue]: !prev[keyValue] }));

  const stats = [
    { label: "Process ID", value: process.process_id },
    { label: "Country", value: process.country },
    { label: "Keys", value: process.keys?.length ?? 0 },
    { label: "Documents", value: process.documents?.length ?? 0 },
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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-500">{label}</p>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Keys table */}
      <h3 className="mb-2.5 text-xs font-medium text-gray-500 dark:text-gray-500">
        Extraction keys{" "}
        <span className="font-normal text-gray-400 dark:text-gray-600">
          — click a row to expand long content
        </span>
      </h3>
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        {/* Table header */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr_16px] border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
          {["Label", "Type", "Doc class", "Field description", "Rules description", ""].map((h) => (
            <span key={h} className="text-[11px] font-medium text-gray-500 dark:text-gray-500">
              {h}
            </span>
          ))}
        </div>

        {(process.keys ?? []).map((k, i) => {
          const isExpanded = expandedKeys[k.keyValue];
          const fieldDesc = k.process_prompt?.Field_Description || "";
          const rulesDesc = k.process_prompt?.Rules_Description || "";
          const hasLongContent = fieldDesc.length > 80 || rulesDesc.length > 80;
          const isLast = i === (process.keys.length - 1);

          return (
            <div
              key={k.keyValue}
              className={!isLast || isExpanded ? "border-b border-gray-100 dark:border-gray-800/60" : ""}
            >
              {/* Main row */}
              <div
                onClick={() => hasLongContent && toggleKey(k.keyValue)}
                className={`grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr_16px] items-start px-3 py-2 ${
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
                <span className={`pr-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                  {fieldDesc || <span className="text-gray-300 dark:text-gray-700">—</span>}
                </span>
                <span className={`pr-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                  {rulesDesc || <span className="text-gray-300 dark:text-gray-700">—</span>}
                </span>
                <span className="pt-0.5 text-[11px] text-gray-400 dark:text-gray-600">
                  {hasLongContent ? (isExpanded ? "▲" : "▼") : ""}
                </span>
              </div>
            </div>
          );
        })}
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