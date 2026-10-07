import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCode: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorCode: '',
  };

  public static getDerivedStateFromError(_: Error): State {
    return {
      hasError: true,
      errorCode: `ERR_${Date.now().toString(36).toUpperCase()}`,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 敏感脱敏约定：严禁在日志中记录用户日记或输入正文，仅记录错误名称与堆栈类型
    console.error('应用捕获异常:', {
      name: error.name,
      componentStack: errorInfo.componentStack?.slice(0, 300),
    });
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorCode: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#c00' }}>
          <h2>应用遇到了意外错误</h2>
          <p>错误标识：{this.state.errorCode}</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            为保护您的隐私，错误日志不会记录任何日记正文。
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.5rem 1rem',
              marginTop: '1rem',
              cursor: 'pointer',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#fff',
            }}
          >
            重新加载应用
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
