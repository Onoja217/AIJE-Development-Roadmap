import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[app] Unhandled render error", {
      error: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return <StartupError message="The application could not be displayed." />;
    }

    return this.props.children;
  }
}

export function StartupError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-center shadow-lg">
        <h1 className="text-xl font-semibold">Unable to load AIJE</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button
          className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => window.location.reload()}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
