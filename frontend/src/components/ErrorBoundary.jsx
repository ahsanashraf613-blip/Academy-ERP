import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FBFAF7] px-4">
          <div className="max-w-sm text-center">
            <p className="font-display text-3xl text-rose-600 mb-4">Oops!</p>
            <p className="text-slate-600 mb-6">Something went wrong. Please refresh the page and try again.</p>
            <details className="text-sm text-slate-500 bg-slate-50 p-3 rounded mb-4 text-left">
              <summary className="cursor-pointer font-medium mb-2">Error details</summary>
              <pre className="overflow-auto text-xs">{this.state.error?.toString()}</pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
