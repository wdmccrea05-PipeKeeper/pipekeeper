// src/components/system/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Helps debugging in iOS WKWebView where you otherwise get a white screen
    console.error("[PipeKeeper] Fatal UI Error:", error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev =
      typeof window !== "undefined" &&
      (window.location?.hostname?.includes("localhost") ||
        window.location?.hostname?.includes("preview") ||
        window.location?.hostname?.includes("base44"));

    return (
      <div style={{ padding: 18, fontFamily: "system-ui", lineHeight: 1.4 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>PipeKeeper failed to load</h2>
        <p style={{ opacity: 0.8, marginBottom: 12 }}>
          Please close and reopen the app. If this keeps happening, contact support.
        </p>

        {isDev && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#111",
              color: "#fff",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
              maxHeight: 240,
            }}
          >
            {String(this.state.error || "")}
            {"\n\n"}
            {String(this.state.info?.componentStack || "")}
          </pre>
        )}
      </div>
    );
  }
}