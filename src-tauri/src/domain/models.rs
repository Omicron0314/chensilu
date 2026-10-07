use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PositiveFactStatus {
    Unconfirmed,
    Confirmed,
    Skipped,
    None,
}

impl PositiveFactStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Unconfirmed => "unconfirmed",
            Self::Confirmed => "confirmed",
            Self::Skipped => "skipped",
            Self::None => "none",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "unconfirmed" => Some(Self::Unconfirmed),
            "confirmed" => Some(Self::Confirmed),
            "skipped" => Some(Self::Skipped),
            "none" => Some(Self::None),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Draft {
    pub id: String,
    pub date: String, // YYYY-MM-DD
    pub raw_content: String,
    pub draft_fields_json: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub id: String,
    pub entry_id: String,
    pub description: String,
    pub goal_ref: Option<String>,
    pub duration_minutes: Option<i64>, // 未知时为 None，不自动转 0
    pub is_approximate: bool,
    pub source_quote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositiveFact {
    pub id: String,
    pub entry_id: String,
    pub fact: String,
    pub status: PositiveFactStatus,
    pub goal_ref: Option<String>,
    pub source_quote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub date: String, // YYYY-MM-DD
    pub raw_content: String,
    pub goal: Option<String>,
    pub status_category: Option<String>,
    pub reflection: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i64,
    pub actions: Vec<Action>,
    pub positive_facts: Vec<PositiveFact>,
}
