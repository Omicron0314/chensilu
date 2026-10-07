import { AppStatusDto } from '../contracts';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
};

export async function fetchAppStatus(): Promise<AppStatusDto> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<AppStatusDto>('get_app_status');
  }

  // 离线/开发/测试环境降级适配（不抛未捕获异常）
  return {
    app_name: '沉思路 · AI 日记助手 (Web 测试预览)',
    version: '0.1.0',
    os: 'linux',
    storage_ready: false,
    ai_ready: false,
  };
}
