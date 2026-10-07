import {
  AppStatusDto,
  BackupResultDto,
  DraftDto,
  EntryDto,
  SaveDraftParams,
  SaveEntryParams,
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
