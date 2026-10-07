import React from 'react';

export const EntriesPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>历史记录</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          浏览过去的记录、原始对话及五栏结构化沉淀。
        </p>
      </header>

      <div
        style={{
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#fafafa',
          color: '#888',
        }}
      >
        <p style={{ margin: 0 }}>暂无本地记录</p>
        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
          [Plan 02 规划中] 本地 SQLite 历史仓储完成后将在此展示时间流。
        </span>
      </div>
    </div>
  );
};
