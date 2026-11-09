import React from 'react';
import { AlertCircle, RotateCcw, Home, ArrowLeft } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="max-w-lg w-full p-8 rounded-3xl bg-[#14111f] border border-rose-900/60 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Oops! Something went wrong</h2>
              <p className="text-xs text-[#9f99b0] leading-relaxed">
                An unexpected interface error occurred while rendering this view. Your study data and progress are safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-2xl bg-[#1c1729] border border-rose-900/40 text-left font-mono text-[11px] text-rose-300 break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <a
                href="/workspaces"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1c1729] hover:bg-[#251e35] border border-[#383050] text-[#9f99b0] hover:text-white font-semibold text-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Workspaces</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
