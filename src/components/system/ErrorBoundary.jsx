import React from "react";
import { translate } from "@/components/i18n/safeTranslation";
import BrandLogo from "@/components/branding/BrandLogo";
import { AlertCircle } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[CollectionKeeper] Fatal UI Error:", error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const lang = (() => {
      try {
        return localStorage.getItem("pk_lang") || "en";
      } catch {
        return "en";
      }
    })();

    const isDev =
      typeof window !== "undefined" &&
      (window.location?.hostname?.includes("localhost") ||
        window.location?.hostname?.includes("preview") ||
        window.location?.hostname?.includes("base44"));

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background:
            "linear-gradient(135deg, #0f0b08 0%, #1a1410 50%, #0f0b08 100%)",
        }}
      >
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center"
          style={{
            background:
              "linear-gradient(145deg, rgba(42,30,20,0.96), rgba(28,18,12,0.98))",
            border: "1px solid rgba(120,90,65,0.35)",
            boxShadow: "0 18px 52px rgba(0,0,0,0.55)",
          }}
        >
          <BrandLogo
            compact
            showWordmark={false}
            imageClassName="w-16 h-16 mx-auto mb-4 opacity-95"
          />

          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(163,92,92,0.12)",
              border: "1px solid rgba(163,92,92,0.28)",
            }}
          >
            <AlertCircle className="w-6 h-6 text-[#D27B7B]" />
          </div>

          <p
            className="text-xs uppercase tracking-[0.14em] font-bold mb-2"
            style={{ color: "#B48C4B" }}
          >
            CollectionKeeper
          </p>

          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}
          >
            {translate("errorBoundary.title", {}, lang)}
          </h2>

          <p className="text-sm mb-5" style={{ color: "rgba(224,216,200,0.72)" }}>
            {translate("errorBoundary.body", {}, lang)}
          </p>

          {isDev ? (
            <pre
              className="text-left text-xs p-3 rounded overflow-auto max-h-48"
              style={{
                whiteSpace: "pre-wrap",
                color: "#F4C1C1",
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(163,92,92,0.18)",
              }}
            >
              {String(this.state.error || "")}
              {"\n\n"}
              {String(this.state.info?.componentStack || "")}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}