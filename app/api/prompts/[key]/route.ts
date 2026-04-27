import { list, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { buildPromptBlobPath, PROMPTS_INDEX_PATH } from "@/lib/prompts";
import type { PromptIndexEntry } from "@/types/prompt";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const blobPath = buildPromptBlobPath(decodeURIComponent(key));

    const { blobs } = await list({ prefix: blobPath });
    if (!blobs.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // downloadUrl bypasses CDN cache — needed since entry blobs are overwritten on each new version
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Failed", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    const blobPath = buildPromptBlobPath(decodedKey);

    // Delete the entry blob
    const { blobs } = await list({ prefix: blobPath });
    if (blobs.length) await del(blobs.map((b) => b.url));

    // Remove from index
    let index: PromptIndexEntry[] = [];
    try {
      const { blobs: idxBlobs } = await list({ prefix: "pvcp/prompts-index" });
      if (idxBlobs.length) {
        const res = await fetch(idxBlobs[0].url);
        if (res.ok) index = await res.json();
      }
    } catch { /* empty */ }

    // The key format is "keyValue__processId"
    const [keyValue, processId] = decodedKey.split("__");
    const updatedIndex = index.filter(
      (i) => !(i.keyValue === keyValue && i.processId === processId)
    );

    const { put } = await import("@vercel/blob");
    await put(PROMPTS_INDEX_PATH, JSON.stringify(updatedIndex), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Delete failed", detail: String(err) },
      { status: 500 }
    );
  }
}