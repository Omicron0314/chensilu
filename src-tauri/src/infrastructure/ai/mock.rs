use crate::domain::ai::{
    AiTone, ChatMessage, ExtractedActionDraft, ExtractedDraftResult, ExtractedPositiveFactDraft,
    GuidedTurnResult,
};

#[derive(Clone)]
pub struct MockAiProvider;

impl MockAiProvider {
    pub fn new() -> Self {
        Self
    }

    /// 对话引导：先复述一句，再单点提问；2-3 轮给出结束信号
    pub fn handle_guided_turn(
        &self,
        history: &[ChatMessage],
        tone: &AiTone,
    ) -> GuidedTurnResult {
        let last_user_msg = history
            .iter()
            .rev()
            .find(|m| m.role == "user")
            .map(|m| m.content.trim())
            .unwrap_or("");

        // 1. 处理“不想写/休息”场景
        if last_user_msg.contains("不想写")
            || last_user_msg.contains("好累")
            || last_user_msg.contains("休息")
            || last_user_msg.contains("跳过")
        {
            return GuidedTurnResult {
                reply: match tone {
                    AiTone::Gentle => "收到啦，今天就安心休息吧！成长允许停顿，今天不写日记也很棒。随时可以关闭应用放松一下～".to_string(),
                    AiTone::Direct => "明白。今天停止记录，好好休息。".to_string(),
                },
                should_wrap_up: true,
                is_rest_day: true,
            };
        }

        let user_turn_count = history.iter().filter(|m| m.role == "user").count();

        // 2. 轮次达到 2 轮或更多，准备收尾
        if user_turn_count >= 2 {
            let reply = match tone {
                AiTone::Gentle => format!(
                    "听起来今天的投入很有节奏。你提到了「{}」，这些具体行动我们已经捕捉到了。你觉得今天还有什么特别想记录的亮点吗？或者我们可以直接整理成五栏沉淀啦。",
                    Self::truncate_snippet(last_user_msg, 24)
                ),
                AiTone::Direct => format!(
                    "已记录：「{}」。信息已足够，可随时点击下方按钮生成五栏草稿并保存。",
                    Self::truncate_snippet(last_user_msg, 24)
                ),
            };

            return GuidedTurnResult {
                reply,
                should_wrap_up: true,
                is_rest_day: false,
            };
        }

        // 3. 第 1 轮：先复述一句，再问一个具体单点问题（围绕时长或具体进展）
        let reply = match tone {
            AiTone::Gentle => format!(
                "今天你主要在进行「{}」。大概花了多少时间呢？（随口给个大概数字即可，不确定也可以留空哦）",
                Self::truncate_snippet(last_user_msg, 30)
            ),
            AiTone::Direct => format!(
                "已捕捉到事件：「{}」。今天在这项行动上大概投入了多久？",
                Self::truncate_snippet(last_user_msg, 30)
            ),
        };

        GuidedTurnResult {
            reply,
            should_wrap_up: false,
            is_rest_day: false,
        }
    }

    /// 五栏草稿抽取：自动抽取行动、时长（未提及则留 None）、正反馈事实候选、反思引子
    pub fn extract_draft(&self, raw_text: &str) -> ExtractedDraftResult {
        let (minutes, is_approx) = Self::parse_duration(raw_text);

        // 提取行动项
        let action_desc = if raw_text.trim().is_empty() {
            "今日日常记录".to_string()
        } else {
            Self::truncate_snippet(raw_text, 60)
        };

        let actions = vec![ExtractedActionDraft {
            description: action_desc,
            goal_ref: Self::detect_goal(raw_text),
            duration_minutes: minutes,
            is_approximate: is_approx,
            source_quote: Some(Self::truncate_snippet(raw_text, 50)),
        }];

        // 提取正反馈（若包含正向词汇则提为候选事实，否则为空）
        let mut positive_facts = Vec::new();
        if raw_text.contains("完成")
            || raw_text.contains("搞定")
            || raw_text.contains("学会")
            || raw_text.contains("做完")
            || raw_text.contains("通过")
            || raw_text.contains("解决")
            || raw_text.contains("进展")
        {
            positive_facts.push(ExtractedPositiveFactDraft {
                fact: format!("今天推进并落实了：{}", Self::truncate_snippet(raw_text, 40)),
                status: "unconfirmed".to_string(), // 需用户在五栏中确认
                goal_ref: Self::detect_goal(raw_text),
                source_quote: Some(Self::truncate_snippet(raw_text, 40)),
            });
        }

        // 提取状态
        let status_category = if raw_text.contains("累") || raw_text.contains("疲惫") {
            Some("疲劳恢复".to_string())
        } else if raw_text.contains("专注") || raw_text.contains("认真") {
            Some("高度专注".to_string())
        } else {
            Some("平稳推进".to_string())
        };

        ExtractedDraftResult {
            goal: Self::detect_goal(raw_text),
            status_category,
            actions,
            positive_facts,
            reflection_prompt: Some("回想今天的过程，有没有哪个细节让你感觉特别顺畅或需要调整？".to_string()),
        }
    }

    fn truncate_snippet(text: &str, max_chars: usize) -> String {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() <= max_chars {
            text.to_string()
        } else {
            format!("{}...", chars[..max_chars].iter().collect::<String>())
        }
    }

    fn detect_goal(text: &str) -> Option<String> {
        if text.contains("沉思路") || text.contains("开发") || text.contains("代码") {
            Some("沉思路开发".to_string())
        } else if text.contains("阅读") || text.contains("书") {
            Some("持续阅读".to_string())
        } else if text.contains("英语") || text.contains("背单词") {
            Some("英语提升".to_string())
        } else {
            None
        }
    }

    /// 解析时长与约数标记
    fn parse_duration(text: &str) -> (Option<i64>, bool) {
        let is_approx = text.contains("约")
            || text.contains("大概")
            || text.contains("大约")
            || text.contains("差不多")
            || text.contains("估计");

        // 匹配 小时
        if let Some(pos) = text.find("小时") {
            let prefix = &text[..pos];
            if let Some(digit) = prefix.chars().rev().find(|c| c.is_ascii_digit()) {
                if let Some(num) = digit.to_digit(10) {
                    return (Some((num as i64) * 60), is_approx);
                }
            }
        }

        // 匹配 分钟
        if let Some(pos) = text.find("分钟") {
            let prefix = &text[..pos];
            let digits: String = prefix
                .chars()
                .rev()
                .take_while(|c| c.is_ascii_digit())
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect();

            if let Ok(m) = digits.parse::<i64>() {
                return (Some(m), is_approx);
            }
        }

        // 未提及具体时长，返回 (None, is_approx)
        (None, is_approx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_guided_turn_first_and_second_turns() {
        let provider = MockAiProvider::new();

        // 第 1 轮
        let history = vec![ChatMessage {
            role: "user".to_string(),
            content: "今天下午在写沉思路的 SQLite 持久化模块".to_string(),
        }];
        let res1 = provider.handle_guided_turn(&history, &AiTone::Gentle);
        assert!(res1.reply.contains("今天你主要在进行"));
        assert!(res1.reply.contains("花了多少时间"));
        assert!(!res1.should_wrap_up);
        assert!(!res1.is_rest_day);

        // 第 2 轮
        let mut history2 = history;
        history2.push(ChatMessage {
            role: "assistant".to_string(),
            content: res1.reply,
        });
        history2.push(ChatMessage {
            role: "user".to_string(),
            content: "花了大概 45 分钟，测试全部一次性通过了！".to_string(),
        });
        let res2 = provider.handle_guided_turn(&history2, &AiTone::Direct);
        assert!(res2.should_wrap_up);
        assert!(!res2.is_rest_day);
    }

    #[test]
    fn test_rest_day_no_nagging() {
        let provider = MockAiProvider::new();
        let history = vec![ChatMessage {
            role: "user".to_string(),
            content: "今天不想写了，有点累".to_string(),
        }];
        let res = provider.handle_guided_turn(&history, &AiTone::Gentle);
        assert!(res.is_rest_day);
        assert!(res.should_wrap_up);
        assert!(res.reply.contains("安心休息"));
    }

    #[test]
    fn test_extract_draft_duration_null_when_unspecified() {
        let provider = MockAiProvider::new();
        let draft = provider.extract_draft("今天去公园散步，心情平静");
        assert_eq!(draft.actions[0].duration_minutes, None); // 未提及时间不可瞎填
        assert_eq!(draft.status_category, Some("平稳推进".to_string()));
    }

    #[test]
    fn test_extract_draft_duration_approximate_minutes() {
        let provider = MockAiProvider::new();
        let draft = provider.extract_draft("今天写代码大概花了40分钟，搞定了一个死锁 bug");
        assert_eq!(draft.actions[0].duration_minutes, Some(40));
        assert!(draft.actions[0].is_approximate);
        assert_eq!(draft.positive_facts.len(), 1);
        assert_eq!(draft.positive_facts[0].status, "unconfirmed");
    }
}
