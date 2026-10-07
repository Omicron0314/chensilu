pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

use std::path::PathBuf;
use commands::ai::AiService;
use infrastructure::database::Database;

fn resolve_default_db_path() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("chensilu");
    data_dir.join("chensilu.sqlite")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = resolve_default_db_path();
    let database = Database::new(db_path)
        .expect("初始化本地 SQLite 数据库仓储失败");
    let ai_service = AiService::new();

    tauri::Builder::default()
        .manage(database)
        .manage(ai_service)
        .invoke_handler(tauri::generate_handler![
            commands::system::get_app_status,
            commands::storage::save_draft,
            commands::storage::get_draft,
            commands::storage::clear_draft,
            commands::storage::save_entry,
            commands::storage::get_entry,
            commands::storage::list_entries,
            commands::storage::delete_entry,
            commands::storage::backup_database,
            commands::storage::restore_database,
            commands::storage::export_data,
            commands::storage::clear_all_data,
            commands::ai::get_ai_config,
            commands::ai::update_ai_config,
            commands::ai::guided_chat,
            commands::ai::extract_five_columns,
            commands::review::generate_review_draft,
            commands::review::save_review_record,
            commands::review::list_reviews,
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 桌面应用时发生错误");
}
