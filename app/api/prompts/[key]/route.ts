import { NextResponse } from "next/server";
import { getObject, putObject, deleteObjects, listKeys } from "@/lib/r2";
import { buildPromptBlobPath, PROMPTS_INDEX_PATH } from "@/lib/prompts";
import type { PromptEntry, PromptIndexEntry } from "@/types/prompt";

// GET /api/prompts/[key]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const blobPath = buildPromptBlobPath(decodeURIComponent(key));
    const entry    = await getObject<PromptEntry>(blobPath);

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed", detail: String(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/prompts/[key]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key }    = await params;
    const decodedKey = decodeURIComponent(key);
    const blobPath   = buildPromptBlobPath(decodedKey);

    // Delete the entry blob
    await deleteObjects([blobPath]);

    // Remove from index
    const index: PromptIndexEntry[] = (await getObject<PromptIndexEntry[]>(PROMPTS_INDEX_PATH)) ?? [];
    const [keyValue, processId] = decodedKey.split("__");
    const updatedIndex = index.filter(
      (i) => !(i.keyValue === keyValue && i.processId === processId)
    );

    await putObject(PROMPTS_INDEX_PATH, JSON.stringify(updatedIndex));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Delete failed", detail: String(err) },
      { status: 500 }
    );
  }
}
