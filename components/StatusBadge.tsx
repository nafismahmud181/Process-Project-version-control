import type { DiffStatus } from "@/lib/diff";

const variants: Record<DiffStatus, string> = {
  added:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  removed:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
  modified:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  unchanged:
    "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

export function StatusBadge({ status }: { status: DiffStatus }) {
  return (
    <span
      className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${variants[status]}`}
    >
      {status}
    </span>
  );
}
