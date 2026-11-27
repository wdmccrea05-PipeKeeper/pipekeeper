import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/components/i18n/safeTranslation';
import AppreciationBanner from '@/components/campaign/AppreciationBanner';

const GOLD = '#D4A574';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'rgba(224,216,200,0.55)' }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{value}</p>
      {hint && <p className="text-[11px] mt-1" style={{ color: 'rgba(224,216,200,0.45)' }}>{hint}</p>}
    </div>
  );
}

/** Admin control and reporting surface for the collector appreciation campaign. */
export default function AppreciationCampaignAdmin() {
  const { t } = useTranslation();
  const { isAdmin, isLoading: userLoading } = useCurrentUser();
  const [report, setReport] = useState(null);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [cutoff, setCutoff] = useState('');
  const [deadline, setDeadline] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, grantsRes] = await Promise.all([
        base44.functions.invoke('adminAppreciationCampaign', { action: 'report' }),
        base44.functions.invoke('adminAppreciationCampaign', { action: 'grants' }),
      ]);
      const data = reportRes?.data || null;
      setReport(data);
      setGrants(grantsRes?.data?.grants || []);
      setEnabled(data?.campaign?.is_enabled !== false);
      setCutoff(toLocalInput(data?.campaign?.eligibility_cutoff));
      setDeadline(toLocalInput(data?.campaign?.redemption_deadline));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && isAdmin) load();
  }, [userLoading, isAdmin, load]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('adminAppreciationCampaign', {
        action: 'update',
        is_enabled: enabled,
        eligibility_cutoff: cutoff ? new Date(cutoff).toISOString() : null,
        redemption_deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const funnel = report?.funnel || {};
  const conversion = report?.conversion || {};
  const population = report?.population || {};
  const grantStats = report?.grants || {};
  const featureRows = useMemo(
    () => Object.entries(report?.engagement?.by_feature || {}).sort((a, b) => b[1] - a[1]),
    [report]
  );

  if (userLoading) return <div className="p-8 text-sm" style={{ color: '#E0D8C8' }}>…</div>;
  if (!isAdmin) return <div className="p-8 text-sm" style={{ color: '#E0D8C8' }}>{t('appreciation.adminForbidden')}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6" style={{ color: '#E0D8C8' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>{t('appreciation.adminTitle')}</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {t('appreciation.adminSubtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>{t('appreciation.adminPreview')}</Button>
          <Button variant="outline" onClick={load} disabled={loading}>{t('appreciation.adminRefresh')}</Button>
        </div>
      </div>

      <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
        <CardHeader><CardTitle className="text-base" style={{ color: '#F5F1E7' }}>{t('appreciation.adminControls')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{t('appreciation.adminEnabled')}</p>
              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('appreciation.adminEnabledHint')}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs space-y-1 block">
              <span style={{ color: 'rgba(224,216,200,0.7)' }}>{t('appreciation.adminCutoff')}</span>
              <Input type="datetime-local" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
            </label>
            <label className="text-xs space-y-1 block">
              <span style={{ color: 'rgba(224,216,200,0.7)' }}>{t('appreciation.adminDeadline')}</span>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              {report?.campaign?.redemption_closed && (
                <span className="block text-[11px]" style={{ color: '#F0B9A8' }}>
                  {t('appreciation.adminDeadlineClosed')}
                </span>
              )}
            </label>
          </div>
          <Button onClick={save} disabled={saving} style={{ background: GOLD, color: '#241811' }}>
            {saving ? t('appreciation.adminSaving') : t('appreciation.adminSave')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t('appreciation.adminEligible')} value={population.eligible_now ?? '—'} hint={t('appreciation.adminEligibleHint')} />
        <Metric label={t('appreciation.adminImpressions')} value={funnel.impressions ?? '—'} />
        <Metric label={t('appreciation.adminDismissals')} value={funnel.dismissals ?? '—'} />
        <Metric label={t('appreciation.adminActivations')} value={funnel.activations ?? '—'} />
        <Metric label={t('appreciation.adminActive')} value={grantStats.active ?? '—'} />
        <Metric label={t('appreciation.adminExpired')} value={grantStats.expired ?? '—'} />
        <Metric label={t('appreciation.adminConversions')} value={conversion.conversions_total ?? '—'} />
        <Metric label={t('appreciation.adminRevenue')} value={conversion.attributed_first_invoice_revenue ?? '—'} hint={t('appreciation.adminRevenueHint')} />
        <Metric label={t('appreciation.adminConv7')} value={conversion.conversions_within_7d ?? '—'} />
        <Metric label={t('appreciation.adminConv14')} value={conversion.conversions_within_14d ?? '—'} />
        <Metric label={t('appreciation.adminConv30')} value={conversion.conversions_within_30d ?? '—'} />
        <Metric label={t('appreciation.adminRate')} value={conversion.campaign_conversion_rate != null ? `${Math.round(conversion.campaign_conversion_rate * 100)}%` : '—'} />
      </div>

      <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
        <CardHeader><CardTitle className="text-base" style={{ color: '#F5F1E7' }}>{t('appreciation.adminEngagement')}</CardTitle></CardHeader>
        <CardContent>
          {featureRows.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('appreciation.adminNoEngagement')}</p>
          ) : (
            <ul className="space-y-1.5">
              {featureRows.map(([feature, count]) => (
                <li key={feature} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'rgba(224,216,200,0.8)' }}>{feature}</span>
                  <span style={{ color: GOLD }}>{count}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] mt-3" style={{ color: 'rgba(224,216,200,0.4)' }}>{conversion.attribution_rule}</p>
        </CardContent>
      </Card>

      <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
        <CardHeader><CardTitle className="text-base" style={{ color: '#F5F1E7' }}>{t('appreciation.adminGrants')}</CardTitle></CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('appreciation.adminNoGrants')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: 'rgba(224,216,200,0.55)' }}>
                    <th className="text-left py-1.5 pr-3">{t('appreciation.adminGrantEmail')}</th>
                    <th className="text-left py-1.5 pr-3">{t('appreciation.adminGrantActivated')}</th>
                    <th className="text-left py-1.5 pr-3">{t('appreciation.adminGrantExpires')}</th>
                    <th className="text-left py-1.5">{t('appreciation.adminGrantStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((grant) => (
                    <tr key={grant.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td className="py-1.5 pr-3" style={{ color: 'rgba(224,216,200,0.85)' }}>{grant.user_email}</td>
                      <td className="py-1.5 pr-3">{new Date(grant.activated_at).toLocaleString()}</td>
                      <td className="py-1.5 pr-3">{new Date(grant.expires_at).toLocaleString()}</td>
                      <td className="py-1.5" style={{ color: grant.status === 'active' ? '#7BC29A' : 'rgba(224,216,200,0.55)' }}>{grant.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-0">
          <DialogHeader className="sr-only"><DialogTitle>{t('appreciation.adminPreview')}</DialogTitle></DialogHeader>
          <AppreciationBanner surface="admin_preview" preview />
        </DialogContent>
      </Dialog>
    </div>
  );
}