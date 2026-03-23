import React from 'react';
import { Button } from "@/components/ui/button";
import { translate } from "@/components/i18n/safeTranslation";
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
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
      const { onReset } = this.props;
      return (
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(42,30,20,0.96), rgba(28,18,12,0.98))',
            border: '1px solid rgba(120,90,65,0.35)',
          }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}>
            <AlertCircle className="w-5 h-5" style={{ color: 'rgba(180,140,75,0.7)' }} />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] font-bold mb-2" style={{ color: '#B48C4B' }}>CollectionKeeper</p>
          <h3 className="text-base font-semibold mb-2" style={{ color: '#F5F1E7' }}>
            {translate("errorBoundary.title", "Something went wrong")}
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {translate("errorBoundary.body", "Please close and reopen the app. If this keeps happening, contact support.")}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (onReset) onReset();
              window.location.reload();
            }}
            variant="outline"
          >
            {translate("errorBoundary.reload", "Reload Page")}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;