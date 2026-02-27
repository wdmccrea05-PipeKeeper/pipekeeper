import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

class ErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { t, onReset } = this.props;
      return (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-rose-800 mb-2">
              {t("errorBoundary.title")}
            </h3>
            <p className="text-sm text-rose-600 mb-4">
              {this.state.error?.message || t("errorBoundary.message")}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (onReset) onReset();
                window.location.reload();
              }}
              variant="outline"
              className="border-rose-300 text-rose-700"
            >
              {t("errorBoundary.reload")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({ children }) {
  const { t } = useTranslation();
  return (
    <ErrorBoundaryCore t={t}>{children}</ErrorBoundaryCore>
  );
}