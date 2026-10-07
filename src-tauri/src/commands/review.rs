use tauri::State;
use serde::Deserialize;

use crate::commands::CommandError;
use crate::domain::review::{
    compute_review_stats, generate_review_narrative, ReviewDraftDto, ReviewRecordDto,
};
use crate::infrastructure::database::Database;

#[derive(Debug, Deserialize)]
pub struct GenerateReviewDraftParams {
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveReviewRecordParams {
    pub id: Option<String>,
    pub start_date: String,
    pub end_date: String,
    pub narrative: String,
    pub stats_json: String,
    pub status: String, // "draft" | "confirmed"
}

#[tauri::command]
pub fn generate_review_draft(
    db: State<'_, Database>,
    params: GenerateReviewDraftParams,
) -> Result<ReviewDraftDto, CommandError> {
    let entries = db
        .get_entries_by_date_range(&params.start_date, &params.end_date)
        .map_err(|e| CommandError {
            code: "REVIEW_ENTRIES_FETCH_FAILED".to_string(),
            message: e.to_string(),
        })?;

    let stats = compute_review_stats(&entries);
    let (narrative, citations) = generate_review_narrative(&params.start_date, &params.end_date, &stats);

    Ok(ReviewDraftDto {
        start_date: params.start_date,
        end_date: params.end_date,
        stats,
        narrative,
        citations,
    })
}

#[tauri::command]
pub fn save_review_record(
    db: State<'_, Database>,
    params: SaveReviewRecordParams,
) -> Result<ReviewRecordDto, CommandError> {
    db.save_review(
        params.id.as_deref(),
        &params.start_date,
        &params.end_date,
        &params.narrative,
        &params.stats_json,
        &params.status,
    )
    .map_err(|e| CommandError {
        code: "REVIEW_SAVE_FAILED".to_string(),
        message: e.to_string(),
    })
}

#[tauri::command]
pub fn list_reviews(db: State<'_, Database>) -> Result<Vec<ReviewRecordDto>, CommandError> {
    db.list_reviews().map_err(|e| CommandError {
        code: "REVIEW_LIST_FAILED".to_string(),
        message: e.to_string(),
    })
}
