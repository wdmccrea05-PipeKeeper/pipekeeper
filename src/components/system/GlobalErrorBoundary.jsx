import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Enhanced logging for i18n debugging
    const currentLang = (() => {
      try {
        return localStorage.getItem('pk_lang') || 'unknown';
      } catch {
        return 'unknown';
      }
    })();

    const currentRoute = (() => {
      try {
        return window.location.pathname || 'unknown';
      } catch {
        return 'unknown';
      }
    })();

    const errorDetails = {
      error: error?.toString() || 'Unknown error',
      message: error?.message || '',
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || '',
      language: currentLang,
      route: currentRoute,
      timestamp: new Date().toISOString(),
    };

    console.error('[GlobalErrorBoundary] Error caught:', errorDetails);
    
    // Check for i18n-related errors
    if (error?.message?.includes('is not a function') || 
        error?.message?.includes('useTranslation') ||
        error?.message?.includes('formatCurrency')) {
      console.error('[GlobalErrorBoundary] ⚠️ i18n/formatter error detected!', {
        language: currentLang,
        route: currentRoute,
        errorMsg: error?.message
      });
    }

    // Send to logging endpoint (non-blocking)
    try {
      fetch('/api/log-client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorDetails),
      }).catch(() => {});
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      const isI18nError = this.state.error?.message?.includes('useTranslation') || 
                          this.state.error?.message?.includes('is not a function') ||
                          this.state.error?.message?.includes('formatCurrency');

      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1A2B3A] rounded-2xl p-8 border border-[#A35C5C]/30 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-[#E0D8C8] mb-2">Something went wrong</h1>
                <p className="text-[#E0D8C8]/70 text-sm">
                  We've encountered an unexpected error. Please try refreshing the page.
                </p>
              </div>
              
              {isI18nError && (
                <div className="w-full p-3 bg-amber-900/20 border border-amber-600/30 rounded text-left">
                  <p className="text-xs text-amber-400">
                    ⚠️ <strong>Translation error detected</strong><br/>
                    Language: {this.state.errorInfo?.language || 'unknown'}<br/>
                    Route: {this.state.errorInfo?.route || 'unknown'}
                  </p>
                </div>
              )}
              
              {process.env.NODE_ENV === 'development' && (
                <details className="w-full mt-4 text-left">
                  <summary className="text-xs text-[#E0D8C8]/50 cursor-pointer hover:text-[#E0D8C8]/70">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs text-red-400 bg-black/20 p-3 rounded overflow-auto max-h-32">
                    {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-3 mt-4 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Clear potential bad i18n state
                    try {
                      localStorage.setItem('pk_lang', 'en');
                    } catch {}
                    this.setState({ hasError: false, error: null, errorInfo: null });
                  }}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    // Reset to English on critical errors
                    try {
                      if (isI18nError) localStorage.setItem('pk_lang', 'en');
                    } catch {}
                    window.location.reload();
                  }}
                  className="flex-1"
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