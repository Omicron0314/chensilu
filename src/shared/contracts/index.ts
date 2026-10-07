export type PositiveFactStatus = 'unconfirmed' | 'confirmed' | 'skipped' | 'none';

export interface ActionDto {
  id: string;
  entry_id: string;
  description: string;
  goal_ref?: string | null;
  duration_minutes: number | null; // 未知为 null，禁止自动变 0
  is_approximate: boolean;
  source_quote?: string | null;
}

export interface PositiveFactDto {
  id: string;
  entry_id: string;
  fact: string;
  status: PositiveFactStatus;
  goal_ref?: string | null;
  source_quote?: string | null;
}

export interface EntryDto {
  id: string;
  date: string; // YYYY-MM-DD
  raw_content: string;
  goal?: string | null;
  status_category?: string | null;
  reflection?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  actions: ActionDto[];
  positive_facts: PositiveFactDto[];
}

export interface DraftDto {
  id: string;
  date: string;
  raw_content: string;
  draft_fields_json?: string | null;
  updated_at: string;
}

export interface SaveDraftParams {
  date: string;
  raw_content: string;
  draft_fields_json?: string | null;
}

export interface SaveEntryParams {
  id?: string | null;
  date: string;
  raw_content: string;
  goal?: string | null;
  status_category?: string | null;
  reflection?: string | null;
  actions: ActionDto[];
  positive_facts: PositiveFactDto[];
  expected_version?: number | null;
}

export interface BackupResultDto {
  backup_path: string;
  success: boolean;
}

export interface AppStatusDto {
  app_name: string;
  version: string;
  os: string;
  storage_ready: boolean;
  ai_ready: boolean;
  database_path?: string | null;
}

export interface CommandError {
  code: string;
  message: string;
}

export type AiTone = 'gentle' | 'direct';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GuidedTurnResult {
  reply: string;
  should_wrap_up: boolean;
  is_rest_day: boolean;
}

export interface ExtractedActionDraft {
  description: string;
  goal_ref?: string | null;
  duration_minutes: number | null;
  is_approximate: boolean;
  source_quote?: string | null;
}

export interface ExtractedPositiveFactDraft {
  fact: string;
  status: string;
  goal_ref?: string | null;
  source_quote?: string | null;
}

export interface ExtractedDraftResult {
  goal?: string | null;
  status_category?: string | null;
  actions: ExtractedActionDraft[];
  positive_facts: ExtractedPositiveFactDraft[];
  reflection_prompt?: string | null;
}

export type NavigationTab = 'recording' | 'entries' | 'reviews' | 'settings';
