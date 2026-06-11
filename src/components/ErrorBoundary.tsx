import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Top-level error boundary. Catches any unhandled render-time exceptions
 * and shows a recoverable UI instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "hsl(var(--background, 0 0% 100%))",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "hsl(0 84% 60% / 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="hsl(0 84% 60%)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: "1.125rem", margin: 0 }}>
            Something went wrong
          </p>
          <p
            style={{
              marginTop: "0.25rem",
              fontSize: "0.875rem",
              color: "#6b7280",
              maxWidth: "24rem",
            }}
          >
            An unexpected error occurred in the admin dashboard. Please reload
            the page. If the problem persists, contact the platform team.
          </p>
        </div>
        <button
          onClick={this.handleReload}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: "0.5rem",
            background: "hsl(var(--primary, 221 83% 53%))",
            color: "#fff",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }
}
