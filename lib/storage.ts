import type { VersionMeta, Process } from "@/types/process";

// List all version metadata by calling the API
export async function fetchVersionIndex(): Promise<VersionMeta[]> {
  try {
    const res = await fetch("/api/versions");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Upload a new version — sends file + metadata to the API
export async function uploadVersion(
  file: File,
  meta: Omit<VersionMeta, "blobUrl">
): Promise<VersionMeta> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("meta", JSON.stringify(meta));

  const res = await fetch("/api/versions", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Upload failed");
  }

  return await res.json();
}

// Fetch the full process data directly from the Blob URL
export async function fetchVersionData(blobUrl: string): Promise<Process> {
  const res = await fetch(blobUrl);
  if (!res.ok) throw new Error("Failed to fetch version data");
  return await res.json();
}

// Delete a version via the API
export async function removeVersion(id: string): Promise<void> {
  await fetch(`/api/versions/${id}`, { method: "DELETE" });
}