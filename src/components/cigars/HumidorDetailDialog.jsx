import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplets, Thermometer, Plus, MoveRight, ClipboardCheck } from 'lucide-react';
import {
  summarizeEnvironment,
  environmentStatusLabel,
} from '@/lib/cigars/humidorEnvironment';
import { reconcileHumidor, reconciliationStatusLabel, describePosition } from '@/lib/cigars/humidorInventory';
import { buildHumidorMovements } from '@/lib/cigars/humidorInventory';
import { buildDrilldownQuery } from '@/lib/cigars/cigarDashboard';

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(180,140,75,0.25)',
  color: '#F5F1E7',
};

const STATUS_COLOR = {
  ok: '#6FCF97',
  low: '#E0B450',
  high: '#E07060',
  mixed: '#E07060',
  unknown: 'rgba(224,216,200,0.55)',
};

function asList(result) {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.items) ? result.items : [];
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Panel({ title, children, icon: Icon }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" style={{ color: '#D4A574' }} />}
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.72)' }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

/**
 * Humidor deep-dive: environment history, documented inventory, reconciliation
 * and storage movements for one humidor. Documentation only.
 */
export default function HumidorDetailDialog({ humidor, cigars = [], userEmail, open, onOpenChange, onChanged }) {
  const [readings, setReadings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ humidity: '', temperature: '', note: '', recordedAt: '' });

  const load = useCallback(async () => {
    if (!humidor?.id) return;
    setLoading(true);
    const [readingResult, maintenanceResult, activityResult] = await Promise.all([
      base44.entities.HumidorReading.filter(
        { humidor_id: humidor.id },
        { sort: '-recorded_at', limit: 200 }
      ).catch(() => []),
      base44.entities.HumidorMaintenanceLog.filter(
        { humidor_id: humidor.id },
        { sort: '-date', limit: 50 }
      ).catch(() => []),
      base44.entities.CollectionActivity.filter(
        { record_entity: 'Cigar', event_type: 'storage_change' },
        { sort: '-occurred_at', limit: 100 }
      ).catch(() => []),
    ]);
    setReadings(asList(readingResult));
    setMaintenance(asList(maintenanceResult));
    setActivities(asList(activityResult));
    setLoading(false);
  }, [humidor?.id]);

  useEffect(() => {
    if (open && humidor?.id) load();
  }, [open, humidor?.id, load]);

  const assigned = useMemo(
    () => cigars.filter((cigar) => cigar?.humidor_id === humidor?.id),
    [cigars, humidor?.id]
  );
  const summary = useMemo(() => summarizeEnvironment(readings, humidor || {}), [readings, humidor]);
  const reconciliation = useMemo(() => reconcileHumidor(humidor || {}, cigars), [humidor, cigars]);
  const movements = useMemo(
    () => buildHumidorMovements(activities, { humidorId: humidor?.id, cigarIds: assigned.map((c) => c.id) }),
    [activities, humidor?.id, assigned]
  );

  const chartData = useMemo(
    () =>
      summary.series.map((point) => ({
        date: point.recordedAt ? new Date(point.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
        humidity: point.humidity_rh,
        temperature: point.temperature_f,
        status: point.status,
      })),
    [summary.series]
  );

  const handleAddReading = async () => {
    if (!humidor?.id) return;
    const humidity = Number(form.humidity);
    const temperature = Number(form.temperature);
    const hasHumidity = Number.isFinite(humidity) && form.humidity !== '';
    const hasTemperature = Number.isFinite(temperature) && form.temperature !== '';
    if (!hasHumidity && !hasTemperature) return;

    setSaving(true);
    try {
      await base44.entities.HumidorReading.create({
        humidor_id: humidor.id,
        humidor_name: humidor.name || null,
        recorded_at: new Date(form.recordedAt || Date.now()).toISOString(),
        humidity_rh: hasHumidity ? humidity : null,
        temperature_f: hasTemperature ? temperature : null,
        source: 'manual',
        note: form.note || null,
        created_by: userEmail || null,
      });
      await base44.entities.HumidorLocation.update(humidor.id, {
        last_humidity_reading: hasHumidity ? humidity : humidor.last_humidity_reading ?? null,
        last_temperature_reading: hasTemperature ? temperature : humidor.last_temperature_reading ?? null,
        last_reading_date: new Date(form.recordedAt || Date.now()).toISOString().slice(0, 10),
      });
      setForm({ humidity: '', temperature: '', note: '', recordedAt: '' });
      await load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  if (!humidor) return null;

  const band = summary.thresholds;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-3xl overflow-y-auto"
        style={{ background: '#1d1511', border: '1px solid rgba(180,140,75,0.3)', color: '#F5F1E7' }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#F5F1E7]">{humidor.name}</DialogTitle>
          <DialogDescription style={{ color: 'rgba(224,216,200,0.6)' }}>
            {humidor.humidor_type ? `${humidor.humidor_type} · ` : ''}
            {assigned.length} assigned records · {reconciliation.computed} documented singles
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="environment" className="mt-2">
          <TabsList className="grid w-full grid-cols-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <TabsTrigger value="environment">Environment</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="movement">Movement</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="environment" className="mt-3 space-y-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold" style={{ color: STATUS_COLOR[summary.status] }}>
                  {environmentStatusLabel(summary.status)}
                </p>
                <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
                  Your band: {band.min_humidity_rh}–{band.max_humidity_rh}% RH · {band.min_temp_f}–{band.max_temp_f}°F
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.5)' }}>Avg RH</p>
                  <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{summary.humidity.average ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.5)' }}>RH range</p>
                  <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
                    {summary.humidity.min ?? '—'}–{summary.humidity.max ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.5)' }}>Avg °F</p>
                  <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{summary.temperature.average ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.5)' }}>Outside band</p>
                  <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
                    {summary.outOfRangeCount}/{summary.readingCount}
                  </p>
                </div>
              </div>
            </div>

            {chartData.length > 1 ? (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(224,216,200,0.55)' }} />
                    <YAxis yAxisId="rh" domain={['dataMin - 4', 'dataMax + 4']} tick={{ fontSize: 10, fill: 'rgba(224,216,200,0.55)' }} />
                    <YAxis yAxisId="temp" orientation="right" domain={['dataMin - 3', 'dataMax + 3']} tick={{ fontSize: 10, fill: 'rgba(224,216,200,0.4)' }} />
                    <Tooltip
                      contentStyle={{ background: '#241913', border: '1px solid rgba(180,140,75,0.3)', borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: '#F5F1E7' }}
                    />
                    <Line yAxisId="rh" type="monotone" dataKey="humidity" name="% RH" stroke="#D4A574" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line yAxisId="temp" type="monotone" dataKey="temperature" name="°F" stroke="#6F9FCF" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {loading ? 'Loading readings…' : 'Two or more readings are needed before a history chart appears.'}
              </p>
            )}

            <Panel title="Record a reading" icon={Droplets}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[10px]" style={{ color: 'rgba(224,216,200,0.55)' }}>Humidity %</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.humidity}
                    onChange={(e) => setForm((f) => ({ ...f, humidity: e.target.value }))}
                    placeholder="65"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px]" style={{ color: 'rgba(224,216,200,0.55)' }}>Temp °F</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.temperature}
                    onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))}
                    placeholder="68"
                    style={inputStyle}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[10px]" style={{ color: 'rgba(224,216,200,0.55)' }}>When</label>
                  <Input
                    type="datetime-local"
                    value={form.recordedAt}
                    onChange={(e) => setForm((f) => ({ ...f, recordedAt: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <Textarea
                className="mt-2 resize-none"
                rows={2}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional note about this reading"
                style={inputStyle}
              />
              <Button
                className="mt-2 w-full sm:w-auto"
                onClick={handleAddReading}
                disabled={saving || (!form.humidity && !form.temperature)}
              >
                <Plus className="mr-1 h-4 w-4" />
                {saving ? 'Saving…' : 'Record reading'}
              </Button>
            </Panel>

            {readings.length > 0 && (
              <Panel title="Reading history" icon={Thermometer}>
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {readings.slice(0, 40).map((reading) => (
                    <div key={reading.id} className="flex items-center justify-between gap-2 text-xs">
                      <span style={{ color: 'rgba(224,216,200,0.6)' }}>{formatDate(reading.recorded_at)}</span>
                      <span style={{ color: '#F5F1E7' }}>
                        {reading.humidity_rh != null ? `${reading.humidity_rh}%` : '—'} ·{' '}
                        {reading.temperature_f != null ? `${reading.temperature_f}°F` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="mt-3 space-y-3">
            <Panel title="Reconciliation" icon={ClipboardCheck}>
              <p className="text-sm" style={{ color: '#F5F1E7' }}>{reconciliationStatusLabel(reconciliation.status)}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p style={{ color: 'rgba(224,216,200,0.5)' }}>Documented</p>
                  <p style={{ color: '#F5F1E7' }}>{reconciliation.documented ?? '—'}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(224,216,200,0.5)' }}>Assigned records</p>
                  <p style={{ color: '#F5F1E7' }}>{reconciliation.computed}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(224,216,200,0.5)' }}>Difference</p>
                  <p style={{ color: reconciliation.difference ? '#E0B450' : '#F5F1E7' }}>
                    {reconciliation.difference === null ? '—' : reconciliation.difference}
                  </p>
                </div>
              </div>
              {reconciliation.capacityOverflow ? (
                <p className="mt-2 text-xs" style={{ color: '#E07060' }}>
                  Assigned records exceed the documented capacity by {reconciliation.capacityOverflow}.
                </p>
              ) : null}
            </Panel>

            <Panel title={`Assigned records (${assigned.length})`}>
              {assigned.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>No cigars are assigned to this humidor.</p>
              ) : (
                <div className="space-y-1">
                  {assigned.slice(0, 40).map((cigar) => (
                    <a
                      key={cigar.id}
                      href={`/CigarDetail?id=${cigar.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs hover:bg-white/5"
                    >
                      <span className="min-w-0 break-words" style={{ color: '#F5F1E7' }}>
                        {cigar.name}
                        {cigar.brand ? ` · ${cigar.brand}` : ''}
                      </span>
                      <span className="shrink-0" style={{ color: 'rgba(224,216,200,0.6)' }}>
                        {describePosition(cigar) || `${cigar.singles_equivalent ?? cigar.quantity ?? 0}`}
                      </span>
                    </a>
                  ))}
                </div>
              )}
              <a
                href={`/Cigars?${buildDrilldownQuery({ humidor: humidor.id })}`}
                className="mt-2 inline-block text-xs underline"
                style={{ color: '#D4A574' }}
              >
                Open these records in the collection
              </a>
            </Panel>
          </TabsContent>

          <TabsContent value="movement" className="mt-3">
            <Panel title="Storage movements" icon={MoveRight}>
              {movements.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
                  No movements are recorded for this humidor yet. Movements are logged when a cigar's storage assignment changes.
                </p>
              ) : (
                <div className="space-y-2">
                  {movements.slice(0, 40).map((move) => (
                    <div key={move.id} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#F5F1E7' }}>{move.cigarName}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.65)' }}>
                        {formatDate(move.occurredAt)} · {move.summary}
                      </p>
                      {move.detail && (
                        <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.5)' }}>{move.detail}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-3">
            <Panel title="Inspection and maintenance records">
              {maintenance.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>No maintenance records yet.</p>
              ) : (
                <div className="space-y-2">
                  {maintenance.slice(0, 40).map((entry) => (
                    <div key={entry.id} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#F5F1E7' }}>
                        {String(entry.event_type || '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.65)' }}>
                        {formatDate(entry.date)}
                        {entry.humidity_reading != null ? ` · ${entry.humidity_reading}% RH` : ''}
                        {entry.temperature_reading != null ? ` · ${entry.temperature_reading}°F` : ''}
                      </p>
                      {entry.notes && (
                        <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.5)' }}>{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}