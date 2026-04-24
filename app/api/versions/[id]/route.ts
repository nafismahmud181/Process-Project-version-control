import { list, del } from "@vercel/blob";
import { NextResponse } from "next/server";

const META_PREFIX = "pvcp/meta/";
const DATA_PREFIX = "pvcp/data/";

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

    if (urlsToDelete.length > 0) {
      await del(urlsToDelete);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/versions/[id] error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}