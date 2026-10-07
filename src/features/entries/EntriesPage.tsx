import React, { useEffect, useState } from 'react';
import { EntryDto } from '../../shared/contracts';
import { listEntries, deleteEntry } from '../../shared/desktop';

export const EntriesPage: React.FC = () => {
  const [entries, setEntries] = useState<EntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<EntryDto | null>(null);

  const reloadEntries = () => {
    setLoading(true);
    listEntries(100, 0)
      .then((res) => {
        setEntries(res);
      })
      .catch((err) => {
        console.error('获取历史记录失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    reloadEntries();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这条日记记录吗？关联的行动与正反馈数据将一并清理。')) {
      return;
    }

    try {
      await deleteEntry(id);
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
      reloadEntries();
    } catch (err) {
      console.error('删除记录失败:', err);
      alert('删除失败。');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px' }}>
      <header>
        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>历史记录</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
          安全保存在本地 SQLite 数据库中。可随时重读原文与五栏沉淀。
        </p>
      </header>

      {loading ? (
        <p style={{ color: '#888' }}>正在读取本地记录...</p>
      ) : entries.length === 0 ? (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '2.5rem',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            color: '#64748b',
          }}
        >
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>暂无历史记录</p>
          <span style={{ fontSize: '0.85rem' }}>
            在「今日记录」板块保存第一篇日记后，即可在此浏览。
          </span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEntry ? '1fr 1fr' : '1fr', gap: '1rem' }}>
          {/* 左侧列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entries.map((entry) => {
              const totalKnownMinutes = entry.actions.reduce(
                (acc, a) => acc + (a.duration_minutes || 0),
                0
              );
              const unknownDurationCount = entry.actions.filter((a) => a.duration_minutes === null).length;
              const isSelected = selectedEntry?.id === entry.id;

              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  style={{
                    border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{entry.date}</span>
                      {entry.goal && (
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {entry.goal}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      删除
                    </button>
                  </div>

                  <p
                    style={{
                      margin: '0 0 0.5rem 0',
                      color: '#475569',
                      fontSize: '0.85rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {entry.raw_content}
                  </p>

                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>行动: {entry.actions.length} 项</span>
                    {totalKnownMinutes > 0 && <span>已知投入: {totalKnownMinutes} 分钟</span>}
                    {unknownDurationCount > 0 && <span>未知时长: {unknownDurationCount} 项</span>}
                    {entry.positive_facts.length > 0 && <span>正反馈: {entry.positive_facts.length} 条</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧详情面板 */}
          {selectedEntry && (
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'sticky',
                top: 0,
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedEntry.date} 记录详情</h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  关闭 ✕
                </button>
              </div>

              {/* 原始内容（独立保留） */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>原始文本（用户原汁原味输入）：</label>
                <div style={{ marginTop: '0.25rem', padding: '0.6rem', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {selectedEntry.raw_content}
                </div>
              </div>

              {/* 五栏沉淀详情 */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>五栏沉淀结构：</label>

                {/* 目标与状态 */}
                <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div><strong>目标：</strong>{selectedEntry.goal || '（无特定目标）'}</div>
                  <div><strong>状态：</strong>{selectedEntry.status_category || '（未记录）'}</div>
                </div>

                {/* 行动 */}
                <div style={{ marginTop: '0.75rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>具体投入行动：</strong>
                  {selectedEntry.actions.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>无独立行动记录</div>
                  ) : (
                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                      {selectedEntry.actions.map((act) => (
                        <li key={act.id}>
                          <span>{act.description}</span>
                          <span style={{ color: '#0284c7', marginLeft: '0.4rem' }}>
                            ({act.duration_minutes !== null ? `${act.is_approximate ? '约 ' : ''}${act.duration_minutes} 分钟` : '时长未知'})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 正反馈 */}
                <div style={{ marginTop: '0.75rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>正反馈事实：</strong>
                  {selectedEntry.positive_facts.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>未记录正反馈</div>
                  ) : (
                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                      {selectedEntry.positive_facts.map((fact) => (
                        <li key={fact.id}>
                          <span>{fact.fact}</span>
                          <span style={{ color: '#16a34a', marginLeft: '0.4rem' }}>
                            [{fact.status === 'confirmed' ? '已确认' : fact.status === 'none' ? '明确没有' : fact.status === 'skipped' ? '已跳过' : '待确认'}]
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 反思 */}
                <div style={{ marginTop: '0.75rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>反思体会：</strong>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#334155' }}>
                    {selectedEntry.reflection || '（留白自由思考）'}
                  </p>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                条目版本: v{selectedEntry.version} · 创建时间: {new Date(selectedEntry.created_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
