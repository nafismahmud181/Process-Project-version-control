export interface PromptVersion {
  versionNumber: number;
  field_description: string;
  rules_description: string;
  extraction_type: string;
  doc_class: string;
  sourceVersionLabel: string; // e.g. "CR_IMPORT v2"
  timestamp: string;
}

export interface PromptEntry {
  keyValue: string;
  label: string;
  keyType: string;
  processName: string;
  processId: string;
  project: string;
  versions: PromptVersion[];
  updatedAt: string;
}

// Lightweight version for the index (no versions array)
export interface PromptIndexEntry {
  keyValue: string;
  label: string;
  keyType: string;
  processName: string;
  processId: string;
  project: string;
  versionCount: number;
  hasChanges: boolean;
  updatedAt: string;
  latestFieldDesc?: string;
}