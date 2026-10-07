import {
  AppStatusDto,
  BackupResultDto,
  ExportResultDto,
  DraftDto,
  EntryDto,
  SaveDraftParams,
  SaveEntryParams,
  AiTone,
  ChatMessage,
  GuidedTurnResult,
  ExtractedDraftResult,
  GenerateReviewDraftParams,
  ReviewDraftDto,
  SaveReviewRecordParams,
  ReviewRecordDto,
  ReviewStatsDto,
  AiConfigDto,
  UpdateAiConfigParams,
} from '../contracts';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
};

// 内存降级仓储（用于单元测试与纯前端环境）
const memoryStore = {
  drafts: new Map<string, DraftDto>(),
  entries: new Map<string, EntryDto>(),
  reviews: new Map<string, ReviewRecordDto>(),
  aiConfig: {
    enabled: true,
    authorized_at: new Date().toISOString(),
    provider: 'mock',
    model: 'gemini-3.8-flash-high',
    weekly_quota: 20,
    used_quota: 0,
    has_api_key: false,
  } as AiConfigDto,
};

export async function fetchAppStatus(): Promise<AppStatusDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<AppStatusDto>('get_app_status');
  }

  return {
    app_name: '沉思路 · AI 日记助手 (测试环境)',
    version: '0.1.0',
    os: 'linux',
    storage_ready: true,
    ai_ready: false,
    database_path: '/home/Omicron0314/.local/share/chensilu/chensilu.sqlite',
  };
}

export async function saveDraft(params: SaveDraftParams): Promise<DraftDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<DraftDto>('save_draft', { params });
  }

  const draft: DraftDto = {
    id: `draft-${Date.now()}`,
    date: params.date,
    raw_content: params.raw_content,
    draft_fields_json: params.draft_fields_json,
    updated_at: new Date().toISOString(),
  };
  memoryStore.drafts.set(params.date, draft);
  return draft;
}

export async function getDraft(date: string): Promise<DraftDto | null> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<DraftDto | null>('get_draft', { date });
  }

  return memoryStore.drafts.get(date) || null;
}

export async function clearDraft(date: string): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<void>('clear_draft', { date });
    return;
  }

  memoryStore.drafts.delete(date);
}

export async function saveEntry(params: SaveEntryParams): Promise<EntryDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<EntryDto>('save_entry', { params });
  }

  const existing = params.id ? memoryStore.entries.get(params.id) : undefined;
  if (params.id && existing && params.expected_version && params.expected_version !== existing.version) {
    throw new Error(`版本冲突: expected ${params.expected_version}, current ${existing.version}`);
  }

  const now = new Date().toISOString();
  const entryId = params.id || `entry-${Date.now()}`;
  const version = existing ? existing.version + 1 : 1;

  const entry: EntryDto = {
    id: entryId,
    date: params.date,
    raw_content: params.raw_content,
    goal: params.goal,
    status_category: params.status_category,
    reflection: params.reflection,
    created_at: existing ? existing.created_at : now,
    updated_at: now,
    version,
    actions: params.actions.map((a, idx) => ({ ...a, id: a.id || `act-${idx}`, entry_id: entryId })),
    positive_facts: params.positive_facts.map((f, idx) => ({ ...f, id: f.id || `fact-${idx}`, entry_id: entryId })),
  };

  memoryStore.entries.set(entryId, entry);
  memoryStore.drafts.delete(params.date);
  return entry;
}

export async function listEntries(limit = 50, offset = 0): Promise<EntryDto[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<EntryDto[]>('list_entries', { params: { limit, offset } });
  }

  return Array.from(memoryStore.entries.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(offset, offset + limit);
}

export async function getEntry(id: string): Promise<EntryDto | null> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<EntryDto | null>('get_entry', { id });
  }

  return memoryStore.entries.get(id) || null;
}

export async function deleteEntry(id: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('delete_entry', { id });
  }

  return memoryStore.entries.delete(id);
}

export async function backupDatabase(backupFilePath?: string): Promise<BackupResultDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<BackupResultDto>('backup_database', { backupFilePath });
  }

  return {
    backup_path: backupFilePath || '/mock/backup/chensilu_backup.sqlite',
    success: true,
  };
}

export async function restoreDatabase(backupFilePath: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('restore_database', { backupFilePath });
  }

  return true;
}

export async function exportData(format: 'json' | 'markdown'): Promise<ExportResultDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ExportResultDto>('export_data', { format });
  }

  return {
    file_path: `/mock/exports/chensilu_export.${format === 'json' ? 'json' : 'md'}`,
    format,
    content: format === 'json' ? '{"entries":[]}' : '# 沉思路导出\n\n无记录',
  };
}

export async function clearAllData(): Promise<boolean> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('clear_all_data');
  }

  memoryStore.drafts.clear();
  memoryStore.entries.clear();
  memoryStore.reviews.clear();
  return true;
}

export async function guidedChat(history: ChatMessage[], tone: AiTone): Promise<GuidedTurnResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<GuidedTurnResult>('guided_chat', { params: { history, tone } });
  }

  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content.trim() || '';
  if (lastUser.includes('不想写') || lastUser.includes('休息') || lastUser.includes('跳过')) {
    return {
      reply: tone === 'gentle' ? '收到啦，今天就安心休息吧！成长允许停顿，不写日记也很棒。' : '明白。今天停止记录，好好休息。',
      should_wrap_up: true,
      is_rest_day: true,
    };
  }

  const userTurns = history.filter((m) => m.role === 'user').length;
  if (userTurns >= 2) {
    return {
      reply: tone === 'gentle'
        ? `听起来今天很有节奏。你提到了「${lastUser.slice(0, 20)}」，信息已经很充分啦，我们可以整理为五栏沉淀啦。`
        : `已记录：「${lastUser.slice(0, 20)}」。信息已充分，可点击下方生成五栏草稿。`,
      should_wrap_up: true,
      is_rest_day: false,
    };
  }

  return {
    reply: tone === 'gentle'
      ? `今天你主要在进行「${lastUser.slice(0, 24)}」。大概花了多少时间呢？（随口说个大概即可，不确定可留空）`
      : `已记录：「${lastUser.slice(0, 24)}」。今天在这项行动上大概投入了多久？`,
    should_wrap_up: false,
    is_rest_day: false,
  };
}

export async function extractFiveColumns(rawText: string): Promise<ExtractedDraftResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ExtractedDraftResult>('extract_five_columns', { params: { raw_text: rawText } });
  }

  const isApprox = rawText.includes('约') || rawText.includes('大概') || rawText.includes('差不多');
  let minutes: number | null = null;
  const match = rawText.match(/(\d+)\s*(?:分钟|min)/);
  if (match) {
    minutes = parseInt(match[1], 10);
  }

  return {
    goal: rawText.includes('沉思路') || rawText.includes('开发') ? '沉思路开发' : null,
    status_category: rawText.includes('累') ? '疲劳恢复' : '平稳推进',
    actions: [
      {
        description: rawText.slice(0, 60),
        goal_ref: rawText.includes('开发') ? '沉思路开发' : null,
        duration_minutes: minutes,
        is_approximate: isApprox,
        source_quote: rawText.slice(0, 40),
      },
    ],
    positive_facts: rawText.includes('完成') || rawText.includes('通过')
      ? [{ fact: `今天落实了：${rawText.slice(0, 30)}`, status: 'unconfirmed', goal_ref: null, source_quote: rawText.slice(0, 30) }]
      : [],
    reflection_prompt: '回想今天的过程，有什么细节让你觉得顺畅或值得优化？',
  };
}

// ============ 周复盘接口 ============

export async function generateReviewDraft(params: GenerateReviewDraftParams): Promise<ReviewDraftDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ReviewDraftDto>('generate_review_draft', { params });
  }

  // 纯前端环境下的降级聚合计算
  const matchingEntries = Array.from(memoryStore.entries.values()).filter(
    (e) => e.date >= params.start_date && e.date <= params.end_date
  );

  let totalActions = 0;
  let totalKnownMinutes = 0;
  let unknownCount = 0;
  let approxCount = 0;
  const confirmedFacts: any[] = [];
  const reflections: any[] = [];

  for (const e of matchingEntries) {
    for (const a of e.actions) {
      totalActions += 1;
      if (a.duration_minutes !== null) {
        totalKnownMinutes += a.duration_minutes;
      } else {
        unknownCount += 1;
      }
      if (a.is_approximate) approxCount += 1;
    }

    for (const f of e.positive_facts) {
      if (f.status === 'confirmed') {
        confirmedFacts.push({ fact_id: f.id, entry_id: e.id, date: e.date, fact: f.fact, goal_ref: f.goal_ref });
      }
    }

    if (e.reflection?.trim()) {
      reflections.push({ entry_id: e.id, date: e.date, snippet: e.reflection });
    }
  }

  const stats: ReviewStatsDto = {
    total_entries_count: matchingEntries.length,
    total_actions_count: totalActions,
    total_known_minutes: totalKnownMinutes,
    unknown_duration_actions_count: unknownCount,
    approximate_actions_count: approxCount,
    goals_breakdown: [
      { goal_name: '沉思路开发', action_count: totalActions, known_duration_minutes: totalKnownMinutes, unknown_duration_count: unknownCount },
    ],
    confirmed_facts_count: confirmedFacts.length,
    confirmed_facts: confirmedFacts,
    reflections_summary: reflections,
  };

  const narrative = `### 本周成长复盘（${params.start_date} ~ ${params.end_date}）\n\n**行动投入账本**：累计 ${stats.total_entries_count} 篇日记、${stats.total_actions_count} 项行动。已知时间投入 ${stats.total_known_minutes} 分钟。\n\n**确认正反馈**：共 ${stats.confirmed_facts_count} 项。`;

  return {
    start_date: params.start_date,
    end_date: params.end_date,
    stats,
    narrative,
    citations: confirmedFacts.map((f) => ({ entry_id: f.entry_id, date: f.date, quote: f.fact })),
  };
}

export async function saveReviewRecord(params: SaveReviewRecordParams): Promise<ReviewRecordDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ReviewRecordDto>('save_review_record', { params });
  }

  const now = new Date().toISOString();
  const id = params.id || `rev-${Date.now()}`;
  const record: ReviewRecordDto = {
    id,
    start_date: params.start_date,
    end_date: params.end_date,
    narrative: params.narrative,
    stats: JSON.parse(params.stats_json),
    status: params.status as any,
    created_at: now,
    updated_at: now,
  };
  memoryStore.reviews.set(id, record);
  return record;
}

export async function listReviews(): Promise<ReviewRecordDto[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ReviewRecordDto[]>('list_reviews');
  }

  return Array.from(memoryStore.reviews.values()).sort((a, b) => b.end_date.localeCompare(a.end_date));
}

export async function getAiConfig(): Promise<AiConfigDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<AiConfigDto>('get_ai_config');
  }

  return { ...memoryStore.aiConfig };
}

export async function updateAiConfig(params: UpdateAiConfigParams): Promise<AiConfigDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<AiConfigDto>('update_ai_config', { params });
  }

  memoryStore.aiConfig = {
    ...memoryStore.aiConfig,
    enabled: params.enabled,
    provider: params.provider,
    model: params.model || memoryStore.aiConfig.model,
    has_api_key: Boolean(params.api_key) || memoryStore.aiConfig.has_api_key,
  };
  return { ...memoryStore.aiConfig };
}
