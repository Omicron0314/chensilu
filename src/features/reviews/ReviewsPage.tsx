import React from 'react';

export const ReviewsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>周复盘 (A 档)</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          基于确定性行动聚合生成初稿，无需重读七篇日记。
        </p>
      </header>

      <section
        style={{
          border: '1px dashed #ccc',
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: '#fafafa',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>复盘区间与聚合</h3>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>
          [Plan 04 规划中] 支持过去 7 天或自选明确日历区间的确定性数据统计与初稿确认。
        </p>
        <button disabled style={{ padding: '0.5rem 1rem', opacity: 0.6 }}>
          生成本周复盘初稿（待接入）
        </button>
      </section>
    </div>
  );
};
