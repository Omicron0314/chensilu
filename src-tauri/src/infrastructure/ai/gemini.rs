use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::domain::ai::{
    AiTone, ChatMessage, ExtractedDraftResult, GuidedTurnResult,
};
use crate::domain::errors::DomainError;

#[derive(Clone)]
pub struct GeminiProvider {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

#[derive(Serialize, Clone)]
struct GeminiPart {
    text: String,
}

#[derive(Serialize, Clone)]
struct GeminiContent {
    role: String,
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
}

#[derive(Deserialize)]
struct GeminiCandidatePart {
    text: Option<String>,
}

#[derive(Deserialize)]
struct GeminiCandidateContent {
    parts: Option<Vec<GeminiCandidatePart>>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiCandidateContent>,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

impl GeminiProvider {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        let chosen_model = model.unwrap_or_else(|| "gemini-3.8-flash-high".to_string());
        // 严格遵循用户限制：仅允许 Gemini 系列模型
        let safe_model = if chosen_model.starts_with("gemini") {
            chosen_model
        } else {
            "gemini-3.8-flash-high".to_string()
        };

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        Self {
            api_key,
            model: safe_model,
            client,
        }
    }

    pub async fn guided_turn(
        &self,
        history: &[ChatMessage],
        tone: &AiTone,
    ) -> Result<GuidedTurnResult, DomainError> {
        let tone_desc = match tone {
            AiTone::Gentle => "温和体贴、充满同理心",
            AiTone::Direct => "精炼、直接客观",
        };

        let system_prompt = format!(
            "你是一个 AI 日记助手。你的任务是用轻松对话挖掘用户今天的经历并结构化记录。\n\
            规则：\n\
            1. 先复述用户说的一句话（忠实于事实），然后针对未说明的时间投入或关键事实提一个单点问题；\n\
            2. 口吻必须是：{}；\n\
            3. 如果用户表示累了、不想写或想休息，必须立刻表达理解并停止追问；\n\
            4. 如果用户已经回答了2轮或信息充分，引导用户结束并整理五栏。\n\
            请仅输出给用户的回答正文。",
            tone_desc
        );

        let mut contents = vec![GeminiContent {
            role: "user".to_string(),
            parts: vec![GeminiPart { text: system_prompt }],
        }];

        for m in history {
            contents.push(GeminiContent {
                role: if m.role == "user" { "user".to_string() } else { "model".to_string() },
                parts: vec![GeminiPart { text: m.content.clone() }],
            });
        }

        let resp_text = self.call_gemini(&contents).await?;
        let should_wrap = history.iter().filter(|m| m.role == "user").count() >= 2;
        let is_rest = resp_text.contains("休息") || resp_text.contains("放松");

        Ok(GuidedTurnResult {
            reply: resp_text,
            should_wrap_up: should_wrap,
            is_rest_day: is_rest,
        })
    }

    pub async fn extract_draft(&self, text: &str) -> Result<ExtractedDraftResult, DomainError> {
        let prompt = format!(
            "请分析以下日记文本，提取五栏草稿 JSON。字段规则：\n\
            - goal: 关联目标（无则为 null）\n\
            - status_category: 状态类别（文本描述，如专注、平稳，禁止数值打分）\n\
            - actions: 数组，每项包含 description(事实描述), duration_minutes(投入分钟数整数，未说明则必须为 null), is_approximate(是否约为，布尔值)\n\
            - positive_facts: 数组，每项包含 fact(事实描述), status(必须为 'unconfirmed')\n\
            - reflection_prompt: 递给用户的一个启发性微小反思引子\n\
            文本内容：\n\
            {}\n\
            请直接输出纯 JSON，不带 markdown 标记。",
            text
        );

        let contents = vec![GeminiContent {
            role: "user".to_string(),
            parts: vec![GeminiPart { text: prompt }],
        }];

        let raw_json = self.call_gemini(&contents).await?;
        let clean_json = raw_json
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        #[derive(Deserialize)]
        struct ExtractedJson {
            goal: Option<String>,
            status_category: Option<String>,
            actions: Option<Vec<crate::domain::ai::ExtractedActionDraft>>,
            positive_facts: Option<Vec<crate::domain::ai::ExtractedPositiveFactDraft>>,
            reflection_prompt: Option<String>,
        }

        let parsed: ExtractedJson = serde_json::from_str(clean_json).map_err(|e| {
            DomainError::ValidationError(format!("Gemini 返回 JSON 校验失败: {}", e))
        })?;

        Ok(ExtractedDraftResult {
            goal: parsed.goal,
            status_category: parsed.status_category,
            actions: parsed.actions.unwrap_or_default(),
            positive_facts: parsed.positive_facts.unwrap_or_default(),
            reflection_prompt: parsed.reflection_prompt,
        })
    }

    async fn call_gemini(&self, contents: &[GeminiContent]) -> Result<String, DomainError> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );

        let body = GeminiRequest {
            contents: contents.to_vec(),
        };

        let response = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| DomainError::StorageError(format!("Gemini 请求失败: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            return Err(DomainError::StorageError(format!(
                "Gemini API 响应异常: HTTP {}",
                status
            )));
        }

        let resp_obj: GeminiResponse = response
            .json()
            .await
            .map_err(|e| DomainError::StorageError(format!("解析 Gemini 响应失败: {}", e)))?;

        let first_text = resp_obj
            .candidates
            .as_ref()
            .and_then(|c| c.get(0))
            .and_then(|c| c.content.as_ref())
            .and_then(|c| c.parts.as_ref())
            .and_then(|p| p.get(0))
            .and_then(|p| p.text.clone())
            .unwrap_or_default();

        Ok(first_text)
    }
}
