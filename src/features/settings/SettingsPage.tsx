import React, { useEffect, useState } from 'react';
import {
  fetchAppStatus,
  backupDatabase,
  restoreDatabase,
  getAiConfig,
  updateAiConfig,
} from '../../shared/desktop';
import { AppStatusDto, AiConfigDto } from '../../shared/contracts';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<AppStatusDto | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfigDto | null>(null);
  const [loading, setLoading] = useState(true);

  // 备份与恢复状态
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // AI 配置编辑状态
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'mock' | 'gemini'>('mock');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash-high');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAppStatus(), getAiConfig()])
      .then(([appStatus, aiConf]) => {
        setStatus(appStatus);
        setAiConfig(aiConf);
        setSelectedProvider(aiConf.provider as 'mock' | 'gemini');
        setSelectedModel(aiConf.model);
      })
      .catch((err) => {
        console.error('获取设置失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleToggleAi = async (enable: boolean) => {
    if (enable) {
      const confirmAuth = window.confirm(
        '【隐私与数据授权声明】\n\n' +
        '启用 AI 辅助后：\n' +
        '1. 仅在您主动发起引导对话或点击「提取五栏」时，将当前输入的单次文字发送给模型；\n' +
        '2. 绝不默认上传历史日记库，不收集个人未勾选的数据；\n' +
        '3. 模型提供商仅限于经批复的 Google Gemini 系列；\n' +
        '4. 关闭后立即停止发起任何新的远程请求。\n\n' +
        '您确认授权并开启 AI 吗？'
      );
      if (!confirmAuth) return;
    }

    try {
      const updated = await updateAiConfig({
        enabled: enable,
        provider: selectedProvider,
        api_key: apiKeyInput.trim() || undefined,
        model: selectedModel,
      });
      setAiConfig(updated);
      setAiFeedback(enable ? '✓ AI 服务已获得明确授权并启用' : '✓ AI 服务已关闭，停止任何网络调用');
    } catch (e) {
      console.error('更新 AI 配置失败:', e);
      setAiFeedback('✗ 配置保存失败');
    }
  };

  const handleSaveAiSettings = async () => {
    try {
      const updated = await updateAiConfig({
        enabled: aiConfig?.enabled || false,
        provider: selectedProvider,
        api_key: apiKeyInput.trim() || undefined,
        model: selectedModel,
      });
      setAiConfig(updated);
      setApiKeyInput('');
      setAiFeedback('✓ AI 模型配置与凭据已更新');
    } catch (e) {
      console.error('保存 AI 设置失败:', e);
      setAiFeedback('✗ 保存失败');
    }
  };

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
          管理 AI 模型配置、隐私偏好、调用额度与本地持久化备份。
        </p>
      </header>

      {/* AI 隐私授权与额度看板 (Plan 05) */}
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
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
              🤖 AI 服务、隐私授权与额度 (Plan 05)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              严格遵循用户限制：仅支持 Gemini 系列模型；关闭 AI 不影响本地记录与历史查看。
            </p>
          </div>
          {aiConfig && (
            <button
              onClick={() => handleToggleAi(!aiConfig.enabled)}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: aiConfig.enabled ? '#dc2626' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {aiConfig.enabled ? '关闭 AI 服务' : '开启 AI 授权'}
            </button>
          )}
        </div>

        {aiFeedback && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '4px', fontSize: '0.85rem' }}>
            {aiFeedback}
          </div>
        )}

        {aiConfig && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>运行状态</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: aiConfig.enabled ? '#16a34a' : '#dc2626' }}>
                {aiConfig.enabled ? '已启用 (受控授权)' : '已关闭 (离线记录)'}
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>本周调用额度</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                {aiConfig.weekly_quota - aiConfig.used_quota} / {aiConfig.weekly_quota}{' '}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>次剩余</span>
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>提供商与模型</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0284c7' }}>
                {aiConfig.provider === 'gemini' ? aiConfig.model : 'Mock 离线演示'}
              </div>
            </div>
          </div>
        )}

        {/* AI 模型与自备 API Key 配置 */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>提供商与模型设置</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>提供商模式：</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="mock">Mock 离线启发式（无需 API Key）</option>
                <option value="gemini">Google Gemini 真实模型</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>指定 Gemini 模型（仅限批复项）：</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={selectedProvider !== 'gemini'}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="gemini-3.8-flash-high">gemini-3.8-flash-high（高推理速度与抽取）</option>
                <option value="gemini-pro-agent">gemini-pro-agent（高逻辑自洽度）</option>
              </select>
            </div>
          </div>

          {selectedProvider === 'gemini' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Gemini API Key（如已配置环境变量 GEMINI_API_KEY 则可留空）：
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={aiConfig?.has_api_key ? '已检测到有效 API Key (输入新 Key 可覆盖)' : '输入您的 Google AI Studio API Key'}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              onClick={handleSaveAiSettings}
              style={{
                padding: '0.4rem 1rem',
                backgroundColor: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              保存模型偏好
            </button>
          </div>
        </div>
      </section>

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
    </div>
  );
};
