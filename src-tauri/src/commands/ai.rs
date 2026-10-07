use tauri::State;
use serde::Deserialize;

use crate::commands::CommandError;
use crate::domain::ai::{AiTone, ChatMessage, ExtractedDraftResult, GuidedTurnResult};
use crate::infrastructure::ai::mock::MockAiProvider;

#[derive(Debug, Deserialize)]
pub struct GuidedChatParams {
    pub history: Vec<ChatMessage>,
    pub tone: AiTone,
}

#[derive(Debug, Deserialize)]
pub struct ExtractColumnsParams {
    pub raw_text: String,
}

#[derive(Clone)]
pub struct AiService {
    mock_provider: MockAiProvider,
}

impl AiService {
    pub fn new() -> Self {
        Self {
            mock_provider: MockAiProvider::new(),
        }
    }
}

#[tauri::command]
pub fn guided_chat(
    ai: State<'_, AiService>,
    params: GuidedChatParams,
) -> Result<GuidedTurnResult, CommandError> {
    Ok(ai.mock_provider.handle_guided_turn(&params.history, &params.tone))
}

#[tauri::command]
pub fn extract_five_columns(
    ai: State<'_, AiService>,
    params: ExtractColumnsParams,
) -> Result<ExtractedDraftResult, CommandError> {
    Ok(ai.mock_provider.extract_draft(&params.raw_text))
}
