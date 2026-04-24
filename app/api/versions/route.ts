import { put, list, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { VersionMeta } from "@/types/process";

const META_PREFIX = "pvcp/meta/";
const DATA_PREFIX = "pvcp/data/";

// GET /api/versions — list all versions by fetching all meta blobs
export async function GET() {
  try {
    const { blobs } = await list({ prefix: META_PREFIX });

    const metas = await Promise.all(
      blobs.map(async (blob) => {
        const res = await fetch(blob.downloadUrl);
        return (await res.json()) as VersionMeta;
      })
    );

    // Sort newest first
    metas.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(metas);
  } catch (err) {
    console.error("GET /api/versions error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/versions — upload a new version
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const metaStr = formData.get("meta") as string | null;

    if (!file || !metaStr) {
      return NextResponse.json({ error: "Missing file or meta" }, { status: 400 });
    }

    const meta = JSON.parse(metaStr) as Omit<VersionMeta, "blobUrl">;

    // Upload the full process JSON
    const dataBlob = await put(`${DATA_PREFIX}${meta.id}.json`, file, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    const fullMeta: VersionMeta = { ...meta, blobUrl: dataBlob.url };

    // Upload the small metadata blob
    await put(
      `${META_PREFIX}${meta.id}.json`,
      JSON.stringify(fullMeta),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      }
    );

    return NextResponse.json(fullMeta);
  } catch (err) {
    console.error("POST /api/versions error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}