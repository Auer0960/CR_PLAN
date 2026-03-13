import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-900 text-white max-h-[40vh] overflow-auto">
                    <h1 className="text-xl font-bold mb-2">Something went wrong.</h1>
                    <h2 className="text-sm font-semibold mb-1">Error:</h2>
                    <pre className="bg-black p-2 rounded mb-2 whitespace-pre-wrap text-xs">
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <button
                        className="mt-2 px-3 py-1 bg-white text-red-900 rounded hover:bg-gray-200 text-sm"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
