pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::system::get_app_status
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 桌面应用时发生错误");
}
