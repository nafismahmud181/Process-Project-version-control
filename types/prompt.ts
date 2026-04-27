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
  keyValue: string;       // unique key e.g. "invoiceNumber"
  label: string;          // display name e.g. "Invoice Number"
  keyType: string;        // key / table / addressBlock / etc.
  processName: string;    // e.g. "CR_IMPORT_DGFCW1CustomsDeclaration(B+CIV)"
  processId: string;      // e.g. "CR-AA5-0000003"
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
  versionCount: number;
  hasChanges: boolean;   // true if more than one version exists
  updatedAt: string;
}