import React, { useState } from 'react';
import { NavigationTab } from '../shared/contracts';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { RecordingPage } from '../features/recording/RecordingPage';
import { EntriesPage } from '../features/entries/EntriesPage';
import { ReviewsPage } from '../features/reviews/ReviewsPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('recording');

  const renderTabContent = () => {
    switch (currentTab) {
      case 'recording':
        return <RecordingPage />;
      case 'entries':
        return <EntriesPage />;
      case 'reviews':
        return <ReviewsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <RecordingPage />;
    }
  };

  const navItems: { key: NavigationTab; label: string }[] = [
    { key: 'recording', label: '今日记录' },
    { key: 'entries', label: '历史记录' },
    { key: 'reviews', label: '周复盘' },
    { key: 'settings', label: '设置' },
  ];

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* 顶部标题栏 */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#1a1a1a' }}>
              沉思路
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#666', borderLeft: '1px solid #ddd', paddingLeft: '0.75rem' }}>
              AI 日记助手
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#888', backgroundColor: '#f0f0f0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            Plan 01 原生桌面基准
          </span>
        </header>

        {/* 主体双栏布局：左侧轻量导航，右侧内容区 */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <nav
            style={{
              width: '180px',
              borderRight: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              padding: '1rem 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {navItems.map((item) => {
              const active = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setCurrentTab(item.key)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: active ? '#e9ecef' : 'transparent',
                    color: active ? '#000' : '#495057',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', backgroundColor: '#ffffff' }}>
            {renderTabContent()}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};
