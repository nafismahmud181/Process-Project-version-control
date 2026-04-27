import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { buildPromptBlobPath } from "@/lib/prompts";

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