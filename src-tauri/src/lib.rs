pub mod database;
pub mod migration_runner;

use database::*;
use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
            std::fs::create_dir_all(&app_data_dir).ok();
            let db_path = app_data_dir.join("ascend.db");

            let db_state = DatabaseState::new(db_path)
                .unwrap_or_else(|e| {
                    eprintln!("Warning: Failed to open persistent DB ({}), falling back to in-memory: ", e);
                    DatabaseState::new_in_memory().expect("In-memory SQLite must succeed")
                });

            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db_ping,
            db_get_schema_version,
            db_get_migration_status,
            db_get_table_counts,
            db_get_setting,
            db_set_setting,
            db_execute,
            db_query,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
