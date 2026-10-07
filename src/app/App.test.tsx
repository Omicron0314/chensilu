import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';

describe('App Component and Plan 03 Guided Chat and Recording Flow', () => {
  it('应当正确渲染应用标题与默认今日记录页面', () => {
    render(<App />);
    expect(screen.getByText('沉思路')).toBeInTheDocument();
    expect(screen.getByText('今日记录', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/先复述一句，再问一个具体问题/)).toBeInTheDocument();
  });

  it('在对话引导中发送一轮对话并能触发 AI 复述与追问', async () => {
    render(<App />);

    const chatInput = screen.getByPlaceholderText(/随口说说今天做了什么/);
    fireEvent.change(chatInput, { target: { value: '今天读了《人月神话》，思考了软件工程团队规模' } });

    const sendBtn = screen.getByRole('button', { name: '发送' });
    fireEvent.click(sendBtn);

    // AI 应返回包含复述与提问的回复
    await waitFor(() => {
      expect(screen.getByText(/今天你主要在进行/)).toBeInTheDocument();
    });
  });

  it('点击「今天不想写 / 休息」应当体贴回复并停止追问', async () => {
    render(<App />);

    const restBtn = screen.getByRole('button', { name: /今天不想写 \/ 休息/ });
    fireEvent.click(restBtn);

    await waitFor(() => {
      expect(screen.getByText(/安心休息/)).toBeInTheDocument();
    });
  });

  it('可以通过「一键提取为五栏草稿」将对话内容填入五栏编辑表单并成功保存', async () => {
    render(<App />);

    // 1. 发送包含时长的回答
    const chatInput = screen.getByPlaceholderText(/随口说说今天做了什么/);
    fireEvent.change(chatInput, { target: { value: '今天做沉思路开发大概花了45分钟，完成全部测试' } });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    await waitFor(() => {
      expect(screen.getByText(/今天你主要在进行/)).toBeInTheDocument();
    });

    // 2. 点击一键提取为五栏草稿
    const extractBtn = screen.getByRole('button', { name: /一键提取为五栏草稿/ });
    fireEvent.click(extractBtn);

    // 3. 验证五栏抽取项出现
    await waitFor(() => {
      expect(screen.getByText(/45 分钟/)).toBeInTheDocument();
      expect(screen.getAllByText(/待确认候选/).length).toBeGreaterThan(0);
    });

    // 4. 正式保存
    const saveBtn = screen.getByRole('button', { name: '正式保存今日记录' });
    fireEvent.click(saveBtn);

    // 5. 校验即时事实反馈
    await waitFor(() => {
      expect(screen.getByText(/即时事实反馈：/)).toBeInTheDocument();
      expect(screen.getByText(/记录已安全入库/)).toBeInTheDocument();
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
