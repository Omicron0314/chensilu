use crate::commands::{AppStatusDto, CommandError};

#[tauri::command]
pub fn get_app_status() -> Result<AppStatusDto, CommandError> {
    Ok(AppStatusDto {
        app_name: "沉思路 · AI 日记助手".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        storage_ready: false, // Plan 02 接入真实 SQLite 后置为 true
        ai_ready: false,      // Plan 05 接入真实 AI 后置为 true
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_app_status() {
        let status = get_app_status().expect("status should be ok");
        assert_eq!(status.app_name, "沉思路 · AI 日记助手");
        assert_eq!(status.version, "0.1.0");
        assert!(!status.storage_ready);
        assert!(!status.ai_ready);
    }
}
