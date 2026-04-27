import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { PromptEntry, PromptIndexEntry, PromptVersion } from "@/types/prompt";
import type { ProcessKey, Process, VersionMeta } from "@/types/process";
import {
  buildEntryId,
  buildPromptBlobPath,
  PROMPTS_INDEX_PATH,
} from "@/lib/prompts";

// ─── GET /api/prompts ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const { blobs } = await list({ prefix: "pvcp/prompts-index" });
    if (!blobs.length) return NextResponse.json([]);

    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) return NextResponse.json([]);

    const index: PromptIndexEntry[] = await res.json();
    return NextResponse.json(index);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch index", detail: String(err) },
      { status: 500 }
    );
  }
}

// ─── POST /api/prompts ────────────────────────────────────────────────────────
// Receives keys + process + versionMeta, upserts each prompt entry
export async function POST(request: Request) {
  try {
    const { keys, process, versionMeta } = (await request.json()) as {
      keys: ProcessKey[];
      process: Process;
      versionMeta: VersionMeta;
    };

    const processId   = process.process_id ?? "—";
    const processName = process.name ?? process.free_name ?? "—";

    // Load current index
    let index: PromptIndexEntry[] = [];
    try {
      const { blobs } = await list({ prefix: "pvcp/prompts-index" });
      if (blobs.length) {
        const res = await fetch(blobs[0].downloadUrl);
        if (res.ok) index = await res.json();
      }
    } catch { /* start with empty index */ }

    // Process each key
    for (const k of keys) {
      const entryId    = buildEntryId(k.keyValue, processId);
      const blobPath   = buildPromptBlobPath(entryId);
      const pp = k.process_prompt as import("@/types/process").ProcessPrompt | undefined;
      const fieldDesc  = pp?.Field_Description?.trim() ?? "";
      const rulesDesc  = pp?.Rules_Description?.trim() ?? "";
      const extractionType = pp?.Extraction_Type ?? "";
      const docClass   = pp?.DocClass ?? "";

      // Load existing entry if any
      let entry: PromptEntry | null = null;
      try {
        const { blobs } = await list({ prefix: blobPath });
        if (blobs.length) {
          const res = await fetch(blobs[0].downloadUrl);
          if (res.ok) entry = await res.json();
        }
      } catch { /* new entry */ }

      const newVersion: PromptVersion = {
        versionNumber: entry ? entry.versions.length + 1 : 1,
        field_description: fieldDesc,
        rules_description: rulesDesc,
        extraction_type: extractionType,
        doc_class: docClass,
        sourceVersionLabel: versionMeta.label,
        timestamp: new Date().toISOString(),
      };

      // Skip if content is identical to the latest version
      if (entry) {
        const latest = entry.versions[entry.versions.length - 1];
        if (
          latest.field_description === fieldDesc &&
          latest.rules_description === rulesDesc &&
          latest.extraction_type   === extractionType &&
          latest.doc_class         === docClass
        ) continue;
      }

      const updatedEntry: PromptEntry = entry
        ? { ...entry, versions: [...entry.versions, newVersion], updatedAt: new Date().toISOString() }
        : {
            keyValue: k.keyValue,
            label: k.label,
            keyType: k.type,
            processName,
            processId,
            versions: [newVersion],
            updatedAt: new Date().toISOString(),
          };

      // Save the entry blob
      await put(blobPath, JSON.stringify(updatedEntry), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });

      // Update index
      const idxEntry: PromptIndexEntry = {
        keyValue: updatedEntry.keyValue,
        label: updatedEntry.label,
        keyType: updatedEntry.keyType,
        processName: updatedEntry.processName,
        processId: updatedEntry.processId,
        versionCount: updatedEntry.versions.length,
        hasChanges: updatedEntry.versions.length > 1,
        updatedAt: updatedEntry.updatedAt,
      };

      const existingIdx = index.findIndex((i) => i.keyValue === k.keyValue && i.processId === processId);
      if (existingIdx >= 0) {
        index[existingIdx] = idxEntry;
      } else {
        index.push(idxEntry);
      }
    }

    // Save updated index
    await put(PROMPTS_INDEX_PATH, JSON.stringify(index), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json({ synced: keys.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Sync failed", detail: String(err) },
      { status: 500 }
    );
  }
}