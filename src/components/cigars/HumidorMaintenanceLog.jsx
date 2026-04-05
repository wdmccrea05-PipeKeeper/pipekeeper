import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Droplets, Thermometer, PackagePlus, RefreshCcw, Sparkles, Sun, ClipboardList, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function HumidorMaintenanceLog({ humidorId, humidorName, onEntryLogged }) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['humidor-maintenance-logs', humidorId],
    queryFn: () => base44.entities.HumidorMaintenanceLog.filter({ humidor_id: humidorId }, '-date', 50),
    enabled: !!humidorId,
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
      const created = await base44.entities.HumidorMaintenanceLog.create(payload);

      // Update humidor record with latest readings from this event
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
      await base44.entities.HumidorLocation.update(humidorId, humidorPatch);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['humidor-maintenance-logs', humidorId] });
      queryClient.invalidateQueries({ queryKey: ['humidors', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['humidors-summary', user?.email] });
      toast.success('Maintenance entry logged');
      setShowDialog(false);
      setForm({ ...EMPTY_FORM });
      if (typeof onEntryLogged === 'function') onEntryLogged();
    },
    onError: () => toast.error('Failed to log maintenance entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HumidorMaintenanceLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['humidor-maintenance-logs', humidorId] });
      toast.success('Entry removed');
    },
    onError: () => toast.error('Failed to remove entry'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const openDialog = (defaultType = 'humidity_check') => {
    setForm({ ...EMPTY_FORM, event_type: defaultType });
    setShowDialog(true);
  };

  const displayLogs = showAll ? logs : logs.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Quick action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => openDialog('humidity_check')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(68,120,200,0.18)', border: '1px solid rgba(68,120,200,0.35)', color: '#8BB4E8' }}
        >
          <Droplets className="w-3.5 h-3.5" />
          Log Check
        </button>
        <button
          type="button"
          onClick={() => openDialog('aid_replaced')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(180,140,75,0.18)', border: '1px solid rgba(180,140,75,0.35)', color: '#D4A574' }}
        >
          <PackagePlus className="w-3.5 h-3.5" />
          Log Replacement
        </button>
        <button
          type="button"
          onClick={() => openDialog('other')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(224,216,200,0.7)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Log Other
        </button>
      </div>

      {/* Log entries */}
      {isLoading ? (
        <p className="text-xs text-[#E0D8C8]/40 py-2">Loading history…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-[#E0D8C8]/40 py-2">No maintenance history yet.</p>
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
                      {log.humidity_reading}% RH
                    </span>
                  )}
                  {log.temperature_reading != null && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      {log.temperature_reading}°F
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
                aria-label="Remove entry"
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
              Log Maintenance — {humidorName}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label style={labelStyle}>Event Type *</label>
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
              <label style={labelStyle}>Date *</label>
              <Input type="date" value={form.date} onChange={set('date')} required style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Humidity Reading (%)</label>
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
                <label style={labelStyle}>Temperature (°F)</label>
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
                  Aid Details
                </p>
                <div>
                   <label style={labelStyle}>Aid Type</label>
                   <Select value={form.aid_type || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, aid_type: v === 'none' ? '' : v }))}>
                     <SelectTrigger style={{ ...inputStyle, color: form.aid_type ? '#F5F1E7' : 'rgba(224,216,200,0.4)' }}>
                       <SelectValue placeholder="Select type" />
                     </SelectTrigger>
                     <SelectContent style={{ background: 'rgba(40,28,18,0.98)', border: '1px solid rgba(180,140,75,0.3)' }}>
                       <SelectItem value="none" style={{ color: 'rgba(224,216,200,0.5)' }}>— None specified —</SelectItem>
                      {AID_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value} style={{ color: '#F5F1E7' }}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Brand</label>
                    <Input value={form.aid_brand} onChange={set('aid_brand')} placeholder="e.g. Boveda" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Specification</label>
                    <Input value={form.aid_specification} onChange={set('aid_specification')} placeholder="e.g. 69%, 60g" style={inputStyle} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Notes</label>
              <Textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Optional notes…"
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
                Cancel
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