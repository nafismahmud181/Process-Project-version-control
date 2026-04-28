import { NextResponse } from "next/server";
import { putObject, putFile, getObject, listKeys } from "@/lib/r2";
import type { VersionMeta, Process } from "@/types/process";

const META_PREFIX = "pvcp/meta/";
const DATA_PREFIX = "pvcp/data/";

// ─── GET /api/versions ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const keys = await listKeys(META_PREFIX);
    if (!keys.length) return NextResponse.json([]);

    const results = await Promise.allSettled(
      keys.map((key) => getObject<VersionMeta>(key))
    );

    const metas = results
      .filter((r): r is PromiseFulfilledResult<VersionMeta> =>
        r.status === "fulfilled" && r.value !== null
      )
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

// ─── POST /api/versions ───────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file    = formData.get("file") as File | null;
    const metaStr = formData.get("meta") as string | null;

    if (!file)    return NextResponse.json({ error: "Missing field: file" }, { status: 400 });
    if (!metaStr) return NextResponse.json({ error: "Missing field: meta" }, { status: 400 });

    const meta = JSON.parse(metaStr) as Omit<VersionMeta, "blobUrl">;

    // Upload data blob
    await putFile(`${DATA_PREFIX}${meta.id}.json`, file);

    // blobUrl is kept for interface compatibility but R2 reads go through the proxy
    const fullMeta: VersionMeta = { ...meta, blobUrl: `r2://${meta.id}` };

    // Upload meta blob
    await putObject(`${META_PREFIX}${meta.id}.json`, JSON.stringify(fullMeta));

    // Sync prompts in the background
    try {
      const fileText = await file.text();
      const parsed   = JSON.parse(fileText);
      const proc     = Array.isArray(parsed) ? parsed[0] : parsed;

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

      fetch(`${baseUrl}/api/prompts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ keys: proc.keys ?? [], process: proc, versionMeta: fullMeta }),
      }).catch((e: unknown) => console.error("[versions/route] prompt sync failed:", e));
    } catch { /* prompt sync is non-critical */ }

    return NextResponse.json(fullMeta);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "POST failed", detail: message }, { status: 500 });
  }
}
