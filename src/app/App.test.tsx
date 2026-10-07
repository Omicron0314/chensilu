import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';

describe('App Component and Plan 02 Local Recording Flow', () => {
  it('应当正确渲染应用标题与默认今日记录页面', () => {
    render(<App />);
    expect(screen.getByText('沉思路')).toBeInTheDocument();
    expect(screen.getByText('今日记录', { selector: 'h2' })).toBeInTheDocument();
  });

  it('应当支持在四个核心板块之间顺畅切换', async () => {
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

  it('在今日记录页面录入日记并保存，应当展示即时事实反馈并在历史记录中可见', async () => {
    render(<App />);

    // 1. 输入自由文本
    const textarea = screen.getByPlaceholderText(/今天做了什么/);
    fireEvent.change(textarea, { target: { value: '今天开发了 Plan 02 离线存储功能，耗时约 45 分钟。' } });

    // 2. 填写目标与状态
    const goalInput = screen.getByPlaceholderText(/提升工程架构能力/);
    fireEvent.change(goalInput, { target: { value: '沉思路开发' } });

    // 3. 添加一个包含明确时长的行动
    const actionDescInput = screen.getByPlaceholderText(/编写 Tauri 原生测试/);
    const actionMinInput = screen.getByPlaceholderText(/分钟（留空为未知）/);
    fireEvent.change(actionDescInput, { target: { value: '实现 SQLite 仓储与备份' } });
    fireEvent.change(actionMinInput, { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: '+ 添加行动' }));

    // 4. 添加一个未知时长的行动（验证未知时长不卡保存且不等于0）
    fireEvent.change(actionDescInput, { target: { value: '架构推演与代码评审' } });
    fireEvent.change(actionMinInput, { target: { value: '' } }); // 留空
    fireEvent.click(screen.getByRole('button', { name: '+ 添加行动' }));

    // 5. 添加正反馈事实
    const factInput = screen.getByPlaceholderText(/代码一次性通过全部测试/);
    fireEvent.change(factInput, { target: { value: '本地 SQLite 事务与快照备份完全通过' } });
    fireEvent.click(screen.getByRole('button', { name: '+ 记录正反馈' }));

    // 6. 点击保存
    const saveButton = screen.getByRole('button', { name: '正式保存今日记录' });
    fireEvent.click(saveButton);

    // 7. 验证即时事实反馈卡片出现
    await waitFor(() => {
      expect(screen.getByText(/即时事实反馈：/)).toBeInTheDocument();
      expect(screen.getByText(/记录了 2 项行动/)).toBeInTheDocument();
      expect(screen.getByText(/已知投入时长约 45 分钟/)).toBeInTheDocument();
      expect(screen.getByText(/未标记时长的行动/)).toBeInTheDocument();
    });

    // 8. 切换到历史记录板块查看
    fireEvent.click(screen.getByRole('button', { name: '历史记录' }));
    await waitFor(() => {
      expect(screen.getByText(/沉思路开发/)).toBeInTheDocument();
      expect(screen.getByText(/行动: 2 项/)).toBeInTheDocument();
      expect(screen.getByText(/已知投入: 45 分钟/)).toBeInTheDocument();
      expect(screen.getByText(/未知时长: 1 项/)).toBeInTheDocument();
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
