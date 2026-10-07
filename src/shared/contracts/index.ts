export interface AppStatusDto {
  app_name: string;
  version: string;
  os: string;
  storage_ready: boolean;
  ai_ready: boolean;
}

export interface CommandError {
  code: string;
  message: string;
}

export type NavigationTab = 'recording' | 'entries' | 'reviews' | 'settings';
