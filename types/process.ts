export interface RegexPattern {
  pattern: string;
  description: string;
}

export interface ProcessPrompt {
  DocClass: string;
  Regex_Patterns: RegexPattern[];
  Extraction_Type: string;
  Field_Description: string;
  Rules_Description: string;
}

export interface ProcessDocument {
  id: number;
  template: string | null;
  doc_type: string;
  content_location: string;
  name_matching_option: string;
  name_matching_text: string;
  category: string;
  language: string;
  ocr_engine: string;
  page_rotate: boolean;
  barcode: boolean;
  show_embedded_img: boolean;
  profile: number;
}

export interface ProcessKey {
  type: string;
  label: string;
  keyValue: string;
  required: boolean;
  addToProcess: boolean;
  append_prompt?: boolean;
  documents?: unknown[];
  precedence?: unknown[];
  process_prompt?: ProcessPrompt;
}

export interface Process {
  id: number;
  process_id: string;
  process_uid: string;
  name: string;
  free_name: string;
  country: string;
  project: string;
  documents: ProcessDocument[];
  keys: ProcessKey[];
  email_domains: string;
  email_from: string | null;
  email_subject_match_option: string;
  email_subject_match_text: string;
  manual_validation: boolean;
  multi_shipment: boolean;
  send_time_stamp: boolean;
  automatic_splitting: boolean;
  majority_voting: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VersionMeta {
  id: string;
  label: string;
  note: string;
  timestamp: string;
  processId: string;
  processName: string;
  keyCount: number;
  docCount: number;
  versionNumber: number;
}