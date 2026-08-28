import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-rose-500/30 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              The application encountered an unexpected UI error.
            </p>
            <div className="bg-slate-900/90 p-3 rounded-lg text-xs font-mono text-rose-300 text-left mb-6 overflow-x-auto max-h-32 border border-rose-900/40">
              {this.state.error?.toString() || 'Unknown UI Error'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
