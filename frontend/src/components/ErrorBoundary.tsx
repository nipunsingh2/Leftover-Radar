import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React lifecycle:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas dark:bg-[#121514] text-ink dark:text-cream flex items-center justify-center p-6">
          <div className="max-w-md w-full quirky-card p-8 text-center space-y-4 shadow-tactile border-2 border-persimmon/30">
            <div className="w-12 h-12 rounded-full bg-persimmon/10 text-persimmon flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight">Application Encountered an Error</h2>
            <p className="text-xs text-ink-muted">
              {this.state.error?.message || 'An unexpected rendering error occurred. The application state has been safely isolated.'}
            </p>
            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="btn-tactile inline-flex items-center gap-2 px-5 py-2.5 rounded-card bg-persimmon text-cream font-bold text-xs shadow-tactile hover:bg-persimmon-dark cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
