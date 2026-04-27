import type { PromptEntry, PromptIndexEntry } from "@/types/prompt";
import type { Process, VersionMeta } from "@/types/process";

// ─── Client-side API calls ────────────────────────────────────────────────────

export async function fetchPromptIndex(): Promise<PromptIndexEntry[]> {
  try {
    const res = await fetch("/api/prompts");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchPromptEntry(keyValue: string, processId: string): Promise<PromptEntry | null> {
  try {
    const res = await fetch(`/api/prompts/${encodeURIComponent(keyValue + "__" + processId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function syncPromptsFromUpload(
  process: Process,
  versionMeta: VersionMeta
): Promise<void> {
  const keys = (process.keys ?? []).filter(
    (k) =>
      k.process_prompt?.Field_Description?.trim() ||
      k.process_prompt?.Rules_Description?.trim()
  );

  if (!keys.length) return;

  await fetch("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys, process, versionMeta }),
  });
}

export async function deletePromptsForVersion(
  processId: string,
  sourceVersionLabel: string
): Promise<void> {
  await fetch("/api/prompts", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ processId, sourceVersionLabel }),
  });
}

// ─── Server-side helpers (used in API routes) ─────────────────────────────────

export function buildEntryId(keyValue: string, processId: string): string {
  return `${keyValue}__${processId}`;
}

export function buildPromptBlobPath(entryId: string): string {
  return `pvcp/prompts/${entryId}.json`;
}

export const PROMPTS_INDEX_PATH = "pvcp/prompts-index.json";