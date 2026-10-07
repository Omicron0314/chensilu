use std::fs::File;
use std::io::Write;
use std::path::Path;
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::domain::errors::DomainError;
use crate::domain::models::Entry;
use crate::domain::review::ReviewRecordDto;
use crate::infrastructure::database::Database;

#[derive(Serialize, Deserialize)]
pub struct FullExportPackage {
    pub schema_version: String,
    pub exported_at: String,
    pub app_version: String,
    pub entries_count: usize,
    pub reviews_count: usize,
    pub entries: Vec<Entry>,
    pub reviews: Vec<ReviewRecordDto>,
}

pub struct ExportService;

impl ExportService {
    /// 导出全量 JSON 字符串
    pub fn build_json_export(db: &Database) -> Result<String, DomainError> {
        let entries = db.list_entries(10000, 0)?;
        let reviews = db.list_reviews()?;

        let package = FullExportPackage {
            schema_version: "1.0".to_string(),
            exported_at: Utc::now().to_rfc3339(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            entries_count: entries.len(),
            reviews_count: reviews.len(),
            entries,
            reviews,
        };

        serde_json::to_string_pretty(&package)
            .map_err(|e| DomainError::StorageError(format!("生成 JSON 导出失败: {}", e)))
    }

    /// 导出面向阅读的 Markdown 格式
    pub fn build_markdown_export(db: &Database) -> Result<String, DomainError> {
        let entries = db.list_entries(10000, 0)?;
        let reviews = db.list_reviews()?;

        let mut md = String::new();
        md.push_str("# 沉思路 · AI 日记与复盘本地数据导出\n\n");
        md.push_str(&format!("*导出时间：{}*\n\n", Utc::now().to_rfc3339()));

        md.push_str("## 一、 每日记录沉淀\n\n");
        if entries.is_empty() {
            md.push_str("（暂无日记记录）\n\n");
        } else {
            for e in &entries {
                md.push_str(&format!("### 日期：{}\n\n", e.date));
                if let Some(goal) = &e.goal {
                    md.push_str(&format!("- **关联目标**：{}\n", goal));
                }
                if let Some(status) = &e.status_category {
                    md.push_str(&format!("- **当日状态**：{}\n", status));
                }
                md.push_str("\n**【原始输入】**：\n");
                md.push_str(&format!(">{}\n\n", e.raw_content.replace('\n', "\n> ")));

                if !e.actions.is_empty() {
                    md.push_str("**【具体投入行动】**：\n");
                    for a in &e.actions {
                        let dur = match a.duration_minutes {
                            Some(m) => format!(" ({} 分钟)", m),
                            None => " (时长未知)".to_string(),
                        };
                        md.push_str(&format!("- {}{}\n", a.description, dur));
                    }
                    md.push('\n');
                }

                if !e.positive_facts.is_empty() {
                    md.push_str("**【正反馈事实】**：\n");
                    for f in &e.positive_facts {
                        md.push_str(&format!("- {} [{}]\n", f.fact, f.status.as_str()));
                    }
                    md.push('\n');
                }

                if let Some(refl) = &e.reflection {
                    md.push_str(&format!("**【反思】**：{}\n\n", refl));
                }

                md.push_str("---\n\n");
            }
        }

        md.push_str("## 二、 周期复盘归档\n\n");
        if reviews.is_empty() {
            md.push_str("（暂无复盘归档）\n\n");
        } else {
            for r in &reviews {
                md.push_str(&format!("### 周期：{} ~ {} [{}]\n\n", r.start_date, r.end_date, r.status));
                md.push_str(&format!("{}\n\n---\n\n", r.narrative));
            }
        }

        Ok(md)
    }

    /// 安全原子化落盘（先写临时文件再重命名）
    pub fn write_safely_to_file(content: &str, target_path: &Path) -> Result<(), DomainError> {
        if let Some(parent) = target_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                DomainError::StorageError(format!("创建目标目录失败: {}", e))
            })?;
        }

        let tmp_path = target_path.with_extension(format!("tmp_{}", Utc::now().timestamp_micros()));
        {
            let mut file = File::create(&tmp_path).map_err(|e| {
                DomainError::StorageError(format!("创建临时导出文件失败: {}", e))
            })?;
            file.write_all(content.as_bytes()).map_err(|e| {
                DomainError::StorageError(format!("写入临时导出文件失败: {}", e))
            })?;
            file.sync_all().map_err(|e| {
                DomainError::StorageError(format!("刷盘失败: {}", e))
            })?;
        }

        std::fs::rename(&tmp_path, target_path).map_err(|e| {
            DomainError::StorageError(format!("完成导出文件重命名失败: {}", e))
        })?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_json_and_markdown() {
        let db = Database::in_memory().unwrap();
        db.save_entry(
            None,
            "2026-10-07",
            "测试日记原文",
            Some("目标A"),
            Some("充实"),
            Some("反思心得"),
            &[],
            &[],
            None,
        ).unwrap();

        let json_str = ExportService::build_json_export(&db).unwrap();
        assert!(json_str.contains("2026-10-07"));
        assert!(json_str.contains("测试日记原文"));

        let md_str = ExportService::build_markdown_export(&db).unwrap();
        assert!(md_str.contains("沉思路 · AI 日记与复盘本地数据导出"));
        assert!(md_str.contains("测试日记原文"));
    }
}
