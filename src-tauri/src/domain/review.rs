use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::domain::models::{Entry, PositiveFactStatus};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalAggregationDto {
    pub goal_name: String,
    pub action_count: usize,
    pub known_duration_minutes: i64,
    pub unknown_duration_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewStatsDto {
    pub total_entries_count: usize,
    pub total_actions_count: usize,
    pub total_known_minutes: i64,
    pub unknown_duration_actions_count: usize,
    pub approximate_actions_count: usize,
    pub goals_breakdown: Vec<GoalAggregationDto>,
    pub confirmed_facts_count: usize,
    pub confirmed_facts: Vec<ReviewFactItemDto>,
    pub reflections_summary: Vec<ReviewReflectionItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewFactItemDto {
    pub fact_id: String,
    pub entry_id: String,
    pub date: String,
    pub fact: String,
    pub goal_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewReflectionItemDto {
    pub entry_id: String,
    pub date: String,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewCitationDto {
    pub entry_id: String,
    pub date: String,
    pub quote: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewDraftDto {
    pub start_date: String,
    pub end_date: String,
    pub stats: ReviewStatsDto,
    pub narrative: String,
    pub citations: Vec<ReviewCitationDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewRecordDto {
    pub id: String,
    pub start_date: String,
    pub end_date: String,
    pub narrative: String,
    pub stats: ReviewStatsDto,
    pub status: String, // "draft" | "confirmed" | "stale"
    pub created_at: String,
    pub updated_at: String,
}

/// 纯代码确定性聚合计算（严禁交由 LLM 加总）
pub fn compute_review_stats(entries: &[Entry]) -> ReviewStatsDto {
    let mut total_actions_count = 0;
    let mut total_known_minutes: i64 = 0;
    let mut unknown_duration_actions_count = 0;
    let mut approximate_actions_count = 0;

    let mut goals_map: HashMap<String, (usize, i64, usize)> = HashMap::new();
    let mut confirmed_facts = Vec::new();
    let mut reflections_summary = Vec::new();

    for entry in entries {
        // 行动聚合
        for action in &entry.actions {
            total_actions_count += 1;

            if let Some(m) = action.duration_minutes {
                total_known_minutes += m;
            } else {
                unknown_duration_actions_count += 1;
            }

            if action.is_approximate {
                approximate_actions_count += 1;
            }

            let goal_key = action.goal_ref.clone().unwrap_or_else(|| {
                entry.goal.clone().unwrap_or_else(|| "（未关联目标）".to_string())
            });

            let entry_stat = goals_map.entry(goal_key).or_insert((0, 0, 0));
            entry_stat.0 += 1; // action count
            if let Some(m) = action.duration_minutes {
                entry_stat.1 += m; // duration
            } else {
                entry_stat.2 += 1; // unknown count
            }
        }

        // 正反馈聚合（仅统计用户已确认的事实）
        for fact in &entry.positive_facts {
            if fact.status == PositiveFactStatus::Confirmed {
                confirmed_facts.push(ReviewFactItemDto {
                    fact_id: fact.id.clone(),
                    entry_id: entry.id.clone(),
                    date: entry.date.clone(),
                    fact: fact.fact.clone(),
                    goal_ref: fact.goal_ref.clone().or_else(|| entry.goal.clone()),
                });
            }
        }

        // 反思汇总
        if let Some(refl) = &entry.reflection {
            if !refl.trim().is_empty() {
                reflections_summary.push(ReviewReflectionItemDto {
                    entry_id: entry.id.clone(),
                    date: entry.date.clone(),
                    snippet: refl.trim().to_string(),
                });
            }
        }
    }

    let mut goals_breakdown: Vec<GoalAggregationDto> = goals_map
        .into_iter()
        .map(|(goal_name, (cnt, mins, unk))| GoalAggregationDto {
            goal_name,
            action_count: cnt,
            known_duration_minutes: mins,
            unknown_duration_count: unk,
        })
        .collect();
    goals_breakdown.sort_by(|a, b| b.known_duration_minutes.cmp(&a.known_duration_minutes));

    let confirmed_facts_count = confirmed_facts.len();

    ReviewStatsDto {
        total_entries_count: entries.len(),
        total_actions_count,
        total_known_minutes,
        unknown_duration_actions_count,
        approximate_actions_count,
        goals_breakdown,
        confirmed_facts_count,
        confirmed_facts,
        reflections_summary,
    }
}

/// 基于确定性统计生成 A 档初稿文本及引用链
pub fn generate_review_narrative(
    start_date: &str,
    end_date: &str,
    stats: &ReviewStatsDto,
) -> (String, Vec<ReviewCitationDto>) {
    if stats.total_entries_count == 0 {
        return (
            format!("在 {} 至 {} 区间内暂无记录数据，无法生成复盘内容。", start_date, end_date),
            Vec::new(),
        );
    }

    let mut narrative = format!(
        "### 本周成长复盘（{} ~ {}）\n\n",
        start_date, end_date
    );

    narrative.push_str(&format!(
        "**行动投入账本**：本周期内累计记录了 **{}** 篇日记、**{}** 项具体行动。总已知时间投入 **{}** 分钟",
        stats.total_entries_count, stats.total_actions_count, stats.total_known_minutes
    ));

    if stats.unknown_duration_actions_count > 0 {
        narrative.push_str(&format!(
            "（另有 {} 项行动未标记具体分钟数，不计入加总）",
            stats.unknown_duration_actions_count
        ));
    }
    narrative.push_str("。\n\n");

    if !stats.goals_breakdown.is_empty() {
        narrative.push_str("**目标投入分布**：\n");
        for g in &stats.goals_breakdown {
            narrative.push_str(&format!(
                "- **{}**：{} 项行动，已知投入约 {} 分钟\n",
                g.goal_name, g.action_count, g.known_duration_minutes
            ));
        }
        narrative.push('\n');
    }

    if stats.confirmed_facts_count > 0 {
        narrative.push_str(&format!(
            "**确认进展与正反馈（共 {} 项）**：\n",
            stats.confirmed_facts_count
        ));
        for f in &stats.confirmed_facts {
            narrative.push_str(&format!("- [{}] {}\n", f.date, f.fact));
        }
        narrative.push('\n');
    } else {
        narrative.push_str("**正反馈**：本周期暂未标记已确认的进展事实。\n\n");
    }

    if !stats.reflections_summary.is_empty() {
        narrative.push_str("**反思提炼**：\n");
        for r in &stats.reflections_summary {
            narrative.push_str(&format!("- [{}] {}\n", r.date, r.snippet));
        }
        narrative.push('\n');
    }

    narrative.push_str("💡 **启发与建议**：记录本身就是一种复利。下周继续聚焦于具体的微小行动，保持节奏即可。");

    let mut citations = Vec::new();
    for f in &stats.confirmed_facts {
        citations.push(ReviewCitationDto {
            entry_id: f.entry_id.clone(),
            date: f.date.clone(),
            quote: f.fact.clone(),
        });
    }

    (narrative, citations)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::models::{Action, PositiveFact};
    use chrono::Utc;

    #[test]
    fn test_compute_review_stats_exact_aggregation() {
        let entry1 = Entry {
            id: "e1".to_string(),
            date: "2026-10-01".to_string(),
            raw_content: "day1".to_string(),
            goal: Some("沉思路开发".to_string()),
            status_category: None,
            reflection: Some("理清了数据流".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 1,
            actions: vec![
                Action {
                    id: "a1".to_string(),
                    entry_id: "e1".to_string(),
                    description: "编写 SQLite 仓储".to_string(),
                    goal_ref: Some("沉思路开发".to_string()),
                    duration_minutes: Some(50),
                    is_approximate: false,
                    source_quote: None,
                },
                Action {
                    id: "a2".to_string(),
                    entry_id: "e1".to_string(),
                    description: "散步放空".to_string(),
                    goal_ref: None,
                    duration_minutes: None, // 未知时长
                    is_approximate: false,
                    source_quote: None,
                },
            ],
            positive_facts: vec![PositiveFact {
                id: "f1".to_string(),
                entry_id: "e1".to_string(),
                fact: "事务测试通过".to_string(),
                status: PositiveFactStatus::Confirmed,
                goal_ref: None,
                source_quote: None,
            }],
        };

        let entry2 = Entry {
            id: "e2".to_string(),
            date: "2026-10-02".to_string(),
            raw_content: "day2".to_string(),
            goal: Some("沉思路开发".to_string()),
            status_category: None,
            reflection: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 1,
            actions: vec![Action {
                id: "a3".to_string(),
                entry_id: "e2".to_string(),
                description: "完善周报聚合".to_string(),
                goal_ref: Some("沉思路开发".to_string()),
                duration_minutes: Some(40),
                is_approximate: true,
                source_quote: None,
            }],
            positive_facts: vec![PositiveFact {
                id: "f2".to_string(),
                entry_id: "e2".to_string(),
                fact: "未确认的事实".to_string(),
                status: PositiveFactStatus::Unconfirmed, // 未确认，不计入 confirmed
                goal_ref: None,
                source_quote: None,
            }],
        };

        let stats = compute_review_stats(&[entry1, entry2]);
        assert_eq!(stats.total_entries_count, 2);
        assert_eq!(stats.total_actions_count, 3);
        assert_eq!(stats.total_known_minutes, 90); // 50 + 40
        assert_eq!(stats.unknown_duration_actions_count, 1);
        assert_eq!(stats.approximate_actions_count, 1);
        assert_eq!(stats.confirmed_facts_count, 1); // 仅 f1
        assert_eq!(stats.reflections_summary.len(), 1);

        let (narrative, citations) = generate_review_narrative("2026-10-01", "2026-10-02", &stats);
        assert!(narrative.contains("90** 分钟"));
        assert!(narrative.contains("1 项行动未标记具体分钟数"));
        assert_eq!(citations.len(), 1);
    }
}
