import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

// ─── Client ───────────────────────────────────────────────────────────────────

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME ?? "process-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Upload a string or Buffer as a JSON object */
export async function putObject(key: string, body: string): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        body,
      ContentType: "application/json",
    })
  );
}

/** Upload a File/Blob object */
export async function putFile(key: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  await r2.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: file.type || "application/json",
    })
  );
}

/** Download and parse a JSON object — always fresh, no CDN caching */
export async function getObject<T>(key: string): Promise<T | null> {
  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    const text = await res.Body?.transformToString();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err: unknown) {
    // NoSuchKey = object doesn't exist
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

/** Download an object as raw text */
export async function getObjectText(key: string): Promise<string | null> {
  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return (await res.Body?.transformToString()) ?? null;
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

/** List all object keys with a given prefix */
export async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res: ListObjectsV2CommandOutput = await r2.send(
      new ListObjectsV2Command({
        Bucket:            BUCKET,
        Prefix:            prefix,
        ContinuationToken: continuationToken,
      })
    );
    res.Contents?.forEach((obj) => obj.Key && keys.push(obj.Key));
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

/** Delete one or more objects by key */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  await r2.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}

/** Check if an object exists */
export async function objectExists(key: string): Promise<boolean> {
  const keys = await listKeys(key);
  return keys.includes(key);
}
