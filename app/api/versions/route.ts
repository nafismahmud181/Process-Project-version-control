import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { VersionMeta } from "@/types/process";

const META_PREFIX = "pvcp/meta/";
const DATA_PREFIX = "pvcp/data/";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: META_PREFIX });

    const metas = await Promise.all(
      blobs.map(async (blob) => {
        const res = await fetch(blob.downloadUrl);
        return (await res.json()) as VersionMeta;
      })
    );

    metas.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(metas);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/versions error:", message);
    return NextResponse.json(
      { error: "GET failed", detail: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Check token is present
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Missing BLOB_READ_WRITE_TOKEN environment variable" },
        { status: 500 }
      );
    }

    // 2. Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse formData", detail: String(e) },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    const metaStr = formData.get("meta") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing field: file" }, { status: 400 });
    }
    if (!metaStr) {
      return NextResponse.json({ error: "Missing field: meta" }, { status: 400 });
    }

    // 3. Parse meta JSON
    let meta: Omit<VersionMeta, "blobUrl">;
    try {
      meta = JSON.parse(metaStr);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid meta JSON", detail: String(e) },
        { status: 400 }
      );
    }

    // 4. Upload data blob
    let dataBlob;
    try {
      dataBlob = await put(`${DATA_PREFIX}${meta.id}.json`, file, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to upload data blob", detail: String(e) },
        { status: 500 }
      );
    }

    const fullMeta: VersionMeta = { ...meta, blobUrl: dataBlob.url };

    // 5. Upload meta blob
    try {
      await put(
        `${META_PREFIX}${meta.id}.json`,
        JSON.stringify(fullMeta),
        {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
        }
      );
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to upload meta blob", detail: String(e) },
        { status: 500 }
      );
    }

    return NextResponse.json(fullMeta);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/versions error:", message);
    return NextResponse.json(
      { error: "Unexpected error", detail: message },
      { status: 500 }
    );
  }
}