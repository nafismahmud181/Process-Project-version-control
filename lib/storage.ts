import type { VersionMeta, Process } from "@/types/process";

const INDEX_KEY = "pvcp_index";
const vKey = (id: string) => `pvcp_version_${id}`;

export function getVersionIndex(): VersionMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as VersionMeta[]) : [];
  } catch {
    return [];
  }
}

export function saveVersionIndex(versions: VersionMeta[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(versions));
}

export function getVersionData(id: string): Process | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(vKey(id));
    return raw ? (JSON.parse(raw) as Process) : null;
  } catch {
    return null;
  }
}

export function saveVersionData(id: string, process: Process): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(vKey(id), JSON.stringify(process));
}

export function deleteVersionData(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(vKey(id));
}
