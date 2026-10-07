pub mod storage;
pub mod system;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusDto {
    pub app_name: String,
    pub version: String,
    pub os: String,
    pub storage_ready: bool,
    pub ai_ready: bool,
    pub database_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}]: {}", self.code, self.message)
    }
}

impl std::error::Error for CommandError {}
