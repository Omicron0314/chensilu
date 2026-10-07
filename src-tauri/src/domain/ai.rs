use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AiTone {
    Gentle,
    Direct,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidedTurnResult {
    pub reply: String,
    pub should_wrap_up: bool,
    pub is_rest_day: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedActionDraft {
    pub description: String,
    pub goal_ref: Option<String>,
    pub duration_minutes: Option<i64>, // 未提及则为 None，不可臆测
    pub is_approximate: bool,
    pub source_quote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedPositiveFactDraft {
    pub fact: String,
    pub status: String, // "unconfirmed"
    pub goal_ref: Option<String>,
    pub source_quote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedDraftResult {
    pub goal: Option<String>,
    pub status_category: Option<String>,
    pub actions: Vec<ExtractedActionDraft>,
    pub positive_facts: Vec<ExtractedPositiveFactDraft>,
    pub reflection_prompt: Option<String>,
}
