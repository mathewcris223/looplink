import { createRoot } from "react-dom/client";
import { Component, ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

// Top-level error boundary — prevents white screen on uncaught errors
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Something went wrong</h1>
            <p style={{ color: "#666", marginBottom: "1rem" }}>{(this.state.error as Error).message}</p>
            <a href="/" style={{ color: "#10b981", textDecoration: "underline" }}>Reload page</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
