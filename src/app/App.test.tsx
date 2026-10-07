import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';

describe('App Component and Plan 05 AI Privacy and Quota Flow', () => {
  it('应当正确渲染应用标题与默认今日记录页面', () => {
    render(<App />);
    expect(screen.getByText('沉思路')).toBeInTheDocument();
    expect(screen.getByText('今日记录', { selector: 'h2' })).toBeInTheDocument();
  });

  it('在设置页面应当展示 AI 授权状态、剩余额度与 Gemini 模型配置', async () => {
    render(<App />);

    // 切换到设置
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    expect(screen.getByText('系统与设置', { selector: 'h2' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/AI 服务、隐私授权与额度/)).toBeInTheDocument();
      expect(screen.getByText(/本周调用额度/)).toBeInTheDocument();
      expect(screen.getByText(/20/)).toBeInTheDocument();
    });

    // 检查模型选项包含限制的 Gemini 系列
    expect(screen.getByText(/gemini-3.8-flash-high/)).toBeInTheDocument();
  });

  it('在今日记录中通过引导对话完成一次完整记录', async () => {
    render(<App />);

    const chatInput = screen.getByPlaceholderText(/随口说说今天做了什么/);
    fireEvent.change(chatInput, { target: { value: '今天做沉思路开发大概花了45分钟，完成全部测试' } });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    await waitFor(() => {
      expect(screen.getByText(/今天你主要在进行/)).toBeInTheDocument();
    });

    const extractBtn = screen.getByRole('button', { name: /一键提取为五栏草稿/ });
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(screen.getByText(/45 分钟/)).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: '正式保存今日记录' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/即时事实反馈：/)).toBeInTheDocument();
    });
  });
});

describe('ErrorBoundary', () => {
  const ProblemComponent = () => {
    throw new Error('测试崩溃场景');
  };

  it('应当捕获异常并展示不含敏感信息的通用提示', () => {
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
