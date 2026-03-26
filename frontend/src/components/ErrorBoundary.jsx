import React from 'react';
import '../styles/ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Send to your logging endpoint so admins can see
    // what crashed on a specific team's device
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        teamId: this.props.teamId || 'unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {}); // Fire-and-forget
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__card">
            <div className="error-boundary__icon">⚠️</div>
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              {this.props.fallbackMessage ||
                'The game encountered an unexpected error.'}
            </p>

            {/* Only show technical details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary__details">
                <summary>Technical Details</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}

            <button
              className="error-boundary__retry"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
            <button
              className="error-boundary__reload"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
