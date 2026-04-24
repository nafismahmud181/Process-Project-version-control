import type { ProcessKey, ProcessDocument } from "@/types/process";

export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface DiffItem<T> {
  status: DiffStatus;
  key: string;
  item: T;
  old?: T;
  changes?: FieldChange[];
}

const KEY_FIELDS = ["label", "type", "required", "addToProcess"] as const;
const PROMPT_FIELDS = [
  "DocClass",
  "Field_Description",
  "Rules_Description",
  "Extraction_Type",
] as const;
const DOC_FIELDS = [
  "category",
  "content_location",
  "name_matching_option",
  "name_matching_text",
  "language",
  "ocr_engine",
  "page_rotate",
  "barcode",
] as const;

export function diffKeys(
  keysA: ProcessKey[],
  keysB: ProcessKey[]
): DiffItem<ProcessKey>[] {
  const mapA = Object.fromEntries(keysA.map((k) => [k.keyValue, k]));
  const mapB = Object.fromEntries(keysB.map((k) => [k.keyValue, k]));
  const all = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)]));

  return all.map((id) => {
    const a = mapA[id];
    const b = mapB[id];

    if (!a) return { status: "added", key: id, item: b };
    if (!b) return { status: "removed", key: id, item: a };

    const changes: FieldChange[] = [];

    KEY_FIELDS.forEach((f) => {
      if (JSON.stringify(a[f]) !== JSON.stringify(b[f]))
        changes.push({ field: f, from: a[f], to: b[f] });
    });

    PROMPT_FIELDS.forEach((f) => {
      const ppA = a.process_prompt;
      const ppB = b.process_prompt;
      if (JSON.stringify(ppA?.[f]) !== JSON.stringify(ppB?.[f]))
        changes.push({ field: `prompt.${f}`, from: ppA?.[f], to: ppB?.[f] });
    });

    if (changes.length)
      return { status: "modified", key: id, item: b, old: a, changes };
    return { status: "unchanged", key: id, item: a };
  });
}

export function diffDocs(
  docsA: ProcessDocument[],
  docsB: ProcessDocument[]
): DiffItem<ProcessDocument>[] {
  const mapA = Object.fromEntries(docsA.map((d) => [d.doc_type, d]));
  const mapB = Object.fromEntries(docsB.map((d) => [d.doc_type, d]));
  const all = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)]));

  return all.map((id) => {
    const a = mapA[id];
    const b = mapB[id];

    if (!a) return { status: "added", key: id, item: b };
    if (!b) return { status: "removed", key: id, item: a };

    const changes: FieldChange[] = [];
    DOC_FIELDS.forEach((f) => {
      if (JSON.stringify(a[f]) !== JSON.stringify(b[f]))
        changes.push({ field: f, from: a[f], to: b[f] });
    });

    if (changes.length)
      return { status: "modified", key: id, item: b, old: a, changes };
    return { status: "unchanged", key: id, item: a };
  });
}

export function filterByStatus<T>(
  items: DiffItem<T>[],
  filter: DiffStatus | "all"
): DiffItem<T>[] {
  const changed = items.filter((i) => i.status !== "unchanged");
  return filter === "all" ? changed : changed.filter((i) => i.status === filter);
}