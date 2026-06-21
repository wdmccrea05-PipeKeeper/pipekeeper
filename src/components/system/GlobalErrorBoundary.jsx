import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, RefreshCw } from "lucide-react";
import BrandLogo from "@/components/branding/BrandLogo";
import { useTranslation } from '@/components/i18n/safeTranslation';

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

  render() {
  const { t } = useTranslation();
    if (this.state.hasError) {
      const isI18nError =
        this.state.error?.message?.includes("useTranslation") ||
        this.state.error?.message?.includes("is not a function") ||
        this.state.error?.message?.includes("formatCurrency");

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
              {t("auto.components_system_GlobalErrorBoundary.collectionkeeper_1ukoz8")}
            </p>

            <h1
              className="text-3xl font-bold mb-3"
              style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}
            >
              {t("auto.components_system_GlobalErrorBoundary.something_went_wrong_1rkfwe")}
            </h1>

            <p className="text-sm mb-5" style={{ color: "rgba(224,216,200,0.72)" }}>
              {t("auto.components_system_GlobalErrorBoundary.an_unexpected_error_occurred_please_try_nn0yh8")}
            </p>

            {isI18nError ? (
              <div
                className="w-full p-3 rounded-xl text-left mb-5"
                style={{
                  background: "rgba(180,140,75,0.08)",
                  border: "1px solid rgba(180,140,75,0.22)",
                }}
              >
                <p className="text-xs text-[#D8C7A6] leading-relaxed">
                  {t("auto.components_system_GlobalErrorBoundary.translation_error_detected_158ter")}
                  <br />
                  {t("auto.components_system_GlobalErrorBoundary.language_6qfocj")} {this.state.diagnostics?.language || "unknown"}
                  <br />
                  {t("auto.components_system_GlobalErrorBoundary.route_1li6yq")} {this.state.diagnostics?.route || "unknown"}
                </p>
              </div>
            ) : null}

            {import.meta?.env?.DEV ? (
              <details className="w-full mt-2 text-left mb-5">
                <summary className="text-xs text-[#E0D8C8]/55 cursor-pointer hover:text-[#E0D8C8]/75">
                  {t("auto.components_system_GlobalErrorBoundary.error_details_13xzx8")}
                </summary>
                <pre
                  className="mt-2 text-xs p-3 rounded overflow-auto max-h-36"
                  style={{
                    color: "#F4C1C1",
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(163,92,92,0.18)",
                  }}
                >
                  {this.state.error?.stack ||
                    this.state.error?.message ||
                    String(this.state.error)}
                </pre>
              </details>
            ) : null}

            <div className="flex gap-3 mt-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    localStorage.setItem("pk_lang", "en");
                  } catch {}
                  this.setState({ hasError: false, error: null, diagnostics: null });
                }}
                className="flex-1"
                style={{
                  borderColor: "rgba(180,140,75,0.28)",
                  color: "#E0D8C8",
                  background: "transparent",
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("auto.components_system_GlobalErrorBoundary.try_again_4ztias")}
              </Button>

              <Button
                onClick={() => {
                  try {
                    if (isI18nError) localStorage.setItem("pk_lang", "en");
                  } catch {}
                  window.location.reload();
                }}
                className="flex-1"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(163,92,92,0.92), rgba(143,72,72,0.96))",
                  color: "#FFF7F3",
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("auto.components_system_GlobalErrorBoundary.reload_page_1s1teg")}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;