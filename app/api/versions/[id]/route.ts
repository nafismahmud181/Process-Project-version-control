import { list, del } from "@vercel/blob";
import { NextResponse } from "next/server";

const META_PREFIX = "pvcp/meta/";
const DATA_PREFIX = "pvcp/data/";

// GET /api/versions/[id] — proxy fetch of private data blob
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { blobs } = await list({ prefix: `${DATA_PREFIX}${id}` });

    if (!blobs.length) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // downloadUrl is a short-lived signed URL — works server-side for private blobs
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch blob" }, { status: 502 });
    }

    const data = await res.json();
    // The stored file may be an array (e.g. [process]) — unwrap it
    const process = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(process);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "GET failed", detail: message }, { status: 500 });
  }
}

// DELETE /api/versions/[id] — remove data + meta blobs
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [metaResult, dataResult] = await Promise.all([
      list({ prefix: `${META_PREFIX}${id}` }),
      list({ prefix: `${DATA_PREFIX}${id}` }),
    ]);

    const urlsToDelete = [
      ...metaResult.blobs.map((b) => b.url),
      ...dataResult.blobs.map((b) => b.url),
    ];

    if (urlsToDelete.length > 0) await del(urlsToDelete);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Delete failed", detail: message }, { status: 500 });
  }
}