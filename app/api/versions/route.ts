import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { VersionMeta } from "@/types/process";

const META_PREFIX = "pvcp/meta/";
const DATA_PREFIX = "pvcp/data/";

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Missing BLOB_READ_WRITE_TOKEN" },
        { status: 500 }
      );
    }

    const { blobs } = await list({ prefix: META_PREFIX });

    if (!blobs.length) return NextResponse.json([]);

    // Use Promise.allSettled so one bad blob doesn't kill the whole list
    const results = await Promise.allSettled(
      blobs.map(async (blob) => {
        // blob.url is the permanent URL for public blobs
        // blob.downloadUrl is a signed URL that can expire — avoid it here
        const res = await fetch(blob.url);
        if (!res.ok) throw new Error(`${blob.url} → ${res.status}`);
        return (await res.json()) as VersionMeta;
      })
    );

    const metas = results
      .filter((r): r is PromiseFulfilledResult<VersionMeta> => r.status === "fulfilled")
      .map((r) => r.value);

    metas.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(metas);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/versions error:", message);
    return NextResponse.json({ error: "GET failed", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Missing BLOB_READ_WRITE_TOKEN" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file    = formData.get("file") as File | null;
    const metaStr = formData.get("meta") as string | null;

    if (!file)    return NextResponse.json({ error: "Missing field: file" }, { status: 400 });
    if (!metaStr) return NextResponse.json({ error: "Missing field: meta" }, { status: 400 });

    const meta = JSON.parse(metaStr) as Omit<VersionMeta, "blobUrl">;

    // Upload data blob — store-level privacy restricts direct access
    const dataBlob = await put(`${DATA_PREFIX}${meta.id}.json`, file, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    const fullMeta: VersionMeta = { ...meta, blobUrl: dataBlob.url };

    // Upload meta blob
    await put(`${META_PREFIX}${meta.id}.json`, JSON.stringify(fullMeta), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json(fullMeta);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "POST failed", detail: message }, { status: 500 });
  }
}