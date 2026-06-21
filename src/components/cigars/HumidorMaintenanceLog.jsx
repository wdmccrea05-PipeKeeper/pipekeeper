import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Droplets, Thermometer, PackagePlus, RefreshCcw, Sparkles, Sun, ClipboardList, Plus, Trash2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { QUERY_KEYS } from '@/lib/queryKeys';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { formatDate } from '@/components/utils/localeFormatters';

const EVENT_TYPES = [
  { value: 'humidity_check', label: 'Humidity Check', Icon: Droplets },
  { value: 'temperature_check', label: 'Temperature Check', Icon: Thermometer },
  { value: 'aid_replaced', label: 'Aid Replaced', Icon: PackagePlus },
  { value: 'aid_refilled', label: 'Aid Refilled / Recharged', Icon: RefreshCcw },
  { value: 'humidor_cleaned', label: 'Humidor Cleaned', Icon: Sparkles },
  { value: 'seasonal_adjustment', label: 'Seasonal Adjustment', Icon: Sun },
  { value: 'other', label: 'Other / General Note', Icon: ClipboardList },
];

const AID_TYPES = [
  { value: 'boveda', label: 'Boveda Pack' },
  { value: 'gel_jar', label: 'Gel Jar' },
  { value: 'beads', label: 'Beads' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'sponge', label: 'Sponge / Floral Foam' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  event_type: 'humidity_check',
  date: new Date().toISOString().split('T')[0],
  humidity_reading: '',
  temperature_reading: '',
  aid_type: '',
  aid_brand: '',
  aid_specification: '',
  notes: '',
};

const QUICK_MAINTENANCE_PRESETS = {
  replaced_boveda: {
    event_type: 'aid_replaced',
    aid_type: 'boveda',
    aid_brand: 'Boveda',
    notes: 'Replaced Boveda pack',
  },
  recharged_beads: {
    event_type: 'aid_refilled',
    aid_type: 'beads',
    notes: 'Recharged humidity beads',
  },
  rotated_cigars: {
    event_type: 'other',
    notes: 'Rotated cigars for even aging',
  },
  inspected_humidor: {
    event_type: 'humidity_check',
    notes: 'Inspected humidor conditions',
  },
  cleaned_humidor: {
    event_type: 'humidor_cleaned',
    notes: 'Cleaned humidor interior',
  },
  other_note: {
    event_type: 'other',
    notes: '',
  },
};

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(180,140,75,0.22)',
  color: '#F5F1E7',
  borderRadius: '0.5rem',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.25rem',
  color: 'rgba(224,216,200,0.6)',
};

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return val;
  return formatDate(d, 'medium');
}

function EventTypeIcon({ type, size = 14 }) {
  const match = EVENT_TYPES.find((e) => e.value === type);
  const Icon = match?.Icon ?? ClipboardList;
  return <Icon style={{ width: size, height: size, flexShrink: 0 }} />;
}

function EventTypeBadge({ type }) {
  const match = EVENT_TYPES.find((e) => e.value === type);
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(180,140,75,0.15)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.25)' }}
    >
      <EventTypeIcon type={type} size={10} />
      {match?.label ?? type}
    </span>
  );
}

function isAidEvent(eventType) {
  return eventType === 'aid_replaced' || eventType === 'aid_refilled';
}

const ReadingTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-2 py-1.5 text-xs"
      style={{ background: 'rgba(40,28,18,0.96)', border: '1px solid rgba(180,140,75,0.24)', color: '#F5F1E7' }}
    >
      <p className="font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function HumidorMaintenanceLog({ humidorId, humidorName, onEntryLogged, openComposerNonce }) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['humidor-maintenance-logs', humidorId],
    queryFn: () => base44.entities.HumidorMaintenanceLog.filter({ humidor_id: humidorId, created_by: user?.email }, '-date', 50),
    enabled: !!humidorId && !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        humidor_id: humidorId,
        humidor_name: humidorName,
        created_by: user?.email,
        event_type: data.event_type,
        date: data.date,
        ...(data.humidity_reading ? { humidity_reading: parseFloat(data.humidity_reading) } : {}),
        ...(data.temperature_reading ? { temperature_reading: parseFloat(data.temperature_reading) } : {}),
        ...(data.aid_type ? { aid_type: data.aid_type } : {}),
        ...(data.aid_brand ? { aid_brand: data.aid_brand } : {}),
        ...(data.aid_specification ? { aid_specification: data.aid_specification } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      };
      // Step 1: Create the log entry — this is the critical step.
      const created = await base44.entities.HumidorMaintenanceLog.create(payload);

      // Step 2: Update humidor summary fields with latest readings.
      // This is a best-effort update — if it fails, the log entry is still saved.
      const humidorPatch = { last_maintenance_date: data.date };
      const hasHumidityReading = !!data.humidity_reading;
      const hasTempReading = !!data.temperature_reading;

      if (hasHumidityReading) {
        humidorPatch.last_humidity_reading = parseFloat(data.humidity_reading);
      }
      if (hasTempReading) {
        humidorPatch.last_temperature_reading = parseFloat(data.temperature_reading);
      }
      if (hasHumidityReading || hasTempReading) {
        humidorPatch.last_reading_date = data.date;
      }
      if (data.event_type === 'aid_replaced') {
        humidorPatch.aid_date_last_replaced = data.date;
        if (data.aid_type) humidorPatch.aid_type = data.aid_type;
        if (data.aid_brand) humidorPatch.aid_brand = data.aid_brand;
        if (data.aid_specification) humidorPatch.aid_specification = data.aid_specification;
      }

      try {
        await base44.entities.HumidorLocation.update(humidorId, humidorPatch);
      } catch (updateErr) {
        // Humidor summary update failed, but the log entry was saved.
        // Log the error for diagnostics but do not surface it as a save failure.
        console.warn('[HumidorMaintenanceLog] humidor summary update failed (log was saved):', updateErr);
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['humidor-maintenance-logs', humidorId] });
      queryClient.invalidateQueries({ queryKey: ['humidors', user?.email] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.humidors(user?.email) });
      toast.success(t("auto.components_cigars_HumidorMaintenanceLog.maintenance_entry_logged_1ojcd7"));
      setShowDialog(false);
      setForm({ ...EMPTY_FORM });
      if (typeof onEntryLogged === 'function') onEntryLogged();
    },
    onError: () => toast.error(t("auto.components_cigars_HumidorMaintenanceLog.failed_to_log_maintenance_entry_1l4ikh")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HumidorMaintenanceLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['humidor-maintenance-logs', humidorId] });
      toast.success(t("auto.components_cigars_HumidorMaintenanceLog.entry_removed_1s2i69"));
    },
    onError: () => toast.error(t("auto.components_cigars_HumidorMaintenanceLog.failed_to_remove_entry_qgtnwt")),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const openDialog = (defaultType = 'humidity_check', overrides = {}) => {
    setForm({
      ...EMPTY_FORM,
      event_type: defaultType,
      ...overrides,
      date: overrides.date || EMPTY_FORM.date,
    });
    setShowDialog(true);
  };

  useEffect(() => {
    const nonce = Number(openComposerNonce);
    if (!Number.isFinite(nonce) || nonce <= 0) return;
    setForm({
      ...EMPTY_FORM,
      event_type: 'humidity_check',
    });
    setShowDialog(true);
  }, [openComposerNonce]);

  const displayLogs = showAll ? logs : logs.slice(0, 3);
  const readingTrendData = [...logs]
    .filter((log) => log?.date && (log.humidity_reading != null || log.temperature_reading != null))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-12)
    .map((log) => ({
      date: formatDate(log.date),
      humidity: log.humidity_reading != null ? Number(log.humidity_reading) : null,
      temperature: log.temperature_reading != null ? Number(log.temperature_reading) : null,
    }));

  return (
    <div className="space-y-3">
      {/* Quick action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => openDialog('aid_replaced', QUICK_MAINTENANCE_PRESETS.replaced_boveda)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(180,140,75,0.18)', border: '1px solid rgba(180,140,75,0.35)', color: '#D4A574' }}
        >
          <PackagePlus className="w-3.5 h-3.5" />
          {t("auto.components_cigars_HumidorMaintenanceLog.replaced_boveda_hh2fhy")}
        </button>
        <button
          type="button"
          onClick={() => openDialog('aid_refilled', QUICK_MAINTENANCE_PRESETS.recharged_beads)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(110,150,210,0.16)', border: '1px solid rgba(110,150,210,0.35)', color: '#9FC4EE' }}
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          {t("auto.components_cigars_HumidorMaintenanceLog.recharged_beads_19tj24")}
        </button>
        <button
          type="button"
          onClick={() => openDialog('other', QUICK_MAINTENANCE_PRESETS.rotated_cigars)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(112,183,131,0.15)', border: '1px solid rgba(112,183,131,0.35)', color: '#83D49E' }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t("auto.components_cigars_HumidorMaintenanceLog.rotated_cigars_z2jdox")}
        </button>
        <button
          type="button"
          onClick={() => openDialog('humidity_check', QUICK_MAINTENANCE_PRESETS.inspected_humidor)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(68,120,200,0.18)', border: '1px solid rgba(68,120,200,0.35)', color: '#8BB4E8' }}
        >
          <Droplets className="w-3.5 h-3.5" />
          {t("auto.components_cigars_HumidorMaintenanceLog.inspected_humidor_1sfuaj")}
        </button>
        <button
          type="button"
          onClick={() => openDialog('humidor_cleaned', QUICK_MAINTENANCE_PRESETS.cleaned_humidor)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(224,216,200,0.8)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {t("auto.components_cigars_HumidorMaintenanceLog.cleaned_humidor_1psp7z")}
        </button>
        <button
          type="button"
          onClick={() => openDialog('other', QUICK_MAINTENANCE_PRESETS.other_note)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(224,216,200,0.7)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t("auto.components_cigars_HumidorMaintenanceLog.other_note_199q7h")}
        </button>
      </div>

      {readingTrendData.length > 1 && (
        <div
          className="rounded-lg p-3"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.12)' }}
        >
          <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: 'rgba(224,216,200,0.55)' }}>
            {t("auto.components_cigars_HumidorMaintenanceLog.recent_conditions_1uj078")}
          </p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readingTrendData} margin={{ top: 5, right: 6, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: 'rgba(224,216,200,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="rh" tick={{ fill: 'rgba(224,216,200,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
                <YAxis yAxisId="temp" orientation="right" tick={{ fill: 'rgba(224,216,200,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ReadingTooltip />} />
                <Line yAxisId="rh" type="monotone" dataKey="humidity" name="RH %" stroke="#8BB4E8" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temp °F" stroke="#D4A574" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Log entries */}
      {isLoading ? (
        <p className="text-xs text-[#E0D8C8]/40 py-2">{t("auto.components_cigars_HumidorMaintenanceLog.loading_history_1m52s6")}</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-[#E0D8C8]/40 py-2">{t("auto.components_cigars_HumidorMaintenanceLog.no_maintenance_history_yet_1xh2nh")}</p>
      ) : (
        <div className="space-y-2">
          {displayLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg px-3 py-2.5 flex items-start justify-between gap-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.12)' }}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <EventTypeBadge type={log.event_type} />
                  <span className="text-xs text-[#E0D8C8]/50">{formatDate(log.date)}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-[#E0D8C8]/55">
                  {log.humidity_reading != null && (
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3 h-3" />
                      {log.humidity_reading}{t("auto.components_cigars_HumidorMaintenanceLog.rh_yj1ock")}
                    </span>
                  )}
                  {log.temperature_reading != null && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      {log.temperature_reading}{t("auto.components_cigars_HumidorMaintenanceLog.f_3hq2j")}
                    </span>
                  )}
                  {log.aid_brand && <span>{log.aid_brand}{log.aid_specification ? ` ${log.aid_specification}` : ''}</span>}
                </div>
                {log.notes && (
                  <p className="text-xs text-[#E0D8C8]/50 line-clamp-2">{log.notes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(log.id)}
                className="p-1 rounded hover:bg-[rgba(224,85,85,0.15)] transition-colors flex-shrink-0"
                style={{ color: 'rgba(224,85,85,0.5)' }}
                aria-label={t("auto.components_cigars_HumidorMaintenanceLog.remove_entry_wnv4kl")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {logs.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
              style={{ color: 'rgba(180,140,75,0.7)' }}
            >
              {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAll ? 'Show less' : `Show all ${logs.length} entries`}
            </button>
          )}
        </div>
      )}

      {/* Add entry dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto"
          style={{
            background: 'linear-gradient(145deg, rgba(40,28,18,0.98), rgba(27,19,13,0.99))',
            border: '1px solid rgba(140,107,63,0.35)',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              {t("auto.components_cigars_HumidorMaintenanceLog.log_maintenance_l5i5r2")} {humidorName}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.event_type_9k5nwz")}</label>
              <Select value={form.event_type} onValueChange={set('event_type')}>
                <SelectTrigger style={{ ...inputStyle, color: '#F5F1E7' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: 'rgba(40,28,18,0.98)', border: '1px solid rgba(180,140,75,0.3)' }}>
                  {EVENT_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value} style={{ color: '#F5F1E7' }}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.date_1c62mv")}</label>
              <Input type="date" value={form.date} onChange={set('date')} required style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.humidity_reading_4881wi")}</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.humidity_reading}
                  onChange={set('humidity_reading')}
                  placeholder="e.g. 65"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.temperature_f_mm5q56")}</label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.temperature_reading}
                  onChange={set('temperature_reading')}
                  placeholder="e.g. 68"
                  style={inputStyle}
                />
              </div>
            </div>

            {isAidEvent(form.event_type) && (
              <div className="space-y-3 rounded-lg p-3" style={{ background: 'rgba(180,140,75,0.06)', border: '1px solid rgba(180,140,75,0.18)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.7)' }}>
                  {t("auto.components_cigars_HumidorMaintenanceLog.aid_details_1q1jnn")}
                </p>
                <div>
                   <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.aid_type_1wgvvs")}</label>
                   <Select value={form.aid_type || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, aid_type: v === 'none' ? '' : v }))}>
                     <SelectTrigger style={{ ...inputStyle, color: form.aid_type ? '#F5F1E7' : 'rgba(224,216,200,0.4)' }}>
                       <SelectValue placeholder={t("auto.components_cigars_HumidorMaintenanceLog.select_type_1uv635")} />
                     </SelectTrigger>
                     <SelectContent style={{ background: 'rgba(40,28,18,0.98)', border: '1px solid rgba(180,140,75,0.3)' }}>
                       <SelectItem value="none" style={{ color: 'rgba(224,216,200,0.5)' }}>{t("auto.components_cigars_HumidorMaintenanceLog.none_specified_2dvgjt")}</SelectItem>
                      {AID_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value} style={{ color: '#F5F1E7' }}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.brand_3kz45o")}</label>
                    <Input value={form.aid_brand} onChange={set('aid_brand')} placeholder="e.g. Boveda" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.specification_bwbjwm")}</label>
                    <Input value={form.aid_specification} onChange={set('aid_specification')} placeholder="e.g. 69%, 60g" style={inputStyle} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>{t("auto.components_cigars_HumidorMaintenanceLog.notes_3te9gu")}</label>
              <Textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder={t("auto.components_cigars_HumidorMaintenanceLog.optional_notes_1xb7pj")}
                rows={2}
                className="resize-none"
                style={inputStyle}
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDialog(false)}
                style={{ color: 'rgba(224,216,200,0.6)' }}
              >
                {t("auto.components_cigars_HumidorMaintenanceLog.cancel_1bin7k")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                style={{
                  background: 'linear-gradient(135deg, #8C6B3F, #6B4F2E)',
                  border: '1px solid rgba(180,140,75,0.4)',
                  color: '#F5F1E7',
                  fontWeight: 600,
                }}
              >
                {createMutation.isPending ? 'Saving…' : 'Save Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
