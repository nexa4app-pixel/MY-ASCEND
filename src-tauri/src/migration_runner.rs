use chrono::Utc;
use rusqlite::{params, Connection, Result};
use sha2::{Digest, Sha256};
use std::time::Instant;

pub struct Migration {
    pub version: i32,
    pub name: &'static str,
    pub sql: &'static str,
}

pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "001_init_schema_metadata",
        sql: include_str!("../migrations/001_init_schema_metadata.sql"),
    },
    Migration {
        version: 2,
        name: "002_create_core_domain_tables",
        sql: include_str!("../migrations/002_create_core_domain_tables.sql"),
    },
    Migration {
        version: 3,
        name: "003_create_system_tables",
        sql: include_str!("../migrations/003_create_system_tables.sql"),
    },
    Migration {
        version: 4,
        name: "004_create_performance_indexes",
        sql: include_str!("../migrations/004_create_performance_indexes.sql"),
    },
    Migration {
        version: 5,
        name: "005_add_focus_distractions",
        sql: include_str!("../migrations/005_add_focus_distractions.sql"),
    },
];

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct MigrationRecord {
    pub version: i32,
    pub name: String,
    pub applied_at: String,
    pub checksum: String,
    pub execution_time_ms: i64,
}

pub fn run_migrations(conn: &mut Connection) -> Result<Vec<MigrationRecord>> {
    // Enable foreign keys and WAL mode for high performance
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;

    // Step 1: Ensure schema_metadata exists
    conn.execute_batch(include_str!("../migrations/001_init_schema_metadata.sql"))?;

    let mut applied_records: Vec<MigrationRecord> = Vec::new();

    for migration in MIGRATIONS {
        let exists: bool = {
            let mut stmt = conn.prepare("SELECT version, name, applied_at, checksum, execution_time_ms FROM schema_metadata WHERE version = ?1")?;
            stmt.exists(params![migration.version])?
        };

        if !exists {
            let start = Instant::now();
            let mut hasher = Sha256::new();
            hasher.update(migration.sql.as_bytes());
            let checksum = format!("{:x}", hasher.finalize());

            let tx = conn.transaction()?;
            tx.execute_batch(migration.sql)?;

            let elapsed_ms = start.elapsed().as_millis() as i64;
            let applied_at = Utc::now().to_rfc3339();

            tx.execute(
                "INSERT INTO schema_metadata (version, name, applied_at, checksum, execution_time_ms) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![migration.version, migration.name, applied_at, checksum, elapsed_ms],
            )?;

            tx.commit()?;

            applied_records.push(MigrationRecord {
                version: migration.version,
                name: migration.name.to_string(),
                applied_at,
                checksum,
                execution_time_ms: elapsed_ms,
            });
        }
    }

    Ok(applied_records)
}

pub fn get_applied_migrations(conn: &Connection) -> Result<Vec<MigrationRecord>> {
    let mut stmt = conn.prepare("SELECT version, name, applied_at, checksum, execution_time_ms FROM schema_metadata ORDER BY version ASC")?;
    let rows = stmt.query_map([], |row| {
        Ok(MigrationRecord {
            version: row.get(0)?,
            name: row.get(1)?,
            applied_at: row.get(2)?,
            checksum: row.get(3)?,
            execution_time_ms: row.get(4)?,
        })
    })?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r?);
    }
    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_execution_and_idempotency() {
        let mut conn = Connection::open_in_memory().unwrap();
        let first_run = run_migrations(&mut conn).unwrap();
        assert_eq!(first_run.len(), 5);

        let second_run = run_migrations(&mut conn).unwrap();
        assert_eq!(second_run.len(), 0);

        let all = get_applied_migrations(&conn).unwrap();
        assert_eq!(all.len(), 5);
        assert_eq!(all[0].name, "001_init_schema_metadata");
        assert_eq!(all[3].name, "004_create_performance_indexes");
        assert_eq!(all[4].name, "005_add_focus_distractions");
    }
}
