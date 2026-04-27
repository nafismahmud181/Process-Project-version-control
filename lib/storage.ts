import type { VersionMeta, Process } from "@/types/process";

// List all version metadata
export async function fetchVersionIndex(): Promise<VersionMeta[]> {
  try {
    const res = await fetch("/api/versions");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Upload a new version
export async function uploadVersion(
  file: File,
  meta: Omit<VersionMeta, "blobUrl">
): Promise<VersionMeta> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("meta", JSON.stringify(meta));

  const res = await fetch("/api/versions", { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Upload failed");
  }
  return await res.json();
}

// Fetch version data via the server-side proxy (works with private blobs)
export async function fetchVersionData(id: string): Promise<Process> {
  const res = await fetch(`/api/versions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch version data");
  return await res.json();
}

// Delete a version
export async function removeVersion(id: string): Promise<void> {
  await fetch(`/api/versions/${id}`, { method: "DELETE" });
}