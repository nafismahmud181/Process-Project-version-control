import { NextResponse } from "next/server";
import { putObject, getObject, listKeys, deleteObjects } from "@/lib/r2";
import type { PromptEntry, PromptIndexEntry, PromptVersion } from "@/types/prompt";
import type { ProcessKey, Process, VersionMeta } from "@/types/process";
import { buildEntryId, buildPromptBlobPath, PROMPTS_INDEX_PATH } from "@/lib/prompts";

// ─── GET /api/prompts ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const index = await getObject<PromptIndexEntry[]>(PROMPTS_INDEX_PATH);
    return NextResponse.json(index ?? []);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch index", detail: String(err) },
      { status: 500 }
    );
  }
}

// ─── POST /api/prompts ────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { keys, process, versionMeta } = (await request.json()) as {
      keys: ProcessKey[];
      process: Process;
      versionMeta: VersionMeta;
    };

    const processId   = process.process_id ?? "—";
    const processName = process.name ?? process.free_name ?? "—";
    const project     = process.project ?? "—";

    // Load current index
    const index: PromptIndexEntry[] = (await getObject<PromptIndexEntry[]>(PROMPTS_INDEX_PATH)) ?? [];

    // Process all keys in parallel
    const results = await Promise.allSettled(
      keys.map(async (k) => {
        const entryId  = buildEntryId(k.keyValue, processId);
        const blobPath = buildPromptBlobPath(entryId);
        const pp       = k.process_prompt as import("@/types/process").ProcessPrompt | undefined;
        const fieldDesc      = pp?.Field_Description?.trim() ?? "";
        const rulesDesc      = pp?.Rules_Description?.trim() ?? "";
        const extractionType = pp?.Extraction_Type ?? "";
        const docClass       = pp?.DocClass ?? "";

        // Load existing entry
        const entry = await getObject<PromptEntry>(blobPath);

        const isIdentical = entry !== null && (() => {
          const latest = entry!.versions[entry!.versions.length - 1];
          return (
            latest.field_description === fieldDesc &&
            latest.rules_description === rulesDesc &&
            latest.extraction_type   === extractionType &&
            latest.doc_class         === docClass
          );
        })();

        let finalEntry: PromptEntry;

        if (isIdentical && entry) {
          finalEntry = entry;
        } else {
          const newVersion: PromptVersion = {
            versionNumber: entry ? entry.versions.length + 1 : 1,
            field_description: fieldDesc,
            rules_description: rulesDesc,
            extraction_type: extractionType,
            doc_class: docClass,
            sourceVersionLabel: versionMeta.label,
            timestamp: new Date().toISOString(),
          };

          finalEntry = entry
            ? { ...entry, versions: [...entry.versions, newVersion], updatedAt: new Date().toISOString() }
            : {
                keyValue: k.keyValue,
                label: k.label,
                keyType: k.type,
                processName,
                processId,
                project,
                versions: [newVersion],
                updatedAt: new Date().toISOString(),
              };

          await putObject(blobPath, JSON.stringify(finalEntry));
        }

        return finalEntry;
      })
    );

    // Update index
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const e = result.value;

      const idxEntry: PromptIndexEntry = {
        keyValue:        e.keyValue,
        label:           e.label,
        keyType:         e.keyType,
        processName:     e.processName,
        processId:       e.processId,
        project:         e.project ?? "—",
        versionCount:    e.versions.length,
        hasChanges:      e.versions.length > 1,
        updatedAt:       e.updatedAt,
        latestFieldDesc: e.versions[e.versions.length - 1]?.field_description ?? "",
      };

      const existingIdx = index.findIndex(
        (i) => i.keyValue === e.keyValue && i.processId === processId
      );
      if (existingIdx >= 0) index[existingIdx] = idxEntry;
      else index.push(idxEntry);
    }

    await putObject(PROMPTS_INDEX_PATH, JSON.stringify(index));

    const synced = results.filter((r) => r.status === "fulfilled" && r.value).length;
    return NextResponse.json({ synced });
  } catch (err) {
    return NextResponse.json(
      { error: "Sync failed", detail: String(err) },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/prompts ──────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const { processId, sourceVersionLabel } = (await request.json()) as {
      processId: string;
      sourceVersionLabel: string;
    };

    const index: PromptIndexEntry[] = (await getObject<PromptIndexEntry[]>(PROMPTS_INDEX_PATH)) ?? [];
    const updatedIndex: PromptIndexEntry[] = [];
    const keysToDelete: string[] = [];

    for (const idxEntry of index) {
      if (idxEntry.processId !== processId) {
        updatedIndex.push(idxEntry);
        continue;
      }

      const entryId  = buildEntryId(idxEntry.keyValue, processId);
      const blobPath = buildPromptBlobPath(entryId);
      const entry    = await getObject<PromptEntry>(blobPath);

      if (!entry) continue;

      const remaining = entry.versions.filter(
        (v) => v.sourceVersionLabel !== sourceVersionLabel
      );

      if (remaining.length === 0) {
        keysToDelete.push(blobPath);
      } else {
        const renumbered = remaining.map((v, i) => ({ ...v, versionNumber: i + 1 }));
        const updatedEntry: PromptEntry = {
          ...entry,
          versions: renumbered,
          updatedAt: new Date().toISOString(),
        };
        await putObject(blobPath, JSON.stringify(updatedEntry));
        updatedIndex.push({
          ...idxEntry,
          versionCount: renumbered.length,
          hasChanges:   renumbered.length > 1,
          updatedAt:    updatedEntry.updatedAt,
        });
      }
    }

    if (keysToDelete.length) await deleteObjects(keysToDelete);
    await putObject(PROMPTS_INDEX_PATH, JSON.stringify(updatedIndex));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Delete failed", detail: String(err) },
      { status: 500 }
    );
  }
}
