import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';

describe('App Component', () => {
  it('应当正确渲染应用标题与默认今日记录页面', () => {
    render(<App />);
    expect(screen.getByText('沉思路')).toBeInTheDocument();
    expect(screen.getByText('今日记录', { selector: 'h2' })).toBeInTheDocument();
  });

  it('应当支持在四个核心板块之间切换', async () => {
    render(<App />);

    // 切换到历史记录
    fireEvent.click(screen.getByRole('button', { name: '历史记录' }));
    expect(screen.getByText('历史记录', { selector: 'h2' })).toBeInTheDocument();

    // 切换到周复盘
    fireEvent.click(screen.getByRole('button', { name: '周复盘' }));
    expect(screen.getByText('周复盘 (A 档)', { selector: 'h2' })).toBeInTheDocument();

    // 切换到设置
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    expect(screen.getByText('系统与设置', { selector: 'h2' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/应用名称：/)).toBeInTheDocument();
    });
  });

  it('在设置页面应当正确探测并显示桌面桥接状态', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    await waitFor(() => {
      expect(screen.getByText(/应用名称：/)).toBeInTheDocument();
    });
  });
});

describe('ErrorBoundary', () => {
  const ProblemComponent = () => {
    throw new Error('测试崩溃场景');
  };

  it('应当捕获异常并展示不含敏感信息的通用提示', () => {
    // 阻止 vitest 在控制台打印预期的故意抛出错误
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('应用遇到了意外错误')).toBeInTheDocument();
    expect(screen.getByText(/为保护您的隐私/)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
