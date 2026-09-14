use crate::migration_runner::{get_applied_migrations, run_migrations, MigrationRecord};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;

pub struct DatabaseState {
    pub conn: Mutex<Connection>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PingResponse {
    pub status: String,
    pub sqlite_version: String,
    pub latency_ms: f64,
    pub database_path: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TableCountInfo {
    pub table_name: String,
    pub count: i64,
}

const ALL_TABLES: &[&str] = &[
    "schema_metadata",
    "profiles",
    "areas",
    "devices",
    "settings",
    "inbox_captures",
    "notes",
    "visions",
    "goals",
    "projects",
    "tasks",
    "habits",
    "habit_logs",
    "institutions",
    "subjects",
    "books",
    "chapters",
    "sections",
    "topics",
    "schedules",
    "learning_sessions",
    "learning_evidence",
    "mastery_records",
    "focus_sessions",
    "events",
    "journals",
    "memories",
    "files",
    "attachments",
    "reminders",
    "activity_history",
    "change_logs",
    "trash",
];

impl DatabaseState {
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        let mut conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;
        run_migrations(&mut conn).map_err(|e| format!("Failed running migrations: {}", e))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn new_in_memory() -> Result<Self, String> {
        let mut conn = Connection::open_in_memory().map_err(|e| format!("Failed to open in-memory DB: {}", e))?;
        run_migrations(&mut conn).map_err(|e| format!("Failed running migrations: {}", e))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

#[tauri::command]
pub fn db_ping(state: tauri::State<'_, DatabaseState>) -> Result<PingResponse, String> {
    let start = Instant::now();
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let version: String = conn
        .query_row("SELECT sqlite_version()", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let latency_ms = start.elapsed().as_secs_f64() * 1000.0;

    Ok(PingResponse {
        status: "healthy".to_string(),
        sqlite_version: version,
        latency_ms,
        database_path: "ascend.db".to_string(),
    })
}

#[tauri::command]
pub fn db_get_schema_version(state: tauri::State<'_, DatabaseState>) -> Result<i32, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_metadata",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    Ok(version)
}

#[tauri::command]
pub fn db_get_migration_status(state: tauri::State<'_, DatabaseState>) -> Result<Vec<MigrationRecord>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_applied_migrations(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_get_table_counts(state: tauri::State<'_, DatabaseState>) -> Result<Vec<TableCountInfo>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut results = Vec::new();

    for &table in ALL_TABLES {
        let query = format!("SELECT COUNT(*) FROM {}", table);
        let count: i64 = conn.query_row(&query, [], |row| row.get(0)).unwrap_or(0);
        results.push(TableCountInfo {
            table_name: table.to_string(),
            count,
        });
    }

    Ok(results)
}

#[tauri::command]
pub fn db_get_setting(state: tauri::State<'_, DatabaseState>, key: String) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1 AND is_deleted = 0")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(rusqlite::params![key]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let val: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(val))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn db_set_setting(
    state: tauri::State<'_, DatabaseState>,
    id: String,
    key: String,
    value: String,
    device_id: String,
    created_at: String,
    updated_at: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO settings (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, key, value, category)
        VALUES (?1, ?2, ?3, 1, ?4, 0, NULL, ?5, ?6, 'general')
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at,
            device_id = excluded.device_id,
            version = settings.version + 1
        "#,
        rusqlite::params![id, created_at, updated_at, device_id, key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_execute(
    state: tauri::State<'_, DatabaseState>,
    sql: String,
    params: Vec<serde_json::Value>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rusqlite_params: Vec<Box<dyn rusqlite::ToSql>> = params
        .iter()
        .map(|v| match v {
            serde_json::Value::Null => Box::new(rusqlite::types::Null) as Box<dyn rusqlite::ToSql>,
            serde_json::Value::Bool(b) => Box::new(*b) as Box<dyn rusqlite::ToSql>,
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Box::new(i) as Box<dyn rusqlite::ToSql>
                } else if let Some(f) = n.as_f64() {
                    Box::new(f) as Box<dyn rusqlite::ToSql>
                } else {
                    Box::new(n.to_string()) as Box<dyn rusqlite::ToSql>
                }
            }
            serde_json::Value::String(s) => Box::new(s.clone()) as Box<dyn rusqlite::ToSql>,
            serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
                Box::new(v.to_string()) as Box<dyn rusqlite::ToSql>
            }
        })
        .collect();

    let slice_params: Vec<&dyn rusqlite::ToSql> = rusqlite_params.iter().map(|b| b.as_ref()).collect();
    stmt.execute(slice_params.as_slice()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_query(
    state: tauri::State<'_, DatabaseState>,
    sql: String,
    params: Vec<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rusqlite_params: Vec<Box<dyn rusqlite::ToSql>> = params
        .iter()
        .map(|v| match v {
            serde_json::Value::Null => Box::new(rusqlite::types::Null) as Box<dyn rusqlite::ToSql>,
            serde_json::Value::Bool(b) => Box::new(*b) as Box<dyn rusqlite::ToSql>,
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Box::new(i) as Box<dyn rusqlite::ToSql>
                } else if let Some(f) = n.as_f64() {
                    Box::new(f) as Box<dyn rusqlite::ToSql>
                } else {
                    Box::new(n.to_string()) as Box<dyn rusqlite::ToSql>
                }
            }
            serde_json::Value::String(s) => Box::new(s.clone()) as Box<dyn rusqlite::ToSql>,
            serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
                Box::new(v.to_string()) as Box<dyn rusqlite::ToSql>
            }
        })
        .collect();

    let slice_params: Vec<&dyn rusqlite::ToSql> = rusqlite_params.iter().map(|b| b.as_ref()).collect();

    let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();

    let rows = stmt
        .query_map(slice_params.as_slice(), |row| {
            let mut map = serde_json::Map::new();
            for (idx, name) in col_names.iter().enumerate() {
                let val: rusqlite::types::Value = row.get(idx)?;
                let json_val = match val {
                    rusqlite::types::Value::Null => serde_json::Value::Null,
                    rusqlite::types::Value::Integer(i) => serde_json::Value::Number(i.into()),
                    rusqlite::types::Value::Real(f) => {
                        serde_json::Number::from_f64(f).map(serde_json::Value::Number).unwrap_or(serde_json::Value::Null)
                    }
                    rusqlite::types::Value::Text(t) => serde_json::Value::String(t),
                    rusqlite::types::Value::Blob(b) => serde_json::Value::String(String::from_utf8_lossy(&b).into_owned()),
                };
                map.insert(name.clone(), json_val);
            }
            Ok(serde_json::Value::Object(map))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

