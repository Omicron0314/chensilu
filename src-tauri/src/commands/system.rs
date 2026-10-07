use tauri::State;
use crate::commands::{AppStatusDto, CommandError};
use crate::infrastructure::database::Database;

#[tauri::command]
pub fn get_app_status(db: State<'_, Database>) -> Result<AppStatusDto, CommandError> {
    let db_path_str = db.db_path().map(|p| p.to_string_lossy().to_string());
    Ok(AppStatusDto {
        app_name: "沉思路 · AI 日记助手".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        storage_ready: true, // Plan 02: 本地 SQLite 仓储已就绪
        ai_ready: false,      // Plan 05: 真实 AI 后置为 true
        database_path: db_path_str,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_app_status_with_db() {
        let db = Database::in_memory().expect("db should init");
        // 纯逻辑单元测试可直接调用底层字段验证
        assert_eq!(db.db_path(), None);
    }
}
