import { NextResponse } from "next/server";
import { getObjectText, listKeys, deleteObjects } from "@/lib/r2";

const META_PREFIX = "pvcp/meta/";
const DATA_PREFIX = "pvcp/data/";

// GET /api/versions/[id] — proxy fetch of data blob
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const text = await getObjectText(`${DATA_PREFIX}${id}.json`);

    if (!text) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const parsed = JSON.parse(text);
    // Unwrap array if needed
    const data = Array.isArray(parsed) ? parsed[0] : parsed;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "GET failed", detail: message }, { status: 500 });
  }
}

// DELETE /api/versions/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteObjects([
      `${META_PREFIX}${id}.json`,
      `${DATA_PREFIX}${id}.json`,
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Delete failed", detail: message }, { status: 500 });
  }
}
