import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { scopedEntities } from '@/components/api/scopedEntities';
import { useNavigate } from '@/components/utils/navigation';

export default function SelfDiagnosticPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const userEmail = user?.email || null;

  const [issues, setIssues] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const diagnostics = [
    {
      id: 'stale-pairings',
      name: 'Stale AI Pairings',
      check: async () => {
        if (!userEmail) return null;

        const pairings = await base44.entities.PairingMatrix?.filter?.(
          { created_by: userEmail, is_active: true },
          '-created_date',
          1
        );

        if (!pairings || pairings.length === 0) return null;

        const pairing = pairings[0];
        const pairingDate = new Date(pairing.generated_date || pairing.created_date).getTime();
        const now = Date.now();
        const daysSince = (now - pairingDate) / (1000 * 60 * 60 * 24);

        return daysSince > 7
          ? {
              severity: 'warning',
              message: t(
                'help.stalePairingsMsg',
                `Your pairings are ${Math.floor(daysSince)} days old`
              ),
              action: 'Regenerate Pairings',
              actionUrl: '/PipeKeeper?tab=pairings',
            }
          : null;
      },
    },
    {
      id: 'cached-ui',
      name: 'Cached UI Issues',
      check: () => {
        if ('serviceWorker' in navigator) {
          return {
            severity: 'info',
            message: t(
              'help.cacheDetected'
            ),
            action: 'Hard Refresh (Ctrl+Shift+R)',
            actionType: 'keyboard',
          };
        }
        return null;
      },
    },
    {
      id: 'stale-insights',
      name: 'Stale Insights',
      check: async () => {
        const lastInsightRefresh = sessionStorage.getItem('pk_last_insight_refresh');
        if (lastInsightRefresh) {
          const lastTime = new Date(lastInsightRefresh).getTime();
          const now = Date.now();
          const hoursSince = (now - lastTime) / (1000 * 60 * 60);

          if (hoursSince > 4) {
            return {
              severity: 'info',
              message: t(
                'help.staleInsights'
              ),
              action: 'Refresh Insights',
              actionUrl: '/Insights',
            };
          }
        }
        return null;
      },
    },
    {
      id: 'missing-regeneration',
      name: 'Missing Pairing Regeneration',
      check: async () => {
        if (!userEmail) return null;

        const [pipes, pairings] = await Promise.all([
          scopedEntities.Pipe.listForUser(userEmail, '-updated_date', 500).catch(() => []),
          base44.entities.PairingMatrix?.filter?.(
            { created_by: userEmail, is_active: true },
            '-created_date',
            1
          ),
        ]);

        if (!pipes || pipes.length === 0 || !pairings || pairings.length === 0) return null;

        const pairingDate = new Date(
          pairings[0].generated_date || pairings[0].created_date
        ).getTime();

        const hasRecentPipe = pipes.some((p) => {
          const pipeDate = new Date(p.updated_date || p.created_date || 0).getTime();
          return pipeDate > pairingDate;
        });

        if (hasRecentPipe) {
          return {
            severity: 'warning',
            message: t(
              'help.needsRegeneration'
            ),
            action: 'Regenerate',
            actionUrl: '/PipeKeeper?tab=pairings',
          };
        }

        return null;
      },
    },
  ];

  const runDiagnostics = async () => {
    setIsScanning(true);
    setIssues([]);

    for (const diagnostic of diagnostics) {
      try {
        const issue = await diagnostic.check();
        if (issue) {
          setIssues((prev) => [
            ...prev,
            {
              id: diagnostic.id,
              name: diagnostic.name,
              ...issue,
            },
          ]);
        }
      } catch (e) {
        console.warn(`Diagnostic ${diagnostic.id} failed:`, e);
      }
    }

    setIsScanning(false);
    setHasScanned(true);
  };

  return (
    <div className="rounded-lg border border-[rgba(180,140,75,0.2)] bg-[rgba(180,140,75,0.05)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#F5F1E7]">
          {t('help.selfDiagnostic')}
        </h3>
        <Button
          onClick={runDiagnostics}
          disabled={isScanning || !userEmail}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isScanning
            ? t('help.scanning')
            : t('help.runDiagnostic')}
        </Button>
      </div>

      {!userEmail && (
        <p className="text-xs text-[#D7C9B2]/60">
          {t(
            'help.diagnosticRequiresUser'
          )}
        </p>
      )}

      {hasScanned && issues.length === 0 && !isScanning && userEmail && (
        <div className="flex items-center gap-2 text-sm text-[#10B981]">
          <CheckCircle2 className="w-4 h-4" />
          {t('help.allSystemsNormal')}
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border flex items-start gap-3 ${
                issue.severity === 'warning'
                  ? 'border-[rgba(240,167,0,0.2)] bg-[rgba(240,167,0,0.05)]'
                  : 'border-[rgba(100,150,200,0.2)] bg-[rgba(100,150,200,0.05)]'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  issue.severity === 'warning'
                    ? 'text-[#F59E0B]'
                    : 'text-[#3B82F6]'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F5F1E7]">{issue.name}</p>
                <p className="text-xs text-[#D7C9B2]/70 mt-1">{issue.message}</p>
                {issue.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs h-7"
                    onClick={
                      issue.actionType === 'keyboard'
                        ? undefined
                        : () => {
                            if (issue.actionUrl) {
                              navigate(issue.actionUrl);
                            }
                          }
                    }
                  >
                    {issue.action}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasScanned && !isScanning && userEmail && (
        <p className="text-xs text-[#D7C9B2]/60">
          {t(
            'help.diagnosticDesc'
          )}
        </p>
      )}
    </div>
  );
}