import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ActionDto,
  PositiveFactDto,
  PositiveFactStatus,
  AiTone,
  ChatMessage,
} from '../../shared/contracts';
import {
  getDraft,
  saveDraft,
  saveEntry,
  clearDraft,
  guidedChat,
  extractFiveColumns,
} from '../../shared/desktop';

export const RecordingPage: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);

  // 输入模式：对话引导 vs 自由写
  const [inputMode, setInputMode] = useState<'dialogue' | 'freeform'>('dialogue');
  const [tone, setTone] = useState<AiTone>('gentle');

  // 对话流状态
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '嗨！今天过得怎么样？发生了什么具体的事情吗？（随口说一两句即可，也可以随时跳过或选择休息）',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiReplying, setAiReplying] = useState(false);
  const [canWrapUp, setCanWrapUp] = useState(false);

  // 自由写原文 & 保存状态
  const [rawContent, setRawContent] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // 五栏沉淀项
  const [goal, setGoal] = useState<string>('');
  const [statusCategory, setStatusCategory] = useState<string>('');
  const [actions, setActions] = useState<ActionDto[]>([]);
  const [positiveFacts, setPositiveFacts] = useState<PositiveFactDto[]>([]);
  const [reflection, setReflection] = useState<string>('');

  // 行动/正反馈表单临时项
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionMinutes, setNewActionMinutes] = useState<string>('');
  const [newActionApprox, setNewActionApprox] = useState(false);
  const [newFactDesc, setNewFactDesc] = useState('');
  const [newFactStatus, setNewFactStatus] = useState<PositiveFactStatus>('confirmed');

  // 即时事实反馈横幅
  const [immediateFeedback, setImmediateFeedback] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载指定日期草稿
  useEffect(() => {
    let active = true;
    getDraft(date).then((draft) => {
      if (!active) return;
      if (draft) {
        setRawContent(draft.raw_content);
        setSaveStatus('saved');
        setLastSavedTime(new Date(draft.updated_at).toLocaleTimeString());
      } else {
        setRawContent('');
        setSaveStatus('idle');
      }
    });
    return () => {
      active = false;
    };
  }, [date]);

  // 自动防抖保存草稿 (800ms)
  const triggerAutoSaveDraft = useCallback(
    (text: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!text.trim()) {
        setSaveStatus('idle');
        return;
      }

      setSaveStatus('saving');
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const saved = await saveDraft({
            date,
            raw_content: text,
          });
          setSaveStatus('saved');
          setLastSavedTime(new Date(saved.updated_at).toLocaleTimeString());
        } catch (e) {
          console.error('草稿保存失败:', e);
          setSaveStatus('error');
        }
      }, 800);
    },
    [date]
  );

  const handleFreeformChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawContent(val);
    triggerAutoSaveDraft(val);
  };

  // 发送对话消息
  const handleSendChatMessage = async (customText?: string) => {
    const userText = customText !== undefined ? customText : chatInput.trim();
    if (!userText || aiReplying) return;

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newHistory);
    if (!customText) setChatInput('');
    setAiReplying(true);

    // 同步拼接进原文草稿
    const accumulated = newHistory
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');
    setRawContent(accumulated);
    triggerAutoSaveDraft(accumulated);

    try {
      const res = await guidedChat(newHistory, tone);
      setMessages([...newHistory, { role: 'assistant', content: res.reply }]);
      if (res.should_wrap_up) {
        setCanWrapUp(true);
      }
    } catch (e) {
      console.error('对话引导调用失败:', e);
      setMessages([
        ...newHistory,
        { role: 'assistant', content: '（本地引导服务遇到小波动，您可以继续记录或直接点击整理为五栏）' },
      ]);
    } finally {
      setAiReplying(false);
    }
  };

  // “今天不想写 / 休息”
  const handleRestDay = () => {
    handleSendChatMessage('今天不想写了，有点累，想休息。');
  };

  // 从对话或原文自动提取五栏草稿
  const handleExtractToFiveColumns = async () => {
    const sourceText = rawContent.trim() || messages.filter((m) => m.role === 'user').map((m) => m.content).join('；');
    if (!sourceText) {
      alert('请先输入对话或文字内容，以便 AI 提取五栏。');
      return;
    }

    try {
      const extracted = await extractFiveColumns(sourceText);
      if (extracted.goal) setGoal(extracted.goal);
      if (extracted.status_category) setStatusCategory(extracted.status_category);

      if (extracted.actions.length > 0) {
        const newActions: ActionDto[] = extracted.actions.map((a, idx) => ({
          id: `act-ai-${Date.now()}-${idx}`,
          entry_id: '',
          description: a.description,
          goal_ref: a.goal_ref,
          duration_minutes: a.duration_minutes,
          is_approximate: a.is_approximate,
          source_quote: a.source_quote,
        }));
        setActions(newActions);
      }

      if (extracted.positive_facts.length > 0) {
        const newFacts: PositiveFactDto[] = extracted.positive_facts.map((f, idx) => ({
          id: `fact-ai-${Date.now()}-${idx}`,
          entry_id: '',
          fact: f.fact,
          status: 'unconfirmed',
          goal_ref: f.goal_ref,
          source_quote: f.source_quote,
        }));
        setPositiveFacts(newFacts);
      }

      if (extracted.reflection_prompt) {
        setReflection(extracted.reflection_prompt);
      }
    } catch (e) {
      console.error('五栏抽取失败:', e);
      alert('抽取失败，已保留原输入。');
    }
  };

  const handleAddAction = () => {
    if (!newActionDesc.trim()) return;
    const minutes = newActionMinutes.trim() === '' ? null : parseInt(newActionMinutes, 10);
    const action: ActionDto = {
      id: `act-${Date.now()}`,
      entry_id: '',
      description: newActionDesc.trim(),
      goal_ref: goal.trim() || null,
      duration_minutes: isNaN(minutes as number) ? null : minutes,
      is_approximate: newActionApprox,
    };
    setActions([...actions, action]);
    setNewActionDesc('');
    setNewActionMinutes('');
    setNewActionApprox(false);
  };

  const handleRemoveAction = (idx: number) => {
    setActions(actions.filter((_, i) => i !== idx));
  };

  const handleAddPositiveFact = () => {
    if (!newFactDesc.trim() && newFactStatus !== 'none') return;
    const fact: PositiveFactDto = {
      id: `fact-${Date.now()}`,
      entry_id: '',
      fact: newFactStatus === 'none' ? '明确没有显著正反馈' : newFactDesc.trim(),
      status: newFactStatus,
      goal_ref: goal.trim() || null,
    };
    setPositiveFacts([...positiveFacts, fact]);
    setNewFactDesc('');
  };

  const handleRemoveFact = (idx: number) => {
    setPositiveFacts(positiveFacts.filter((_, i) => i !== idx));
  };

  // 正式保存 Entry
  const handleSaveFinalEntry = async () => {
    const finalRaw = rawContent.trim() || messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    if (!finalRaw && actions.length === 0 && !reflection.trim()) {
      alert('请先输入日记内容或行动。');
      return;
    }

    try {
      setSaveStatus('saving');
      const entry = await saveEntry({
        date,
        raw_content: finalRaw || '(用户直接保存五栏结构)',
        goal: goal.trim() || null,
        status_category: statusCategory.trim() || null,
        reflection: reflection.trim() || null,
        actions,
        positive_facts: positiveFacts,
      });

      // 本地确定性事实计算（不依赖 LLM）
      const knownMinutes = entry.actions.reduce((acc, cur) => acc + (cur.duration_minutes || 0), 0);
      const unknownCount = entry.actions.filter((a) => a.duration_minutes === null).length;
      const confirmedFactsCount = entry.positive_facts.filter((f) => f.status === 'confirmed').length;

      let feedbackText = `记录已安全入库！今日共记录 ${entry.actions.length} 项具体行动`;
      if (knownMinutes > 0) feedbackText += `，投入已知时长约 ${knownMinutes} 分钟`;
      if (unknownCount > 0) feedbackText += `（包含 ${unknownCount} 项未标记时长的行动）`;
      if (confirmedFactsCount > 0) feedbackText += `；确认了 ${confirmedFactsCount} 项正反馈进展`;
      feedbackText += '。';

      setImmediateFeedback(feedbackText);
      setSaveStatus('saved');

      // 重置表单
      setRawContent('');
      setActions([]);
      setPositiveFacts([]);
      setGoal('');
      setStatusCategory('');
      setReflection('');
      setMessages([
        {
          role: 'assistant',
          content: '今天的记录已保存完毕！辛苦啦，明天见～',
        },
      ]);
      setCanWrapUp(false);
      await clearDraft(date);
    } catch (e) {
      console.error('正式保存失败:', e);
      setSaveStatus('error');
      alert('保存失败，请检查数据库。');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px' }}>
      {/* 头部与日期 */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>今日记录</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
            先复述一句，再问一个具体问题。随口回答 2–3 轮即可结束，随时可跳过。
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#555' }}>记录日期：</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '0.3rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </header>

      {/* 状态与模式切换条 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0.75rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#e2e8f0', padding: '2px', borderRadius: '4px' }}>
            <button
              onClick={() => setInputMode('dialogue')}
              style={{
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '3px',
                fontSize: '0.8rem',
                backgroundColor: inputMode === 'dialogue' ? '#ffffff' : 'transparent',
                fontWeight: inputMode === 'dialogue' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              💬 对话引导
            </button>
            <button
              onClick={() => setInputMode('freeform')}
              style={{
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '3px',
                fontSize: '0.8rem',
                backgroundColor: inputMode === 'freeform' ? '#ffffff' : 'transparent',
                fontWeight: inputMode === 'freeform' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              ✍️ 自由书写
            </button>
          </div>

          {inputMode === 'dialogue' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span>口吻：</span>
              <button
                onClick={() => setTone('gentle')}
                style={{
                  border: '1px solid #cbd5e1',
                  background: tone === 'gentle' ? '#dbeafe' : '#fff',
                  color: tone === 'gentle' ? '#1d4ed8' : '#475569',
                  borderRadius: '3px',
                  padding: '0.15rem 0.4rem',
                  cursor: 'pointer',
                }}
              >
                温和
              </button>
              <button
                onClick={() => setTone('direct')}
                style={{
                  border: '1px solid #cbd5e1',
                  background: tone === 'direct' ? '#dbeafe' : '#fff',
                  color: tone === 'direct' ? '#1d4ed8' : '#475569',
                  borderRadius: '3px',
                  padding: '0.15rem 0.4rem',
                  cursor: 'pointer',
                }}
              >
                直接
              </button>
            </div>
          )}
        </div>

        <span style={{ color: '#666', fontSize: '0.8rem' }}>
          {saveStatus === 'saving' && <strong style={{ color: '#0284c7' }}>正在保存草稿...</strong>}
          {saveStatus === 'saved' && <span style={{ color: '#16a34a' }}>✓ 本地草稿已保存 {lastSavedTime ? `(${lastSavedTime})` : ''}</span>}
          {saveStatus === 'idle' && '未改动'}
        </span>
      </div>

      {/* 即时事实反馈横幅 */}
      {immediateFeedback && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>即时事实反馈：</strong>
            <span>{immediateFeedback}</span>
          </div>
          <button
            onClick={() => setImmediateFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 录入工作区 */}
      {inputMode === 'dialogue' ? (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* 气泡列表 */}
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              padding: '0.5rem 0',
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: isUser ? '#0f172a' : '#f1f5f9',
                    color: isUser ? '#ffffff' : '#1e293b',
                    padding: '0.6rem 0.85rem',
                    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </div>
              );
            })}
            {aiReplying && (
              <div style={{ alignSelf: 'flex-start', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                AI 正在梳理中...
              </div>
            )}
          </div>

          {/* 输入框与快捷动作 */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder="随口说说今天做了什么（按 Enter 发送）..."
              style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
            <button
              onClick={() => handleSendChatMessage()}
              disabled={aiReplying || !chatInput.trim()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              发送
            </button>
          </div>

          {/* 对话引导快捷控制按钮 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleRestDay}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                💤 今天不想写 / 休息
              </button>
              <button
                onClick={() => setInputMode('freeform')}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                跳过对话转自由写
              </button>
            </div>

            <button
              onClick={handleExtractToFiveColumns}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: canWrapUp ? '#16a34a' : '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              ⚡ 一键提取为五栏草稿 ↓
            </button>
          </div>
        </section>
      ) : (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              自由记录文本（不限制格式，支持长文本）
            </label>
            <button
              onClick={handleExtractToFiveColumns}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              从自由文本提取五栏 ↓
            </button>
          </div>
          <textarea
            value={rawContent}
            onChange={handleFreeformChange}
            placeholder="今天发生了什么？（支持随心记录，草稿实时自动防抖保存）"
            rows={5}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </section>
      )}

      {/* 五栏沉淀与编辑区 */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
              五栏沉淀（目标 · 状态 · 投入行动 · 正反馈 · 反思）
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              结构化便于机器周报聚合。所有字段均可编辑、可空缺，绝不阻断保存。
            </p>
          </div>
        </div>

        {/* 1. 目标 & 2. 状态 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              ① 目标对齐（可空）
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="例：沉思路开发 / 备考 CET6"
              style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              ② 当日状态（类别描述，不打分）
            </label>
            <input
              type="text"
              value={statusCategory}
              onChange={(e) => setStatusCategory(e.target.value)}
              placeholder="例：专注、平稳、疲惫恢复"
              style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        {/* 3. 时间投入的具体行动 */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            ③ 时间投入的具体行动（核心统计项，未知时长请留空）
          </label>
          {actions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {actions.map((act, idx) => (
                <div
                  key={act.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span>• {act.description}</span>
                    <span style={{ color: '#0284c7', marginLeft: '0.5rem' }}>
                      [{act.duration_minutes !== null ? `${act.is_approximate ? '约 ' : ''}${act.duration_minutes} 分钟` : '时长未知'}]
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveAction(idx)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={newActionDesc}
              onChange={(e) => setNewActionDesc(e.target.value)}
              placeholder="行动描述（如：编写 Plan 03 测试）"
              style={{ flex: 2, padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
            <input
              type="number"
              min={0}
              value={newActionMinutes}
              onChange={(e) => setNewActionMinutes(e.target.value)}
              placeholder="分钟（留空为未知）"
              style={{ width: '130px', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={newActionApprox}
                onChange={(e) => setNewActionApprox(e.target.checked)}
              />
              约数
            </label>
            <button
              onClick={handleAddAction}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid #0284c7',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + 添加行动
            </button>
          </div>
        </div>

        {/* 4. 正反馈 */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            ④ 正反馈（只存用户认可的事实；可确认、跳过或明确没有）
          </label>
          {positiveFacts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {positiveFacts.map((fact, idx) => (
                <div
                  key={fact.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span>• {fact.fact}</span>
                    <span style={{ color: '#16a34a', marginLeft: '0.5rem' }}>
                      ({fact.status === 'confirmed' ? '已确认' : fact.status === 'none' ? '明确没有' : fact.status === 'skipped' ? '已跳过' : '待确认候选'})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFact(idx)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={newFactDesc}
              onChange={(e) => setNewFactDesc(e.target.value)}
              placeholder="事实描述（如：代码一次性通过全部测试）"
              disabled={newFactStatus === 'none'}
              style={{ flex: 2, padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
            <select
              value={newFactStatus}
              onChange={(e) => setNewFactStatus(e.target.value as PositiveFactStatus)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="confirmed">确认算进展</option>
              <option value="unconfirmed">待确认候选</option>
              <option value="skipped">跳过</option>
              <option value="none">今天明确没有</option>
            </select>
            <button
              onClick={handleAddPositiveFact}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid #16a34a',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + 记录正反馈
            </button>
          </div>
        </div>

        {/* 5. 反思 */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            ⑤ 反思（全场最轻一栏：AI 仅递引子，由用户自由写或留空）
          </label>
          <input
            type="text"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="今天有什么体会或值得微调的点？（可留空）"
            style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </section>

      {/* 底部保存条 */}
      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button
          onClick={handleSaveFinalEntry}
          style={{
            padding: '0.6rem 1.5rem',
            backgroundColor: '#0f172a',
            color: '#fff',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          正式保存今日记录
        </button>
      </footer>
    </div>
  );
};
