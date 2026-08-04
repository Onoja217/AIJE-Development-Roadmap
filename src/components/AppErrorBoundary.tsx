import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary so a render-time exception in any route shows a
 * recoverable fallback instead of a blank screen.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
