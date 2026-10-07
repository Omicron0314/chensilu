import React from 'react';

export const RecordingPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>今日记录</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          以轻松对话或自由书写开始记录，不强制要求填满五栏。
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
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>对话引导 / 自由记录工作区</h3>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>
          [Plan 02/03 规划中] 离线持久化草稿与对话抽取功能即将接入。
        </p>
        <textarea
          placeholder="今天发生了什么？（支持自由写，草稿将自动保存）"
          rows={6}
          disabled
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            backgroundColor: '#f5f5f5',
            color: '#999',
            resize: 'none',
          }}
        />
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <button disabled style={{ padding: '0.4rem 0.8rem', opacity: 0.6 }}>
            发送（待接入）
          </button>
          <button disabled style={{ padding: '0.4rem 0.8rem', opacity: 0.6 }}>
            今天不想写（待接入）
          </button>
        </div>
      </section>

      <section
        style={{
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#fff',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>五栏预览区（目标 / 状态 / 投入 / 正反馈 / 反思）</h3>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>
          完成对话后将在此生成可编辑的结构化草稿。当前版本尚未连接底层存储。
        </p>
      </section>
    </div>
  );
};
