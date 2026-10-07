import {
  AppStatusDto,
  BackupResultDto,
  DraftDto,
  EntryDto,
  SaveDraftParams,
  SaveEntryParams,
  AiTone,
  ChatMessage,
  GuidedTurnResult,
  ExtractedDraftResult,
} from '../contracts';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
};

// 内存降级仓储（用于纯 Web 预览与单元测试环境）
const memoryStore = {
  drafts: new Map<string, DraftDto>(),
  entries: new Map<string, EntryDto>(),
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

  // 纯前端环境下的降级抽取
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
