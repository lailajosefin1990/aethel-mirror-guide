import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
  fallbackView?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error, { tags: { view: this.props.fallbackView || "unknown" } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center">
          <p className="font-display text-[18px] text-foreground mb-2">Something went wrong</p>
          <p className="font-body text-[13px] text-muted-foreground mb-6">
            This section hit an unexpected error. Your data is safe.
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 rounded-sm bg-primary text-primary-foreground font-body text-[14px]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ViewErrorBoundary;
