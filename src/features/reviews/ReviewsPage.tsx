import React, { useState, useEffect } from 'react';
import {
  ReviewDraftDto,
  ReviewRecordDto,
} from '../../shared/contracts';
import {
  generateReviewDraft,
  saveReviewRecord,
  listReviews,
} from '../../shared/desktop';

export const ReviewsPage: React.FC = () => {
  // 默认过去 7 天区间
  const getPastDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const defaultRange = getPastDays(7);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const [generating, setGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<ReviewDraftDto | null>(null);
  const [editableNarrative, setEditableNarrative] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // 历史复盘记录
  const [savedReviews, setSavedReviews] = useState<ReviewRecordDto[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  const reloadReviewsList = () => {
    listReviews()
      .then((res) => setSavedReviews(res))
      .catch((e) => console.error('获取历史复盘失败:', e));
  };

  useEffect(() => {
    reloadReviewsList();
  }, []);

  const handleGenerateDraft = async () => {
    if (startDate > endDate) {
      alert('开始日期不能晚于结束日期。');
      return;
    }

    try {
      setGenerating(true);
      setSaveMessage(null);
      const draft = await generateReviewDraft({
        start_date: startDate,
        end_date: endDate,
      });
      setCurrentDraft(draft);
      setEditableNarrative(draft.narrative);
      setActiveReviewId(null);
    } catch (e) {
      console.error('生成周报初稿失败:', e);
      alert('生成复盘初稿失败。');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmReview = async () => {
    if (!currentDraft) return;

    try {
      setSaveMessage('正在保存确认复盘...');
      const record = await saveReviewRecord({
        id: activeReviewId || null,
        start_date: currentDraft.start_date,
        end_date: currentDraft.end_date,
        narrative: editableNarrative,
        stats_json: JSON.stringify(currentDraft.stats),
        status: 'confirmed',
      });
      setActiveReviewId(record.id);
      setSaveMessage('✓ 复盘已成功确认并归档！');
      reloadReviewsList();
    } catch (e) {
      console.error('保存复盘失败:', e);
      setSaveMessage('✗ 保存失败。');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px' }}>
      <header>
        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>周复盘 (A 档)</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
          基于底层确定性行动与正反馈字段直接聚合出周报，读一份周报不需要重读七篇日记。
        </p>
      </header>

      {/* 区间选择与快捷触发 */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>复盘区间：</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <span style={{ color: '#64748b' }}>至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => {
                const r = getPastDays(7);
                setStartDate(r.start);
                setEndDate(r.end);
              }}
              style={{ padding: '0.3rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              过去 7 天
            </button>
            <button
              onClick={() => {
                const r = getPastDays(14);
                setStartDate(r.start);
                setEndDate(r.end);
              }}
              style={{ padding: '0.3rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              过去 14 天
            </button>
            <button
              onClick={handleGenerateDraft}
              disabled={generating}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {generating ? '正在聚合中...' : '生成复盘初稿 (A 档)'}
            </button>
          </div>
        </div>
      </section>

      {/* 确定性聚合统计数据快照面板 */}
      {currentDraft && (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
              📊 确定性聚合数据看板（代码精确计算，不经 LLM 臆造）
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              区间：{currentDraft.start_date} ~ {currentDraft.end_date}
            </span>
          </div>

          {currentDraft.stats.total_entries_count === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              该区间内暂无日记记录。请先在「今日记录」板块记录。
            </div>
          ) : (
            <>
              {/* 四格关键指标 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>累计日记天数</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#0f172a' }}>
                    {currentDraft.stats.total_entries_count} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>篇</span>
                  </div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>落地行动总数</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#0f172a' }}>
                    {currentDraft.stats.total_actions_count} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>项</span>
                  </div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>已知时间投入</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#0284c7' }}>
                    {currentDraft.stats.total_known_minutes} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>分钟</span>
                  </div>
                  {currentDraft.stats.unknown_duration_actions_count > 0 && (
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      ({currentDraft.stats.unknown_duration_actions_count} 项未标记时长)
                    </div>
                  )}
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>已确认正反馈</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#16a34a' }}>
                    {currentDraft.stats.confirmed_facts_count} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>条</span>
                  </div>
                </div>
              </div>

              {/* 目标投入分布细分 */}
              {currentDraft.stats.goals_breakdown.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#475569' }}>🎯 目标时间账本细分：</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {currentDraft.stats.goals_breakdown.map((g, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.6rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{g.goal_name}</span>
                        <span style={{ color: '#0369a1' }}>
                          {g.action_count} 项行动 · 已知投入约 {g.known_duration_minutes} 分钟
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* A 档初稿编辑与用户确认区 */}
      {currentDraft && currentDraft.stats.total_entries_count > 0 && (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
                ✍️ 复盘初稿（可直接自由阅读、修改与确认）
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                AI 根据客观字段生成初稿，判断与反思完全属于您本人。
              </p>
            </div>
            {saveMessage && (
              <span style={{ fontSize: '0.85rem', color: saveMessage.includes('✓') ? '#16a34a' : '#0284c7', fontWeight: 500 }}>
                {saveMessage}
              </span>
            )}
          </div>

          <textarea
            value={editableNarrative}
            onChange={(e) => setEditableNarrative(e.target.value)}
            rows={10}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
          />

          {/* 事实依据出处回链 */}
          {currentDraft.citations.length > 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem' }}>
                🔍 事实依据出处回链（每条结论可追溯至具体日记）：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {currentDraft.citations.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#f1f5f9',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      color: '#475569',
                    }}
                  >
                    <span>[{c.date}] </span>
                    <span>{c.quote}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              onClick={handleConfirmReview}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✓ 确认并归档此篇周复盘
            </button>
          </footer>
        </section>
      )}

      {/* 历史复盘归档列表 */}
      {savedReviews.length > 0 && (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.25rem',
            backgroundColor: '#ffffff',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1e293b' }}>
            📚 历史周期复盘记录
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {savedReviews.map((rev) => (
              <div
                key={rev.id}
                onClick={() => {
                  setCurrentDraft({
                    start_date: rev.start_date,
                    end_date: rev.end_date,
                    stats: rev.stats,
                    narrative: rev.narrative,
                    citations: rev.stats.confirmed_facts.map((f) => ({
                      entry_id: f.entry_id,
                      date: f.date,
                      quote: f.fact,
                    })),
                  });
                  setEditableNarrative(rev.narrative);
                  setActiveReviewId(rev.id);
                  setStartDate(rev.start_date);
                  setEndDate(rev.end_date);
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: activeReviewId === rev.id ? '#f0fdf4' : '#f8fafc',
                  border: activeReviewId === rev.id ? '1px solid #86efac' : '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {rev.start_date} ~ {rev.end_date}
                  </span>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                    {rev.stats.total_entries_count} 篇日记 · {rev.stats.total_known_minutes} 分钟已知投入
                  </span>
                </div>
                <div>
                  {rev.status === 'confirmed' && (
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      已确认
                    </span>
                  )}
                  {rev.status === 'stale' && (
                    <span style={{ fontSize: '0.75rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      数据已更新(待刷新)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
