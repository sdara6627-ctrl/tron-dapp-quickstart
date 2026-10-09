import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <h2>出错了</h2>
                        <p>{this.state.error?.message || '未知错误'}</p>
                        <button onClick={() => window.location.reload()}>刷新页面</button>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
