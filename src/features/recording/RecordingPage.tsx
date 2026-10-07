import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ActionDto,
  PositiveFactDto,
  PositiveFactStatus,
} from '../../shared/contracts';
import {
  getDraft,
  saveDraft,
  saveEntry,
  clearDraft,
} from '../../shared/desktop';

export const RecordingPage: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [rawContent, setRawContent] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // 五栏扩展项（支持自由写直接填写或后续 AI 提取）
  const [goal, setGoal] = useState<string>('');
  const [statusCategory, setStatusCategory] = useState<string>('');
  const [actions, setActions] = useState<ActionDto[]>([]);
  const [positiveFacts, setPositiveFacts] = useState<PositiveFactDto[]>([]);
  const [reflection, setReflection] = useState<string>('');

  // 临时新增行动/正反馈状态
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionMinutes, setNewActionMinutes] = useState<string>('');
  const [newActionApprox, setNewActionApprox] = useState(false);
  const [newFactDesc, setNewFactDesc] = useState('');
  const [newFactStatus, setNewFactStatus] = useState<PositiveFactStatus>('confirmed');

  // 保存成功的即时事实反馈
  const [immediateFeedback, setImmediateFeedback] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载指定日期的草稿
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawContent(val);
    triggerAutoSaveDraft(val);
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

  // 提交并正式保存 Entry
  const handleSaveFinalEntry = async () => {
    if (!rawContent.trim() && actions.length === 0 && !reflection.trim()) {
      alert('请先输入今天的日记内容或行动。');
      return;
    }

    try {
      setSaveStatus('saving');
      const entry = await saveEntry({
        date,
        raw_content: rawContent || '(无原始自由文本，直接录入五栏)',
        goal: goal.trim() || null,
        status_category: statusCategory.trim() || null,
        reflection: reflection.trim() || null,
        actions,
        positive_facts: positiveFacts,
      });

      // 计算事实反馈
      const knownMinutes = entry.actions.reduce(
        (acc, cur) => acc + (cur.duration_minutes || 0),
        0
      );
      const unknownCount = entry.actions.filter((a) => a.duration_minutes === null).length;
      const confirmedFactsCount = entry.positive_facts.filter(
        (f) => f.status === 'confirmed'
      ).length;

      let feedbackText = `记录已安全保存！今日记录了 ${entry.actions.length} 项行动`;
      if (knownMinutes > 0) {
        feedbackText += `，已知投入时长约 ${knownMinutes} 分钟`;
      }
      if (unknownCount > 0) {
        feedbackText += `（包含 ${unknownCount} 项未标记时长的行动）`;
      }
      if (confirmedFactsCount > 0) {
        feedbackText += `；确认了 ${confirmedFactsCount} 条正反馈事实`;
      }
      feedbackText += '。';

      setImmediateFeedback(feedbackText);
      setSaveStatus('saved');

      // 重置表单但保留即时反馈
      setRawContent('');
      setActions([]);
      setPositiveFacts([]);
      setGoal('');
      setStatusCategory('');
      setReflection('');
      await clearDraft(date);
    } catch (e) {
      console.error('正式记录保存失败:', e);
      setSaveStatus('error');
      alert('保存失败，请检查数据库状态。');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>今日记录</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
            随手记录发生过的事，不强迫填满所有栏目。时长可留空，正反馈可跳过。
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

      {/* 实时保存状态指示条 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.4rem 0.75rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '6px',
          fontSize: '0.8rem',
          color: '#666',
        }}
      >
        <span>
          持久化状态：
          {saveStatus === 'idle' && '未改动'}
          {saveStatus === 'saving' && <strong style={{ color: '#0066cc' }}> 正在保存草稿...</strong>}
          {saveStatus === 'saved' && (
            <span style={{ color: '#2e7d32' }}>
              {' '}✓ 草稿已保存 {lastSavedTime ? `(${lastSavedTime})` : ''}
            </span>
          )}
          {saveStatus === 'error' && <span style={{ color: '#c00' }}> ✗ 保存失败</span>}
        </span>
        <span style={{ color: '#888' }}>本地 SQLite 事务保护 · 断网自动保存</span>
      </div>

      {/* 成功后的即时事实反馈横幅 */}
      {immediateFeedback && (
        <div
          style={{
            padding: '0.85rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            fontSize: '0.9rem',
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
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#166534',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 自由写与原始输入区 */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#ffffff',
        }}
      >
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          自由记录 / 原始文本（AI 不会覆盖此原文）
        </label>
        <textarea
          value={rawContent}
          onChange={handleTextChange}
          placeholder="今天做了什么？遇到了什么事情或进展？（随心输入，哪怕一两句话也可以保存）"
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

      {/* 五栏结构化沉淀（不卡保存，支持逐项补充或跳过） */}
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
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
          五栏沉淀（目标 · 状态 · 投入行动 · 正反馈 · 反思）
        </h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
          结构化便于机器周报聚合。所有字段均可空，绝不因未填而阻断保存。
        </p>

        {/* 1. 目标 & 2. 状态 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              ① 关联目标（可留空）
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="例：提升工程架构能力 / 备考 CET6"
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
              placeholder="例：专注、疲惫、平稳（禁止量化评分）"
              style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        {/* 3. 时间投入的具体行动 */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            ③ 时间投入的具体行动（核心可聚合项，未知时长可留空）
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
              placeholder="行动描述（如：编写 Tauri 原生测试）"
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

        {/* 4. 正反馈事实 */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            ④ 正反馈（只存用户认可的事实；可确认、跳过或明确今天没有）
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
                      ({fact.status === 'confirmed' ? '已确认' : fact.status === 'none' ? '明确没有' : fact.status === 'skipped' ? '已跳过' : '待确认'})
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
            ⑤ 反思（全场最轻一栏：自由文本，不设字数与完成率）
          </label>
          <input
            type="text"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="今天有什么值得一想的体会或值得改进的微小点？（可留空）"
            style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </section>

      {/* 底部保存按钮 */}
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
