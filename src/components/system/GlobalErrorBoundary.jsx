import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, diagnostics: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const currentLang = (() => {
      try {
        return localStorage.getItem("pk_lang") || "unknown";
      } catch {
        return "unknown";
      }
    })();

    const currentRoute = (() => {
      try {
        return window.location.pathname || "unknown";
      } catch {
        return "unknown";
      }
    })();

    const errorDetails = {
      error: error?.toString() || "Unknown error",
      message: error?.message || "",
      stack: error?.stack || "",
      componentStack: errorInfo?.componentStack || "",
      language: currentLang,
      route: currentRoute,
      timestamp: new Date().toISOString(),
    };

    this.setState({ diagnostics: errorDetails });
    console.error("[GlobalErrorBoundary] Error caught:", errorDetails);
  }

  handleTryAgain = () => {
    try {
      localStorage.setItem("pk_lang", "en");
    } catch {}
    this.setState({ hasError: false, error: null, diagnostics: null });
  };

  handleReload = () => {
    try {
      localStorage.setItem("pk_lang", "en");
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{
            background:
              "radial-gradient(circle at top, rgba(40,28,18,0.95), rgba(10,8,8,1) 60%)",
          }}
        >
          <div
            className="max-w-md w-full rounded-3xl p-8 shadow-2xl"
            style={{
              background:
                "linear-gradient(145deg, rgba(38,26,18,0.98), rgba(22,16,12,1))",
              border: "1px solid rgba(180,140,75,0.22)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <img
                src="/branding/collectionkeeper-logo.png"
                alt="CollectionKeeper"
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6838e48a7_IMG_4833.jpeg";
                }}
              />

              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(180,80,80,0.14)",
                  border: "1px solid rgba(180,80,80,0.28)",
                }}
              >
                <AlertCircle className="w-6 h-6 text-[#D36B6B]" />
              </div>

              <div>
                <h1 className="text-4xl font-bold text-[#F5F1E7] mb-3 leading-tight">
                  Something went wrong
                </h1>
                <p className="text-[#E0D8C8]/78 text-lg leading-relaxed">
                  An unexpected error occurred. Please try again or reload the page.
                </p>
              </div>

              {import.meta?.env?.DEV ? (
                <details className="w-full mt-2 text-left">
                  <summary className="text-xs text-[#E0D8C8]/55 cursor-pointer hover:text-[#E0D8C8]/75">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-300 bg-black/25 p-3 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error?.stack ||
                      this.state.error?.message ||
                      String(this.state.error)}
                  </pre>
                </details>
              ) : null}

              <div className="flex gap-3 mt-4 w-full">
                <Button
                  variant="outline"
                  onClick={this.handleTryAgain}
                  className="flex-1"
                  style={{
                    borderColor: "rgba(180,140,75,0.28)",
                    color: "#F0E6D6",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="flex-1"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(180,100,100,1), rgba(150,80,80,1))",
                    color: "#fff",
                  }}
                >
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;