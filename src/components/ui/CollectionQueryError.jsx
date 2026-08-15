import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Non-destructive error banner for collection data queries.
// Shows when isError is true, preserves any existing data underneath.
// Used across insights pages, hub, and share surfaces to surface
// data-load failures without overwriting last-known-good state.
export default function CollectionQueryError({ isError, onRetry, label, compact = false }) {
  return isError ? (
    <div
      className={`rounded-lg ${compact ? 'p-2.5' : 'p-3'} mb-3`}
      style={{
        background: 'rgba(179,95,95,0.08)',
        border: '1px solid rgba(179,95,95,0.25)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#b35f5f' }} />
          <p className="text-sm truncate" style={{ color: 'rgba(224,216,200,0.85)' }}>
            {label || 'Some data could not be loaded. Your existing collection is still visible.'}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: '#D4A574',
              background: 'rgba(180,140,75,0.1)',
              border: '1px solid rgba(180,140,75,0.2)',
              minHeight: 36,
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  ) : null;
}