use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use crate::domain::errors::DomainError;
use crate::domain::models::{Action, Draft, Entry, PositiveFact, PositiveFactStatus};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
    db_path: Option<PathBuf>,
}

impl Database {
    /// 基于指定文件路径打开或创建数据库，并自动执行版本迁移
    pub fn new(db_path: PathBuf) -> Result<Self, DomainError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                DomainError::StorageError(format!("创建数据目录失败: {}", e))
            })?;
        }

        let mut conn = Connection::open(&db_path)?;
        Self::configure_connection(&mut conn)?;
        Self::apply_migrations(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: Some(db_path),
        })
    }

    /// 创建纯内存数据库（用于单元测试）
    pub fn in_memory() -> Result<Self, DomainError> {
        let mut conn = Connection::open_in_memory()?;
        Self::configure_connection(&mut conn)?;
        Self::apply_migrations(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: None,
        })
    }

    pub fn db_path(&self) -> Option<&Path> {
        self.db_path.as_deref()
    }

    fn configure_connection(conn: &mut Connection) -> Result<(), DomainError> {
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;",
        )?;
        Ok(())
    }

    fn apply_migrations(conn: &mut Connection) -> Result<(), DomainError> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );",
        )?;

        let current_version: i64 = conn.query_row(
            "SELECT COALESAL(MAX(version), 0) FROM schema_migrations;",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        if current_version < 1 {
            let tx = conn.transaction()?;
            tx.execute_batch(
                "CREATE TABLE drafts (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL UNIQUE,
                    raw_content TEXT NOT NULL,
                    draft_fields_json TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE entries (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    raw_content TEXT NOT NULL,
                    goal TEXT,
                    status_category TEXT,
                    reflection TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1
                );
                CREATE INDEX idx_entries_date ON entries(date);

                CREATE TABLE actions (
                    id TEXT PRIMARY KEY,
                    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
                    description TEXT NOT NULL,
                    goal_ref TEXT,
                    duration_minutes INTEGER,
                    is_approximate BOOLEAN NOT NULL DEFAULT 0,
                    source_quote TEXT
                );
                CREATE INDEX idx_actions_entry_id ON actions(entry_id);

                CREATE TABLE positive_facts (
                    id TEXT PRIMARY KEY,
                    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
                    fact TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('unconfirmed', 'confirmed', 'skipped', 'none')),
                    goal_ref TEXT,
                    source_quote TEXT
                );
                CREATE INDEX idx_positive_facts_entry_id ON positive_facts(entry_id);

                INSERT INTO schema_migrations (version, applied_at)
                VALUES (1, datetime('now'));"
            )?;
            tx.commit()?;
        }

        if current_version < 2 {
            let tx = conn.transaction()?;
            tx.execute_batch(
                "CREATE TABLE reviews (
                    id TEXT PRIMARY KEY,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    narrative TEXT NOT NULL,
                    stats_json TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('draft', 'confirmed', 'stale')),
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX idx_reviews_dates ON reviews(start_date, end_date);

                INSERT INTO schema_migrations (version, applied_at)
                VALUES (2, datetime('now'));"
            )?;
            tx.commit()?;
        }

        Ok(())
    }

    // ================= Draft 接口 =================

    pub fn save_draft(
        &self,
        date: &str,
        raw_content: &str,
        draft_fields_json: Option<&str>,
    ) -> Result<Draft, DomainError> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let existing_id: Option<String> = conn
            .query_row(
                "SELECT id FROM drafts WHERE date = ?1",
                params![date],
                |row| row.get(0),
            )
            .optional()?;

        let draft_id = existing_id.unwrap_or_else(|| Uuid::new_v4().to_string());

        conn.execute(
            "INSERT INTO drafts (id, date, raw_content, draft_fields_json, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(date) DO UPDATE SET
                raw_content = excluded.raw_content,
                draft_fields_json = excluded.draft_fields_json,
                updated_at = excluded.updated_at;",
            params![draft_id, date, raw_content, draft_fields_json, now_str],
        )?;

        Ok(Draft {
            id: draft_id,
            date: date.to_string(),
            raw_content: raw_content.to_string(),
            draft_fields_json: draft_fields_json.map(|s| s.to_string()),
            updated_at: now,
        })
    }

    pub fn get_draft(&self, date: &str) -> Result<Option<Draft>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let draft = conn
            .query_row(
                "SELECT id, date, raw_content, draft_fields_json, updated_at
                 FROM drafts WHERE date = ?1",
                params![date],
                |row| {
                    let updated_str: String = row.get(4)?;
                    let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());

                    Ok(Draft {
                        id: row.get(0)?,
                        date: row.get(1)?,
                        raw_content: row.get(2)?,
                        draft_fields_json: row.get(3)?,
                        updated_at,
                    })
                },
            )
            .optional()?;

        Ok(draft)
    }

    pub fn clear_draft(&self, date: &str) -> Result<(), DomainError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM drafts WHERE date = ?1", params![date])?;
        Ok(())
    }

    pub fn clear_all_data(&self) -> Result<(), DomainError> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM actions", [])?;
        tx.execute("DELETE FROM positive_facts", [])?;
        tx.execute("DELETE FROM entries", [])?;
        tx.execute("DELETE FROM drafts", [])?;
        tx.execute("DELETE FROM reviews", [])?;
        tx.commit()?;

        // 回收释放空间
        conn.execute("VACUUM", [])?;
        Ok(())
    }

    // ================= Entry 接口 =================

    pub fn save_entry(
        &self,
        id: Option<&str>,
        date: &str,
        raw_content: &str,
        goal: Option<&str>,
        status_category: Option<&str>,
        reflection: Option<&str>,
        actions: &[Action],
        positive_facts: &[PositiveFact],
        expected_version: Option<i64>,
    ) -> Result<Entry, DomainError> {
        let mut conn = self.conn.lock().unwrap();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let tx = conn.transaction()?;

        let (entry_id, new_version, created_at) = match id {
            Some(existing_id) => {
                let current_info: Option<(i64, String)> = tx
                    .query_row(
                        "SELECT version, created_at FROM entries WHERE id = ?1",
                        params![existing_id],
                        |row| Ok((row.get(0)?, row.get(1)?)),
                    )
                    .optional()?;

                match current_info {
                    Some((current_ver, created_str)) => {
                        if let Some(exp) = expected_version {
                            if exp != current_ver {
                                return Err(DomainError::VersionConflict {
                                    current: current_ver,
                                    expected: exp,
                                });
                            }
                        }
                        let next_ver = current_ver + 1;
                        tx.execute(
                            "UPDATE entries
                             SET date = ?1, raw_content = ?2, goal = ?3, status_category = ?4,
                                 reflection = ?5, updated_at = ?6, version = ?7
                             WHERE id = ?8",
                            params![
                                date,
                                raw_content,
                                goal,
                                status_category,
                                reflection,
                                now_str,
                                next_ver,
                                existing_id
                            ],
                        )?;

                        let created = DateTime::parse_from_rfc3339(&created_str)
                            .map(|dt| dt.with_timezone(&Utc))
                            .unwrap_or(now);

                        (existing_id.to_string(), next_ver, created)
                    }
                    None => {
                        return Err(DomainError::NotFound(format!("记录不存在: {}", existing_id)));
                    }
                }
            }
            None => {
                let new_id = Uuid::new_v4().to_string();
                let version = 1;
                tx.execute(
                    "INSERT INTO entries (id, date, raw_content, goal, status_category, reflection, created_at, updated_at, version)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![
                        new_id,
                        date,
                        raw_content,
                        goal,
                        status_category,
                        reflection,
                        now_str,
                        now_str,
                        version
                    ],
                )?;
                (new_id, version, now)
            }
        };

        // 重新写入关联 actions 和 positive facts（先清理原有关联项）
        tx.execute("DELETE FROM actions WHERE entry_id = ?1", params![entry_id])?;
        for action in actions {
            let action_id = if action.id.is_empty() {
                Uuid::new_v4().to_string()
            } else {
                action.id.clone()
            };

            tx.execute(
                "INSERT INTO actions (id, entry_id, description, goal_ref, duration_minutes, is_approximate, source_quote)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    action_id,
                    entry_id,
                    action.description,
                    action.goal_ref,
                    action.duration_minutes,
                    action.is_approximate,
                    action.source_quote
                ],
            )?;
        }

        tx.execute("DELETE FROM positive_facts WHERE entry_id = ?1", params![entry_id])?;
        for fact in positive_facts {
            let fact_id = if fact.id.is_empty() {
                Uuid::new_v4().to_string()
            } else {
                fact.id.clone()
            };

            tx.execute(
                "INSERT INTO positive_facts (id, entry_id, fact, status, goal_ref, source_quote)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    fact_id,
                    entry_id,
                    fact.fact,
                    fact.status.as_str(),
                    fact.goal_ref,
                    fact.source_quote
                ],
            )?;
        }

        // 自动清除当天的活动草稿（已正式入库）
        tx.execute("DELETE FROM drafts WHERE date = ?1", params![date])?;

        // 标记涉及该日期的复盘为过期 (stale)
        tx.execute(
            "UPDATE reviews SET status = 'stale', updated_at = ?1
             WHERE start_date <= ?2 AND end_date >= ?2 AND status = 'confirmed'",
            params![now_str, date],
        )?;

        tx.commit()?;

        // 返回完整聚合对象
        let saved_actions = self.fetch_actions(&conn, &entry_id)?;
        let saved_facts = self.fetch_positive_facts(&conn, &entry_id)?;

        Ok(Entry {
            id: entry_id,
            date: date.to_string(),
            raw_content: raw_content.to_string(),
            goal: goal.map(|s| s.to_string()),
            status_category: status_category.map(|s| s.to_string()),
            reflection: reflection.map(|s| s.to_string()),
            created_at,
            updated_at: now,
            version: new_version,
            actions: saved_actions,
            positive_facts: saved_facts,
        })
    }

    pub fn get_entry_by_id(&self, id: &str) -> Result<Option<Entry>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let base_entry = conn
            .query_row(
                "SELECT id, date, raw_content, goal, status_category, reflection, created_at, updated_at, version
                 FROM entries WHERE id = ?1",
                params![id],
                |row| {
                    let created_str: String = row.get(6)?;
                    let updated_str: String = row.get(7)?;
                    let created_at = DateTime::parse_from_rfc3339(&created_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());
                    let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now());

                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<String>>(5)?,
                        created_at,
                        updated_at,
                        row.get::<_, i64>(8)?,
                    ))
                },
            )
            .optional()?;

        match base_entry {
            Some((id, date, raw, goal, status, refld, created_at, updated_at, version)) => {
                let actions = self.fetch_actions(&conn, &id)?;
                let positive_facts = self.fetch_positive_facts(&conn, &id)?;

                Ok(Some(Entry {
                    id,
                    date,
                    raw_content: raw,
                    goal,
                    status_category: status,
                    reflection: refld,
                    created_at,
                    updated_at,
                    version,
                    actions,
                    positive_facts,
                }))
            }
            None => Ok(None),
        }
    }

    pub fn list_entries(&self, limit: u32, offset: u32) -> Result<Vec<Entry>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, date, raw_content, goal, status_category, reflection, created_at, updated_at, version
             FROM entries
             ORDER BY date DESC, created_at DESC
             LIMIT ?1 OFFSET ?2",
        )?;

        let entry_rows = stmt.query_map(params![limit, offset], |row| {
            let created_str: String = row.get(6)?;
            let updated_str: String = row.get(7)?;
            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                created_at,
                updated_at,
                row.get::<_, i64>(8)?,
            ))
        })?;

        let mut entries = Vec::new();
        for r in entry_rows {
            let (id, date, raw, goal, status, refld, created_at, updated_at, version) = r?;
            let actions = self.fetch_actions(&conn, &id)?;
            let positive_facts = self.fetch_positive_facts(&conn, &id)?;

            entries.push(Entry {
                id,
                date,
                raw_content: raw,
                goal,
                status_category: status,
                reflection: refld,
                created_at,
                updated_at,
                version,
                actions,
                positive_facts,
            });
        }

        Ok(entries)
    }

    pub fn delete_entry(&self, id: &str) -> Result<bool, DomainError> {
        let conn = self.conn.lock().unwrap();
        let date_opt: Option<String> = conn
            .query_row("SELECT date FROM entries WHERE id = ?1", params![id], |r| r.get(0))
            .optional()?;

        let rows_affected = conn.execute("DELETE FROM entries WHERE id = ?1", params![id])?;

        if let Some(date) = date_opt {
            let now_str = Utc::now().to_rfc3339();
            let _ = conn.execute(
                "UPDATE reviews SET status = 'stale', updated_at = ?1
                 WHERE start_date <= ?2 AND end_date >= ?2 AND status = 'confirmed'",
                params![now_str, date],
            );
        }

        Ok(rows_affected > 0)
    }

    pub fn get_entries_by_date_range(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<Entry>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, date, raw_content, goal, status_category, reflection, created_at, updated_at, version
             FROM entries
             WHERE date >= ?1 AND date <= ?2
             ORDER BY date ASC, created_at ASC",
        )?;

        let entry_rows = stmt.query_map(params![start_date, end_date], |row| {
            let created_str: String = row.get(6)?;
            let updated_str: String = row.get(7)?;
            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                created_at,
                updated_at,
                row.get::<_, i64>(8)?,
            ))
        })?;

        let mut entries = Vec::new();
        for r in entry_rows {
            let (id, date, raw, goal, status, refld, created_at, updated_at, version) = r?;
            let actions = self.fetch_actions(&conn, &id)?;
            let positive_facts = self.fetch_positive_facts(&conn, &id)?;

            entries.push(Entry {
                id,
                date,
                raw_content: raw,
                goal,
                status_category: status,
                reflection: refld,
                created_at,
                updated_at,
                version,
                actions,
                positive_facts,
            });
        }

        Ok(entries)
    }

    // ================= Review 接口 =================

    pub fn save_review(
        &self,
        id: Option<&str>,
        start_date: &str,
        end_date: &str,
        narrative: &str,
        stats_json: &str,
        status: &str,
    ) -> Result<crate::domain::review::ReviewRecordDto, DomainError> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();
        let review_id = id.map(|s| s.to_string()).unwrap_or_else(|| Uuid::new_v4().to_string());

        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM reviews WHERE id = ?1)",
                params![review_id],
                |r| r.get(0),
            )
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE reviews
                 SET start_date = ?1, end_date = ?2, narrative = ?3, stats_json = ?4, status = ?5, updated_at = ?6
                 WHERE id = ?7",
                params![start_date, end_date, narrative, stats_json, status, now, review_id],
            )?;
        } else {
            conn.execute(
                "INSERT INTO reviews (id, start_date, end_date, narrative, stats_json, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![review_id, start_date, end_date, narrative, stats_json, status, now, now],
            )?;
        }

        let parsed_stats: crate::domain::review::ReviewStatsDto = serde_json::from_str(stats_json)
            .map_err(|e| DomainError::ValidationError(format!("stats_json 解析失败: {}", e)))?;

        Ok(crate::domain::review::ReviewRecordDto {
            id: review_id,
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
            narrative: narrative.to_string(),
            stats: parsed_stats,
            status: status.to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_reviews(&self) -> Result<Vec<crate::domain::review::ReviewRecordDto>, DomainError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, start_date, end_date, narrative, stats_json, status, created_at, updated_at
             FROM reviews ORDER BY end_date DESC, created_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let stats_json: String = row.get(4)?;
            let parsed_stats = serde_json::from_str(&stats_json).unwrap_or(crate::domain::review::ReviewStatsDto {
                total_entries_count: 0,
                total_actions_count: 0,
                total_known_minutes: 0,
                unknown_duration_actions_count: 0,
                approximate_actions_count: 0,
                goals_breakdown: vec![],
                confirmed_facts_count: 0,
                confirmed_facts: vec![],
                reflections_summary: vec![],
            });

            Ok(crate::domain::review::ReviewRecordDto {
                id: row.get(0)?,
                start_date: row.get(1)?,
                end_date: row.get(2)?,
                narrative: row.get(3)?,
                stats: parsed_stats,
                status: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    fn fetch_actions(&self, conn: &Connection, entry_id: &str) -> Result<Vec<Action>, DomainError> {
        let mut stmt = conn.prepare(
            "SELECT id, entry_id, description, goal_ref, duration_minutes, is_approximate, source_quote
             FROM actions WHERE entry_id = ?1",
        )?;

        let rows = stmt.query_map(params![entry_id], |row| {
            Ok(Action {
                id: row.get(0)?,
                entry_id: row.get(1)?,
                description: row.get(2)?,
                goal_ref: row.get(3)?,
                duration_minutes: row.get(4)?,
                is_approximate: row.get(5)?,
                source_quote: row.get(6)?,
            })
        })?;

        let mut actions = Vec::new();
        for a in rows {
            actions.push(a?);
        }
        Ok(actions)
    }

    fn fetch_positive_facts(&self, conn: &Connection, entry_id: &str) -> Result<Vec<PositiveFact>, DomainError> {
        let mut stmt = conn.prepare(
            "SELECT id, entry_id, fact, status, goal_ref, source_quote
             FROM positive_facts WHERE entry_id = ?1",
        )?;

        let rows = stmt.query_map(params![entry_id], |row| {
            let status_str: String = row.get(3)?;
            let status = PositiveFactStatus::from_str(&status_str)
                .unwrap_or(PositiveFactStatus::Unconfirmed);

            Ok(PositiveFact {
                id: row.get(0)?,
                entry_id: row.get(1)?,
                fact: row.get(2)?,
                status,
                goal_ref: row.get(4)?,
                source_quote: row.get(5)?,
            })
        })?;

        let mut facts = Vec::new();
        for f in rows {
            facts.push(f?);
        }
        Ok(facts)
    }

    // ================= 数据库快照备份与恢复 =================

    /// 在线无损快照备份到指定路径
    pub fn backup_to(&self, backup_path: &Path) -> Result<(), DomainError> {
        if let Some(parent) = backup_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                DomainError::StorageError(format!("创建备份目录失败: {}", e))
            })?;
        }

        let src_conn = self.conn.lock().unwrap();
        let mut dst_conn = Connection::open(backup_path)?;

        {
            let backup = rusqlite::backup::Backup::new(&src_conn, &mut dst_conn)?;
            backup.run_to_completion(100, std::time::Duration::from_millis(50), None)?;
        }

        // 校验备份完整性
        let integrity: String = dst_conn.query_row("PRAGMA integrity_check;", [], |r| r.get(0))?;
        if integrity != "ok" {
            let _ = std::fs::remove_file(backup_path);
            return Err(DomainError::StorageError(format!("备份完整性校验失败: {}", integrity)));
        }

        Ok(())
    }

    /// 从备份文件恢复数据库（先校验完整性，再安全覆盖）
    pub fn restore_from(&self, backup_path: &Path) -> Result<(), DomainError> {
        if !backup_path.exists() {
            return Err(DomainError::NotFound(format!("备份文件不存在: {:?}", backup_path)));
        }

        // 1. 验证源备份文件的有效性
        let src_conn = Connection::open(backup_path)?;
        let integrity: String = src_conn.query_row("PRAGMA integrity_check;", [], |r| r.get(0))?;
        if integrity != "ok" {
            return Err(DomainError::StorageError(format!("源备份文件损坏: {}", integrity)));
        }

        // 2. 将备份内容恢复进当前活动数据库
        let mut dst_conn = self.conn.lock().unwrap();
        {
            let backup = rusqlite::backup::Backup::new(&src_conn, &mut dst_conn)?;
            backup.run_to_completion(100, std::time::Duration::from_millis(50), None)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_draft_save_and_retrieve_and_clear() {
        let db = Database::in_memory().unwrap();
        let date = "2026-10-07";

        assert!(db.get_draft(date).unwrap().is_none());

        let draft = db.save_draft(date, "今天阅读了《思考，快与慢》30分钟", None).unwrap();
        assert_eq!(draft.raw_content, "今天阅读了《思考，快与慢》30分钟");

        let fetched = db.get_draft(date).unwrap().expect("should exist");
        assert_eq!(fetched.raw_content, "今天阅读了《思考，快与慢》30分钟");

        // 更新同一天的草稿
        db.save_draft(date, "更新：实际阅读了45分钟", None).unwrap();
        let updated = db.get_draft(date).unwrap().expect("should exist");
        assert_eq!(updated.raw_content, "更新：实际阅读了45分钟");

        // 清除草稿
        db.clear_draft(date).unwrap();
        assert!(db.get_draft(date).unwrap().is_none());
    }

    #[test]
    fn test_entry_save_with_duration_null_and_version_conflict() {
        let db = Database::in_memory().unwrap();
        let date = "2026-10-07";

        let actions = vec![
            Action {
                id: "".to_string(),
                entry_id: "".to_string(),
                description: "散步与思考".to_string(),
                goal_ref: None,
                duration_minutes: None, // 明确为 None，不自动填 0
                is_approximate: false,
                source_quote: Some("散步放空".to_string()),
            },
            Action {
                id: "".to_string(),
                entry_id: "".to_string(),
                description: "算法刷题".to_string(),
                goal_ref: Some("提升编程能力".to_string()),
                duration_minutes: Some(40),
                is_approximate: true,
                source_quote: None,
            },
        ];

        let facts = vec![
            PositiveFact {
                id: "".to_string(),
                entry_id: "".to_string(),
                fact: "解出了一道动态规划中等题".to_string(),
                status: PositiveFactStatus::Confirmed,
                goal_ref: Some("提升编程能力".to_string()),
                source_quote: None,
            },
            PositiveFact {
                id: "".to_string(),
                entry_id: "".to_string(),
                fact: "未定事实".to_string(),
                status: PositiveFactStatus::None, // 明确没有
                goal_ref: None,
                source_quote: None,
            },
        ];

        let entry = db.save_entry(
            None,
            date,
            "今天下午散步放空，晚上做了一道算法题，耗时约40分钟。",
            Some("提升编程能力"),
            Some("状态充实"),
            Some("慢下来反而思路更清晰。"),
            &actions,
            &facts,
            None,
        ).unwrap();

        assert_eq!(entry.version, 1);
        assert_eq!(entry.actions.len(), 2);
        assert_eq!(entry.actions[0].duration_minutes, None); // 校验未知时长保持 None
        assert_eq!(entry.actions[1].duration_minutes, Some(40));
        assert_eq!(entry.positive_facts[1].status, PositiveFactStatus::None);

        // 测试版本冲突：提交错误的期望版本
        let conflict_res = db.save_entry(
            Some(&entry.id),
            date,
            "修改内容",
            None,
            None,
            None,
            &[],
            &[],
            Some(999), // 错误的期望版本
        );

        match conflict_res {
            Err(DomainError::VersionConflict { current, expected }) => {
                assert_eq!(current, 1);
                assert_eq!(expected, 999);
            }
            _ => panic!("应当发生版本冲突"),
        }

        // 正常版本更新
        let updated_entry = db.save_entry(
            Some(&entry.id),
            date,
            "修改后的原始内容",
            None,
            None,
            None,
            &[],
            &[],
            Some(1),
        ).unwrap();
        assert_eq!(updated_entry.version, 2);
        assert_eq!(updated_entry.raw_content, "修改后的原始内容");
    }

    #[test]
    fn test_backup_and_restore() {
        let tmp_dir = tempfile::tempdir().unwrap();
        let db_path = tmp_dir.path().join("chensilu.db");
        let backup_path = tmp_dir.path().join("backup.sqlite");

        let db = Database::new(db_path.clone()).unwrap();
        db.save_draft("2026-10-07", "备份前的草稿", None).unwrap();

        // 备份
        db.backup_to(&backup_path).unwrap();
        assert!(backup_path.exists());

        // 清空草稿
        db.clear_draft("2026-10-07").unwrap();
        assert!(db.get_draft("2026-10-07").unwrap().is_none());

        // 恢复
        db.restore_from(&backup_path).unwrap();
        let restored_draft = db.get_draft("2026-10-07").unwrap().expect("草稿应恢复");
        assert_eq!(restored_draft.raw_content, "备份前的草稿");
    }
}
