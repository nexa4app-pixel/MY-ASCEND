pub mod database;
pub mod migration_runner;
pub mod focus_mode;

use database::*;
use focus_mode::*;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn task_mark_done(state: tauri::State<DatabaseState>, task_id: String) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    let sql = "UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?";
    let params = vec![serde_json::Value::String(now), serde_json::Value::String(task_id)];
    db_execute(state, sql.to_string(), params).map(|_| ())
}

#[tauri::command]
pub fn task_quick_note(state: tauri::State<DatabaseState>, task_id: String, note: String) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    let sql = "UPDATE tasks SET description = CASE WHEN description IS NULL OR description = '' THEN ? ELSE description || '\n' || ? END, updated_at = ? WHERE id = ?";
    let params = vec![
        serde_json::Value::String(note.clone()),
        serde_json::Value::String(note),
        serde_json::Value::String(now),
        serde_json::Value::String(task_id),
    ];
    db_execute(state, sql.to_string(), params).map(|_| ())
}

#[tauri::command]
pub fn toggle_mini_timer_window(app: tauri::AppHandle, show: bool) -> Result<bool, String> {
    if let Some(mini) = app.get_webview_window("mini-timer") {
        if show {
            let _ = mini.show();
            let _ = mini.set_focus();
        } else {
            let _ = mini.hide();
        }
    } else if show {
        let _ = tauri::WebviewWindowBuilder::new(
            &app,
            "mini-timer",
            tauri::WebviewUrl::App("index.html?window=mini-timer".into()),
        )
        .title("MY ASCEND Mini Timer")
        .inner_size(280.0, 110.0)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .shadow(true)
        .build();
    }
    Ok(show)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
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

            // Setup System Tray
            let show_i = tauri::menu::MenuItem::with_id(app, "show", "Open MY ASCEND", true, None::<&str>)?;
            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
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
            task_mark_done,
            task_quick_note,
            set_focus_assist,
            get_focus_assist_status,
            toggle_mini_timer_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
