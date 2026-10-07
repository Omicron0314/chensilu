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

// ============ 周复盘相关契约 ============

export interface GoalAggregationDto {
  goal_name: string;
  action_count: number;
  known_duration_minutes: number;
  unknown_duration_count: number;
}

export interface ReviewFactItemDto {
  fact_id: string;
  entry_id: string;
  date: string;
  fact: string;
  goal_ref?: string | null;
}

export interface ReviewReflectionItemDto {
  entry_id: string;
  date: string;
  snippet: string;
}

export interface ReviewCitationDto {
  entry_id: string;
  date: string;
  quote: string;
}

export interface ReviewStatsDto {
  total_entries_count: number;
  total_actions_count: number;
  total_known_minutes: number;
  unknown_duration_actions_count: number;
  approximate_actions_count: number;
  goals_breakdown: GoalAggregationDto[];
  confirmed_facts_count: number;
  confirmed_facts: ReviewFactItemDto[];
  reflections_summary: ReviewReflectionItemDto[];
}

export interface ReviewDraftDto {
  start_date: string;
  end_date: string;
  stats: ReviewStatsDto;
  narrative: string;
  citations: ReviewCitationDto[];
}

export interface ReviewRecordDto {
  id: string;
  start_date: string;
  end_date: string;
  narrative: string;
  stats: ReviewStatsDto;
  status: 'draft' | 'confirmed' | 'stale';
  created_at: string;
  updated_at: string;
}

export interface GenerateReviewDraftParams {
  start_date: string;
  end_date: string;
}

export interface SaveReviewRecordParams {
  id?: string | null;
  start_date: string;
  end_date: string;
  narrative: string;
  stats_json: string;
  status: string;
}

export interface AiConfigDto {
  enabled: boolean;
  authorized_at: string | null;
  provider: string; // 'mock' | 'gemini'
  model: string;
  weekly_quota: number;
  used_quota: number;
  has_api_key: boolean;
}

export interface UpdateAiConfigParams {
  enabled: boolean;
  provider: string;
  api_key?: string | null;
  model?: string | null;
}

export type NavigationTab = 'recording' | 'entries' | 'reviews' | 'settings';
