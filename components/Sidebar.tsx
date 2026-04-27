"use client";

import type { VersionMeta } from "@/types/process";

interface SidebarProps {
  versions: VersionMeta[];
  selectedIds: string[];
  loadingId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
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

interface ProcessGroup {
  processId: string;
  processName: string;
  versions: VersionMeta[];
}

function groupVersions(versions: VersionMeta[]): ProcessGroup[] {
  const map = new Map<string, ProcessGroup>();
  for (const v of versions) {
    if (!map.has(v.processId)) {
      map.set(v.processId, {
        processId: v.processId,
        processName: v.processName,
        versions: [],
      });
    }
    map.get(v.processId)!.versions.push(v);
  }
  return Array.from(map.values());
}

export function Sidebar({
  versions,
  selectedIds,
  loadingId,
  onSelect,
  onDelete,
  onUploadClick,
}: SidebarProps) {
  const groups = groupVersions(versions);

  const hint =
    selectedIds.length === 0
      ? "Click to inspect · select 2 to compare"
      : selectedIds.length === 1
        ? "Select one more to compare"
        : "Comparing A → B";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Versions
        </span>
        <button
          onClick={onUploadClick}
          className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          + Upload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs leading-relaxed text-gray-400 dark:text-gray-600">
            No versions yet.
            <br />
            Upload a process JSON to get started.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.processId}>
              {/* Group header */}
              <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-800 dark:bg-gray-800/80">
                <p className="truncate text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {group.processName}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-600">
                  {group.processId} · {group.versions.length} version
                  {group.versions.length !== 1 ? "s" : ""}
                </p>
              </div>

              {group.versions.map((v) => {
                const isSel    = selectedIds.includes(v.id);
                const idx      = selectedIds.indexOf(v.id);
                const isLoading = loadingId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => !isLoading && onSelect(v.id)}
                    className={`cursor-pointer border-b border-gray-200 px-4 py-3 transition-colors dark:border-gray-800 ${
                      isSel
                        ? "border-l-2 border-l-blue-500 bg-white dark:bg-gray-800"
                        : "border-l-2 border-l-transparent hover:bg-white dark:hover:bg-gray-800/50"
                    } ${isLoading ? "opacity-60" : ""}`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {isSel && (
                          <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                            {idx === 0 ? "A" : "B"}
                          </span>
                        )}
                        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                          v{v.versionNumber}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {isLoading ? "Loading…" : v.label}
                        </span>
                      </div>

                      {/* Download + Delete */}
                      <div className="flex shrink-0 items-center gap-1">
                        <a
                          href={`/api/versions/${v.id}`}
                          download={`${v.processId}-v${v.versionNumber}.json`}
                          onClick={(e) => e.stopPropagation()}
                          title="Download JSON"
                          className="text-sm text-gray-300 transition-colors hover:text-blue-500 dark:text-gray-700 dark:hover:text-blue-400"
                        >
                          ↓
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(v.id); }}
                          title="Delete version"
                          className="text-base leading-none text-gray-300 transition-colors hover:text-rose-500 dark:text-gray-700 dark:hover:text-rose-400"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <p className="mb-2 text-[11px] text-gray-400 dark:text-gray-600">
                      {formatDate(v.timestamp)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 dark:text-gray-600">
                        {v.keyCount}k · {v.docCount}d
                      </span>
                    </div>
                    {v.note && (
                      <p className="mt-1.5 text-[11px] italic text-gray-500">
                        {v.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {versions.length > 0 && (
        <p className="border-t border-gray-200 px-4 py-2 text-center text-[11px] text-gray-400 dark:border-gray-800 dark:text-gray-600">
          {hint}
        </p>
      )}
    </aside>
  );
}