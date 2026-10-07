import React, { useEffect, useState } from 'react';
import { fetchAppStatus, backupDatabase, restoreDatabase } from '../../shared/desktop';
import { AppStatusDto } from '../../shared/contracts';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<AppStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

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

  const handleBackup = async () => {
    try {
      setBackupMessage('正在创建本地 SQLite 快照备份...');
      const res = await backupDatabase();
      setBackupMessage(`备份成功！文件已存至：${res.backup_path}`);
    } catch (err) {
      console.error('备份失败:', err);
      setBackupMessage('备份失败，请检查存储权限。');
    }
  };

  const handleRestore = async () => {
    const backupPath = window.prompt('请输入要恢复的备份 SQLite 文件绝对路径：');
    if (!backupPath || !backupPath.trim()) return;

    if (!window.confirm('警告：从备份恢复将覆盖当前数据库数据，建议先执行一次备份。确定继续吗？')) {
      return;
    }

    try {
      setRestoring(true);
      await restoreDatabase(backupPath.trim());
      alert('数据库恢复成功！请重新加载应用查看最新数据。');
      window.location.reload();
    } catch (err) {
      console.error('恢复失败:', err);
      alert('恢复失败，备份文件可能损坏或不存在。');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px' }}>
      <header>
        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>系统与设置</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
          管理本地 SQLite 持久化、数据备份快照与隐私安全。
        </p>
      </header>

      {/* 原生桌面存储状态 */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          backgroundColor: '#ffffff',
        }}
      >
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1e293b' }}>
          本地持久化仓储状态 (Plan 02)
        </h3>
        {loading ? (
          <p style={{ color: '#888' }}>正在探测底层数据库状态...</p>
        ) : status ? (
          <div style={{ fontSize: '0.9rem', lineHeight: '1.7', color: '#334155' }}>
            <div><strong>应用名称：</strong>{status.app_name}</div>
            <div><strong>当前版本：</strong>v{status.version}</div>
            <div><strong>运行平台：</strong>{status.os}</div>
            <div>
              <strong>SQLite 存储状态：</strong>
              <span style={{ color: status.storage_ready ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {status.storage_ready ? '就绪 (已启用 WAL 事务引擎)' : '未就绪'}
              </span>
            </div>
            <div>
              <strong>数据文件路径：</strong>
              <code style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                {status.database_path || '（纯内存开发模式）'}
              </code>
            </div>
          </div>
        ) : (
          <p style={{ color: '#dc2626' }}>无法获取底层数据库状态</p>
        )}
      </section>

      {/* 数据安全与备份快照 */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
          数据库一致性快照备份与恢复 (Plan 02 / Plan 06)
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
          采用 SQLite Online Backup API 生成事务级热备份，自动执行 PRAGMA integrity_check 校验。
        </p>

        {backupMessage && (
          <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '0.85rem' }}>
            {backupMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            onClick={handleBackup}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            立即创建本地备份快照
          </button>
          <button
            onClick={handleRestore}
            disabled={restoring}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {restoring ? '正在恢复...' : '从备份文件恢复'}
          </button>
        </div>
      </section>

      {/* 隐私承诺 */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          backgroundColor: '#ffffff',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#1e293b' }}>
          数据所有权与隐私承诺
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#475569', lineHeight: '1.6' }}>
          <li>所有日记文本与五栏结构均持久化存储于您本地设备的系统应用数据目录。</li>
          <li>无需网络连接即可完整录入、保存、浏览与备份。</li>
          <li>未授权状态下，绝无任何后台网络上传或遥测搜集。</li>
        </ul>
      </section>
    </div>
  );
};
