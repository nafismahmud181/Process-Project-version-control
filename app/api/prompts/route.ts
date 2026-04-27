import { put, list, del } from "@vercel/blob";
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

    // downloadUrl bypasses CDN cache — critical for a frequently-overwritten index blob
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

    // Load current index — use downloadUrl to bypass CDN cache (index is frequently overwritten)
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

      // Load existing entry — use downloadUrl to bypass CDN cache (entry blob is overwritten on each version)
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

// ─── DELETE /api/prompts ──────────────────────────────────────────────────────
// Receives { processId, sourceVersionLabel } and removes matching prompt versions.
// If an entry has no versions left after removal, the whole entry is deleted.
export async function DELETE(request: Request) {
  try {
    const { processId, sourceVersionLabel } = (await request.json()) as {
      processId: string;
      sourceVersionLabel: string;
    };

    // Load index
    let index: PromptIndexEntry[] = [];
    try {
      const { blobs } = await list({ prefix: "pvcp/prompts-index" });
      if (blobs.length) {
        const res = await fetch(blobs[0].downloadUrl);
        if (res.ok) index = await res.json();
      }
    } catch { /* empty index */ }

    // Only process entries belonging to this processId
    const affected = index.filter((i) => i.processId === processId);
    const blobsToDelete: string[] = [];
    const updatedIndex: PromptIndexEntry[] = [];

    for (const idxEntry of index) {
      if (idxEntry.processId !== processId) {
        updatedIndex.push(idxEntry);
        continue;
      }

      // Load the full entry — downloadUrl bypasses CDN cache
      const entryId  = buildEntryId(idxEntry.keyValue, processId);
      const blobPath = buildPromptBlobPath(entryId);

      let entry: PromptEntry | null = null;
      try {
        const { blobs } = await list({ prefix: blobPath });
        if (blobs.length) {
          const res = await fetch(blobs[0].downloadUrl);
          if (res.ok) entry = await res.json();
          blobsToDelete.push(...blobs.map((b) => b.url));
        }
      } catch { continue; }

      if (!entry) continue;

      // Remove versions that came from this process version
      const remaining = entry.versions.filter(
        (v) => v.sourceVersionLabel !== sourceVersionLabel
      );

      if (remaining.length === 0) {
        // Delete entire entry blob — already tracked in blobsToDelete
        // Don't add to updatedIndex → removes from index too
      } else {
        // Re-number versions and save updated entry
        const renumbered = remaining.map((v, i) => ({
          ...v,
          versionNumber: i + 1,
        }));

        const updatedEntry: PromptEntry = {
          ...entry,
          versions: renumbered,
          updatedAt: new Date().toISOString(),
        };

        await put(blobPath, JSON.stringify(updatedEntry), {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
        });

        updatedIndex.push({
          ...idxEntry,
          versionCount: renumbered.length,
          hasChanges: renumbered.length > 1,
          updatedAt: updatedEntry.updatedAt,
        });
      }
    }

    // Delete blobs for fully-removed entries
    if (blobsToDelete.length > 0) {
      // Only delete blobs for entries NOT being updated (those with remaining === 0)
      const keptPaths = new Set(
        updatedIndex
          .filter((i) => i.processId === processId)
          .map((i) => buildPromptBlobPath(buildEntryId(i.keyValue, processId)))
      );
      const toDelete = blobsToDelete.filter((url) =>
        !Array.from(keptPaths).some((p) => url.includes(p.split("/").pop()!))
      );
      if (toDelete.length) await del(toDelete);
    }

    // Save updated index
    await put(PROMPTS_INDEX_PATH, JSON.stringify(updatedIndex), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    const removed = affected.length - updatedIndex.filter((i) => i.processId === processId).length;
    return NextResponse.json({ removed, updated: updatedIndex.filter((i) => i.processId === processId).length });
  } catch (err) {
    return NextResponse.json(
      { error: "Delete failed", detail: String(err) },
      { status: 500 }
    );
  }
}