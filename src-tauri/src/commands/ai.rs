use std::sync::{Arc, Mutex};
use tauri::State;
use serde::{Deserialize, Serialize};

use crate::commands::CommandError;
use crate::domain::ai::{AiTone, ChatMessage, ExtractedDraftResult, GuidedTurnResult};
use crate::infrastructure::ai::gemini::GeminiProvider;
use crate::infrastructure::ai::mock::MockAiProvider;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfigDto {
    pub enabled: bool,
    pub authorized_at: Option<String>,
    pub provider: String, // "mock" | "gemini"
    pub model: String,
    pub weekly_quota: u32,
    pub used_quota: u32,
    pub has_api_key: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAiConfigParams {
    pub enabled: bool,
    pub provider: String,
    pub api_key: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GuidedChatParams {
    pub history: Vec<ChatMessage>,
    pub tone: AiTone,
}

#[derive(Debug, Deserialize)]
pub struct ExtractColumnsParams {
    pub raw_text: String,
}

pub struct AiServiceState {
    pub config: AiConfigDto,
    pub api_key: Option<String>,
    pub mock_provider: MockAiProvider,
}

#[derive(Clone)]
pub struct AiService {
    state: Arc<Mutex<AiServiceState>>,
}

impl AiService {
    pub fn new() -> Self {
        // 读取环境变量 GEMINI_API_KEY 作为初始默认凭据
        let env_key = std::env::var("GEMINI_API_KEY").ok();
        let has_key = env_key.is_some();

        let initial_config = AiConfigDto {
            enabled: false, // 遵循隐私约束：默认关闭，需用户在设置页显式授权后开启
            authorized_at: None,
            provider: "mock".to_string(),
            model: "gemini-3.8-flash-high".to_string(),
            weekly_quota: 20, // 每周免费额度，足额保障完整记录与周报循环
            used_quota: 0,
            has_api_key: has_key,
        };

        Self {
            state: Arc::new(Mutex::new(AiServiceState {
                config: initial_config,
                api_key: env_key,
                mock_provider: MockAiProvider::new(),
            })),
        }
    }
}

#[tauri::command]
pub fn get_ai_config(ai: State<'_, AiService>) -> Result<AiConfigDto, CommandError> {
    let state = ai.state.lock().unwrap();
    Ok(state.config.clone())
}

#[tauri::command]
pub fn update_ai_config(
    ai: State<'_, AiService>,
    params: UpdateAiConfigParams,
) -> Result<AiConfigDto, CommandError> {
    let mut state = ai.state.lock().unwrap();

    if params.enabled && state.config.authorized_at.is_none() {
        state.config.authorized_at = Some(chrono::Utc::now().to_rfc3339());
    }

    state.config.enabled = params.enabled;
    state.config.provider = params.provider;
    if let Some(m) = params.model {
        state.config.model = m;
    }

    if let Some(key) = params.api_key {
        if !key.trim().is_empty() {
            state.api_key = Some(key.trim().to_string());
            state.config.has_api_key = true;
        }
    }

    Ok(state.config.clone())
}

#[tauri::command]
pub async fn guided_chat(
    ai: State<'_, AiService>,
    params: GuidedChatParams,
) -> Result<GuidedTurnResult, CommandError> {
    let (_enabled, provider_type, api_key_opt, model, mock_provider) = {
        let state = ai.state.lock().unwrap();
        if !state.config.enabled {
            return Err(CommandError {
                code: "AI_DISABLED".to_string(),
                message: "AI 服务当前处于关闭状态。可在设置页查看授权并开启。".to_string(),
            });
        }
        if state.config.used_quota >= state.config.weekly_quota {
            return Err(CommandError {
                code: "QUOTA_EXHAUSTED".to_string(),
                message: "本周免费 AI 额度已用尽（本地记录、保存与周报浏览不受影响）。".to_string(),
            });
        }
        (
            state.config.enabled,
            state.config.provider.clone(),
            state.api_key.clone(),
            state.config.model.clone(),
            state.mock_provider.clone(),
        )
    };

    let result = if provider_type == "gemini" && api_key_opt.is_some() {
        let gemini = GeminiProvider::new(api_key_opt.unwrap(), Some(model));
        gemini.guided_turn(&params.history, &params.tone).await
    } else {
        Ok(mock_provider.handle_guided_turn(&params.history, &params.tone))
    };

    match result {
        Ok(res) => {
            // 扣减 1 次额度
            let mut state = ai.state.lock().unwrap();
            state.config.used_quota += 1;
            Ok(res)
        }
        Err(e) => Err(CommandError {
            code: "AI_CALL_FAILED".to_string(),
            message: e.to_string(),
        }),
    }
}

#[tauri::command]
pub async fn extract_five_columns(
    ai: State<'_, AiService>,
    params: ExtractColumnsParams,
) -> Result<ExtractedDraftResult, CommandError> {
    let (_enabled, provider_type, api_key_opt, model, mock_provider) = {
        let state = ai.state.lock().unwrap();
        if !state.config.enabled {
            return Err(CommandError {
                code: "AI_DISABLED".to_string(),
                message: "AI 服务当前处于关闭状态。可在设置页查看授权并开启。".to_string(),
            });
        }
        if state.config.used_quota >= state.config.weekly_quota {
            return Err(CommandError {
                code: "QUOTA_EXHAUSTED".to_string(),
                message: "本周免费 AI 额度已用尽。".to_string(),
            });
        }
        (
            state.config.enabled,
            state.config.provider.clone(),
            state.api_key.clone(),
            state.config.model.clone(),
            state.mock_provider.clone(),
        )
    };

    let result = if provider_type == "gemini" && api_key_opt.is_some() {
        let gemini = GeminiProvider::new(api_key_opt.unwrap(), Some(model));
        gemini.extract_draft(&params.raw_text).await
    } else {
        Ok(mock_provider.extract_draft(&params.raw_text))
    };

    match result {
        Ok(res) => {
            let mut state = ai.state.lock().unwrap();
            state.config.used_quota += 1;
            Ok(res)
        }
        Err(e) => Err(CommandError {
            code: "AI_EXTRACT_FAILED".to_string(),
            message: e.to_string(),
        }),
    }
}
