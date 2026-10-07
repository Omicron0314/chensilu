import React, { useEffect, useState } from 'react';
import { fetchAppStatus } from '../../shared/desktop';
import { AppStatusDto } from '../../shared/contracts';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<AppStatusDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppStatus()
      .then((res) => {
        setStatus(res);
      })
      .catch((err) => {
        console.error('获取系统状态失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>系统与设置</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          管理 AI 模型配置、隐私偏好与数据导出备份。
        </p>
      </header>

      <section
        style={{
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '1.25rem',
          backgroundColor: '#fff',
        }}
      >
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>原生桌面桥接状态</h3>
        {loading ? (
          <p style={{ color: '#888' }}>正在探测桌面桥接接口...</p>
        ) : status ? (
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <div><strong>应用名称：</strong>{status.app_name}</div>
            <div><strong>当前版本：</strong>v{status.version}</div>
            <div><strong>运行平台：</strong>{status.os}</div>
            <div>
              <strong>本地存储准备：</strong>
              <span style={{ color: status.storage_ready ? '#2e7d32' : '#d32f2f' }}>
                {status.storage_ready ? '就绪' : '未就绪 (Plan 02 接入 SQLite)'}
              </span>
            </div>
            <div>
              <strong>AI 服务准备：</strong>
              <span style={{ color: status.ai_ready ? '#2e7d32' : '#d32f2f' }}>
                {status.ai_ready ? '就绪' : '未就绪 (Plan 05 接入)'}
              </span>
            </div>
          </div>
        ) : (
          <p style={{ color: '#c00' }}>无法获取原生桥接状态</p>
        )}
      </section>

      <section
        style={{
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '1.25rem',
          backgroundColor: '#fafafa',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>数据与隐私</h3>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>
          沉思路默认将所有日记数据保存在本地 SQLite 中，未经明确授权绝不外发。
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button disabled style={{ padding: '0.4rem 0.8rem', opacity: 0.6 }}>
            完整数据导出 (Plan 06)
          </button>
          <button disabled style={{ padding: '0.4rem 0.8rem', opacity: 0.6 }}>
            本地快照备份 (Plan 06)
          </button>
          <button disabled style={{ padding: '0.4rem 0.8rem', opacity: 0.6, color: '#c00' }}>
            清空所有数据 (Plan 06)
          </button>
        </div>
      </section>
    </div>
  );
};
