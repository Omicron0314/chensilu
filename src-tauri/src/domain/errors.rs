use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("数据未找到: {0}")]
    NotFound(String),

    #[error("版本冲突: 当前版本为 {current}，提交版本为 {expected}")]
    VersionConflict { current: i64, expected: i64 },

    #[error("数据校验失败: {0}")]
    ValidationError(String),

    #[error("存储操作失败: {0}")]
    StorageError(String),
}

impl From<rusqlite::Error> for DomainError {
    fn from(err: rusqlite::Error) -> Self {
        DomainError::StorageError(err.to_string())
    }
}
