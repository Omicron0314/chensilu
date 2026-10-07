use std::path::PathBuf;
use tauri::State;
use serde::{Deserialize, Serialize};

use crate::commands::CommandError;
use crate::domain::models::{Action, Draft, Entry, PositiveFact};
use crate::infrastructure::database::Database;

#[derive(Debug, Deserialize)]
pub struct SaveDraftParams {
    pub date: String,
    pub raw_content: String,
    pub draft_fields_json: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveEntryParams {
    pub id: Option<String>,
    pub date: String,
    pub raw_content: String,
    pub goal: Option<String>,
    pub status_category: Option<String>,
    pub reflection: Option<String>,
    pub actions: Vec<Action>,
    pub positive_facts: Vec<PositiveFact>,
    pub expected_version: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ListEntriesParams {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupResultDto {
    pub backup_path: String,
    pub success: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResultDto {
    pub file_path: String,
    pub format: String,
    pub content: String,
}

#[tauri::command]
pub fn save_draft(
    db: State<'_, Database>,
    params: SaveDraftParams,
) -> Result<Draft, CommandError> {
    db.save_draft(&params.date, &params.raw_content, params.draft_fields_json.as_deref())
        .map_err(|e| CommandError {
            code: "DRAFT_SAVE_FAILED".to_string(),
            message: e.to_string(),
        })
}

#[tauri::command]
pub fn get_draft(
    db: State<'_, Database>,
    date: String,
) -> Result<Option<Draft>, CommandError> {
    db.get_draft(&date)
        .map_err(|e| CommandError {
            code: "DRAFT_FETCH_FAILED".to_string(),
            message: e.to_string(),
        })
}

#[tauri::command]
pub fn clear_draft(
    db: State<'_, Database>,
    date: String,
) -> Result<(), CommandError> {
    db.clear_draft(&date)
        .map_err(|e| CommandError {
            code: "DRAFT_CLEAR_FAILED".to_string(),
            message: e.to_string(),
        })
}

#[tauri::command]
pub fn save_entry(
    db: State<'_, Database>,
    params: SaveEntryParams,
) -> Result<Entry, CommandError> {
    db.save_entry(
        params.id.as_deref(),
        &params.date,
        &params.raw_content,
        params.goal.as_deref(),
        params.status_category.as_deref(),
        params.reflection.as_deref(),
        &params.actions,
        &params.positive_facts,
        params.expected_version,
    )
    .map_err(|e| CommandError {
        code: "ENTRY_SAVE_FAILED".to_string(),
        message: e.to_string(),
    })
}

#[tauri::command]
pub fn get_entry(
    db: State<'_, Database>,
    id: String,
) -> Result<Option<Entry>, CommandError> {
    db.get_entry_by_id(&id)
        .map_err(|e| CommandError {
            code: "ENTRY_FETCH_FAILED".to_string(),
            message: e.to_string(),
        })
}

#[tauri::command]
pub fn list_entries(
    db: State<'_, Database>,
    params: ListEntriesParams,
) -> Result<Vec<Entry>, CommandError> {
    let limit = params.limit.unwrap_or(50);
    let offset = params.offset.unwrap_or(0);
    db.list_entries(limit, offset)
        .map_err(|e| CommandError {
            code: "ENTRY_LIST_FAILED".to_string(),
            message: e.to_string(),
        })
}

#[tauri::command]
pub fn delete_entry(
    db: State<'_, Database>,
    id: String,
) -> Result<bool, CommandError> {
    db.delete_entry(&id)
        .map_err(|e| CommandError {
            code: "ENTRY_DELETE_FAILED".to_string(),
            message: e.to_string(),
        })
}

#[tauri::command]
pub fn backup_database(
    db: State<'_, Database>,
    backup_file_path: Option<String>,
) -> Result<BackupResultDto, CommandError> {
    let target_path = match backup_file_path {
        Some(p) => PathBuf::from(p),
        None => {
            let backup_dir = dirs::data_local_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("chensilu")
                .join("backups");
            let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
            backup_dir.join(format!("chensilu_backup_{}.sqlite", timestamp))
        }
    };

    db.backup_to(&target_path).map_err(|e| CommandError {
        code: "BACKUP_FAILED".to_string(),
        message: e.to_string(),
    })?;

    Ok(BackupResultDto {
        backup_path: target_path.to_string_lossy().to_string(),
        success: true,
    })
}

#[tauri::command]
pub fn restore_database(
    db: State<'_, Database>,
    backup_file_path: String,
) -> Result<bool, CommandError> {
    let path = PathBuf::from(backup_file_path);
    db.restore_from(&path).map_err(|e| CommandError {
        code: "RESTORE_FAILED".to_string(),
        message: e.to_string(),
    })?;

    Ok(true)
}

#[tauri::command]
pub fn export_data(
    db: State<'_, Database>,
    format: String,
) -> Result<ExportResultDto, CommandError> {
    use crate::infrastructure::files::export::ExportService;

    let (content, ext) = if format == "markdown" {
        (
            ExportService::build_markdown_export(&db).map_err(|e| CommandError {
                code: "EXPORT_FAILED".to_string(),
                message: e.to_string(),
            })?,
            "md",
        )
    } else {
        (
            ExportService::build_json_export(&db).map_err(|e| CommandError {
                code: "EXPORT_FAILED".to_string(),
                message: e.to_string(),
            })?,
            "json",
        )
    };

    let export_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("chensilu")
        .join("exports");
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let target_path = export_dir.join(format!("chensilu_export_{}.{}", timestamp, ext));

    ExportService::write_safely_to_file(&content, &target_path).map_err(|e| CommandError {
        code: "EXPORT_WRITE_FAILED".to_string(),
        message: e.to_string(),
    })?;

    Ok(ExportResultDto {
        file_path: target_path.to_string_lossy().to_string(),
        format,
        content,
    })
}

#[tauri::command]
pub fn clear_all_data(db: State<'_, Database>) -> Result<bool, CommandError> {
    db.clear_all_data().map_err(|e| CommandError {
        code: "CLEAR_FAILED".to_string(),
        message: e.to_string(),
    })?;
    Ok(true)
}
