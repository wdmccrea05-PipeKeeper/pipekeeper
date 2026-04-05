import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Pencil, Trash2, Thermometer, Droplets, Box, AlertTriangle,
  CheckCircle, Clock, ChevronDown, ChevronUp, PackagePlus, Settings2,
} from 'lucide-react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import HumidorMaintenanceLog from './HumidorMaintenanceLog';
import {
  daysBetween,
  getNextCheckDate,
  getNextReplacementDate,
  getHumidorMaintenanceStatus,
} from './humidorMaintenanceUtils';

const AID_TYPE_LABELS = {
  boveda: 'Boveda Pack',
  gel_jar: 'Gel Jar',
  beads: 'Beads',
  electronic: 'Electronic',
  sponge: 'Sponge / Floral Foam',
  other: 'Other',
};

const EMPTY_FORM = {
  name: '',
  humidor_type: '',
  capacity_count: '',
  target_humidity_rh: '',
  target_temp_f: '',
  notes: '',
  aid_type: '',
  aid_brand: '',
  aid_specification: '',
  aid_quantity: '',
  aid_date_installed: '',
  aid_date_last_replaced: '',
  aid_replacement_interval_days: '',
  aid_notes: '',
  check_interval_days: '',
  alerts_enabled: true,
};

function formatDate(val) {
  if (!val) return null;
  const d = new Date(val + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function selectValue(val) {
  return val || 'none';
}

function fromSelectValue(v) {
  return v === 'none' ? '' : v;
}

function MaintenanceStatusBadge({ status }) {
  if (status === 'disabled' || status === 'on_track') return null;
  const cfg = {
    overdue: {
      label: 'Overdue',
      color: '#E05555',
      bg: 'rgba(224,85,85,0.12)',
      border: 'rgba(224,85,85,0.35)',
      Icon: AlertTriangle,
    },
    due_soon: {
      label: 'Due Soon',
      color: '#D4A574',
      bg: 'rgba(212,165,116,0.12)',
      border: 'rgba(212,165,116,0.35)',
      Icon: Clock,
    },
  };
  const { label, color, bg, border, Icon } = cfg[status];
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: bg, border: `1px solid ${border}`, color }}
    >
      <Icon style={{ width: 10, height: 10 }} />
      {label}
    </span>
  );
}

function UtilizationBar({ current, capacity }) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
  let barColor = '#4CAF82';
  if (pct > 90) barColor = '#E05555';
  else if (pct > 70) barColor = '#D4A574';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
        <span>{current} cigars</span>
        <span>{capacity > 0 ? `${Math.round(pct)}%` : '—'}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(180,140,75,0.15)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      {capacity > 0 && (
        <div className="text-xs" style={{ color: 'rgba(224,216,200,0.4)' }}>
          Capacity: {capacity}
        </div>
      )}
    </div>
  );
}

function HumidorFormInline({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));
  const setBool = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(180,140,75,0.22)',
    color: '#F5F1E7',
    borderRadius: '0.5rem',
  };
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1';
  const labelColor = { color: 'rgba(224,216,200,0.6)' };

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.22)' }}>
      {/* Basic fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={labelColor}>Name *</label>
          <Input value={form.name} onChange={set('name')} placeholder="My Desktop Humidor" style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelColor}>Type</label>
          <Select value={selectValue(form.humidor_type)} onValueChange={(v) => set('humidor_type')(fromSelectValue(v))}>
            <SelectTrigger style={{ ...inputStyle, color: form.humidor_type ? '#F5F1E7' : 'rgba(224,216,200,0.4)' }}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent style={{ background: 'rgba(40,28,18,0.98)', border: '1px solid rgba(180,140,75,0.3)' }}>
              <SelectItem value="none" style={{ color: 'rgba(224,216,200,0.5)' }}>— None —</SelectItem>
              {['desktop', 'travel', 'cabinet', 'tupperdor', 'coolidor', 'other'].map((v) => (
                <SelectItem key={v} value={v} style={{ color: '#F5F1E7' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={labelCls} style={labelColor}>Capacity (cigars)</label>
          <Input type="number" value={form.capacity_count} onChange={set('capacity_count')} placeholder="50" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} style={labelColor}>Target RH%</label>
            <Input type="number" value={form.target_humidity_rh} onChange={set('target_humidity_rh')} placeholder="65" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelColor}>Target °F</label>
            <Input type="number" value={form.target_temp_f} onChange={set('target_temp_f')} placeholder="68" style={inputStyle} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls} style={labelColor}>Notes</label>
        <Textarea value={form.notes} onChange={set('notes')} placeholder="Optional notes…" rows={2} className="resize-none" style={inputStyle} />
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ color: 'rgba(180,140,75,0.7)' }}
      >
        <Settings2 style={{ width: 13, height: 13 }} />
        {showAdvanced ? 'Hide advanced settings' : 'Show humidity aid & reminder settings'}
        {showAdvanced ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
      </button>

      {showAdvanced && (
        <div className="space-y-4 rounded-lg p-3" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.15)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.65)' }}>
            Humidity Aid
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelColor}>Aid Type</label>
              <Select value={selectValue(form.aid_type)} onValueChange={(v) => set('aid_type')(fromSelectValue(v))}>
                <SelectTrigger style={{ ...inputStyle, color: form.aid_type ? '#F5F1E7' : 'rgba(224,216,200,0.4)' }}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent style={{ background: 'rgba(40,28,18,0.98)', border: '1px solid rgba(180,140,75,0.3)' }}>
                  <SelectItem value="none" style={{ color: 'rgba(224,216,200,0.5)' }}>— None —</SelectItem>
                  {Object.entries(AID_TYPE_LABELS).map(([v, lbl]) => (
                    <SelectItem key={v} value={v} style={{ color: '#F5F1E7' }}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls} style={labelColor}>Brand</label>
              <Input value={form.aid_brand} onChange={set('aid_brand')} placeholder="e.g. Boveda, Xikar" style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelColor}>Specification</label>
              <Input value={form.aid_specification} onChange={set('aid_specification')} placeholder="e.g. 69%, 60g, 320g" style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelColor}>Quantity</label>
              <Input type="number" value={form.aid_quantity} onChange={set('aid_quantity')} placeholder="1" style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelColor}>Date Installed</label>
              <Input type="date" value={form.aid_date_installed} onChange={set('aid_date_installed')} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelColor}>Date Last Replaced</label>
              <Input type="date" value={form.aid_date_last_replaced} onChange={set('aid_date_last_replaced')} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelColor}>Replace Every (days)</label>
              <Input type="number" value={form.aid_replacement_interval_days} onChange={set('aid_replacement_interval_days')} placeholder="e.g. 60" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelCls} style={labelColor}>Aid Notes</label>
            <Input value={form.aid_notes} onChange={set('aid_notes')} placeholder="Optional aid notes…" style={inputStyle} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: 'rgba(180,140,75,0.65)' }}>
            Reminders
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelColor}>Check Humidity Every (days)</label>
              <Input type="number" value={form.check_interval_days} onChange={set('check_interval_days')} placeholder="e.g. 7" style={inputStyle} />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="alerts_enabled"
                checked={form.alerts_enabled !== false}
                onChange={(e) => setBool('alerts_enabled')(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <label htmlFor="alerts_enabled" className="text-sm cursor-pointer" style={{ color: 'rgba(224,216,200,0.75)' }}>
                Show due/overdue alerts
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} style={{ color: 'rgba(224,216,200,0.6)' }}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving || !form.name?.trim()}
          onClick={() => onSave(form)}
          style={{
            background: 'linear-gradient(135deg, #8C6B3F, #6B4F2E)',
            border: '1px solid rgba(180,140,75,0.4)',
            color: '#F5F1E7',
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving…' : initial?.id ? 'Update Humidor' : 'Add Humidor'}
        </Button>
      </div>
    </div>
  );
}

function HumidorCard({ humidor, assignedCount, onEdit, onDelete }) {
  const [showMaintenance, setShowMaintenance] = useState(false);
  const capacity = humidor.capacity_count || 0;
  const status = getHumidorMaintenanceStatus(humidor);
  const nextCheck = getNextCheckDate(humidor);
  const nextReplacement = getNextReplacementDate(humidor);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const checkDays = daysBetween(nextCheck, now);
  const replaceDays = daysBetween(nextReplacement, now);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(180,140,75,0.18)' }}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[#F5F1E7]">{humidor.name}</h3>
            <MaintenanceStatusBadge status={status} />
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {humidor.humidor_type && (
              <span className="text-xs text-[#D4A574]/70 capitalize">{humidor.humidor_type}</span>
            )}
            {humidor.target_humidity_rh && (
              <span className="flex items-center gap-1 text-xs text-[#E0D8C8]/50">
                <Droplets className="w-3 h-3" />
                {humidor.target_humidity_rh}% target
              </span>
            )}
            {humidor.target_temp_f && (
              <span className="flex items-center gap-1 text-xs text-[#E0D8C8]/50">
                <Thermometer className="w-3 h-3" />
                {humidor.target_temp_f}°F target
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg transition-all hover:bg-[rgba(180,140,75,0.15)]"
            style={{ color: 'rgba(180,140,75,0.7)' }}
            aria-label="Edit humidor"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-all hover:bg-[rgba(224,85,85,0.15)]"
            style={{ color: 'rgba(224,85,85,0.6)' }}
            aria-label="Delete humidor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <UtilizationBar current={assignedCount} capacity={capacity} />

      {/* Environment snapshot */}
      {(humidor.last_humidity_reading != null || humidor.last_temperature_reading != null) && (
        <div
          className="mt-3 flex items-center gap-4 rounded-lg px-3 py-2"
          style={{ background: 'rgba(68,120,200,0.08)', border: '1px solid rgba(68,120,200,0.18)' }}
        >
          {humidor.last_humidity_reading != null && (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#8BB4E8' }}>
              <Droplets className="w-3.5 h-3.5" />
              {humidor.last_humidity_reading}% RH
            </span>
          )}
          {humidor.last_temperature_reading != null && (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#8BB4E8' }}>
              <Thermometer className="w-3.5 h-3.5" />
              {humidor.last_temperature_reading}°F
            </span>
          )}
          {humidor.last_reading_date && (
            <span className="text-xs text-[#E0D8C8]/45 ml-auto">
              {formatDate(humidor.last_reading_date)}
            </span>
          )}
        </div>
      )}

      {/* Active aid info */}
      {humidor.aid_type && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[#E0D8C8]/55 flex-wrap">
          <PackagePlus className="w-3.5 h-3.5 text-[#D4A574]/60 flex-shrink-0" />
          <span className="text-[#D4A574]/75 font-medium">
            {AID_TYPE_LABELS[humidor.aid_type] ?? humidor.aid_type}
            {humidor.aid_brand ? ` — ${humidor.aid_brand}` : ''}
            {humidor.aid_specification ? ` ${humidor.aid_specification}` : ''}
            {humidor.aid_quantity > 1 ? ` ×${humidor.aid_quantity}` : ''}
          </span>
        </div>
      )}

      {/* Due dates */}
      {(nextCheck || nextReplacement) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {nextCheck && (
            <span
              className="flex items-center gap-1"
              style={{ color: checkDays !== null && checkDays < 0 ? '#E05555' : checkDays !== null && checkDays <= 3 ? '#D4A574' : 'rgba(224,216,200,0.45)' }}
            >
              <CheckCircle className="w-3 h-3" />
              {checkDays !== null && checkDays < 0
                ? `Check overdue (${Math.abs(checkDays)}d ago)`
                : checkDays !== null && checkDays === 0
                ? 'Check due today'
                : `Check due ${formatDate(nextCheck)}`}
            </span>
          )}
          {nextReplacement && (
            <span
              className="flex items-center gap-1"
              style={{ color: replaceDays !== null && replaceDays < 0 ? '#E05555' : replaceDays !== null && replaceDays <= 3 ? '#D4A574' : 'rgba(224,216,200,0.45)' }}
            >
              <PackagePlus className="w-3 h-3" />
              {replaceDays !== null && replaceDays < 0
                ? `Replace overdue (${Math.abs(replaceDays)}d ago)`
                : replaceDays !== null && replaceDays === 0
                ? 'Replace due today'
                : `Replace due ${formatDate(nextReplacement)}`}
            </span>
          )}
        </div>
      )}

      {humidor.notes && (
        <p className="text-xs text-[#E0D8C8]/45 mt-2 line-clamp-2">{humidor.notes}</p>
      )}

      {/* Maintenance section toggle */}
      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(180,140,75,0.1)' }}>
        <button
          type="button"
          onClick={() => setShowMaintenance((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 w-full text-left"
          style={{ color: 'rgba(180,140,75,0.65)' }}
        >
          <Clock className="w-3.5 h-3.5" />
          Maintenance History
          {showMaintenance ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {showMaintenance && (
          <div className="mt-3">
            <HumidorMaintenanceLog
              humidorId={humidor.id}
              humidorName={humidor.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function HumidorManager({ cigars = [], onRefresh }) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: humidors = [], isLoading } = useQuery({
    queryKey: ['humidors', user?.email],
    queryFn: () => base44.entities.HumidorLocation.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['humidors', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['humidors-summary', user?.email] });
    if (typeof onRefresh === 'function') onRefresh();
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HumidorLocation.create({ ...data, created_by: user?.email }),
    onSuccess: () => { toast.success('Humidor added'); invalidate(); setShowForm(false); },
    onError: () => toast.error('Failed to add humidor'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HumidorLocation.update(id, data),
    onSuccess: () => { toast.success('Humidor updated'); invalidate(); setEditTarget(null); },
    onError: () => toast.error('Failed to update humidor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HumidorLocation.delete(id),
    onSuccess: () => { toast.success('Humidor deleted'); invalidate(); setDeleteConfirm(null); },
    onError: () => toast.error('Failed to delete humidor'),
  });

  const cigarsByHumidor = cigars.reduce((acc, c) => {
    const key = c.humidor_id || '__none__';
    acc[key] = (acc[key] || 0) + (c.singles_equivalent || c.quantity || 1);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", fontSize: '1.1rem', fontWeight: 700 }}>
          Humidors
        </h2>
        {!showForm && !editTarget && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowForm(true)}
            style={{ border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574', gap: '0.25rem' }}
          >
            <Plus className="w-4 h-4" />
            Add Humidor
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <HumidorFormInline
          initial={EMPTY_FORM}
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          saving={createMutation.isPending}
        />
      )}

      {/* Humidor list */}
      {isLoading ? (
        <div className="text-center py-8 text-[#E0D8C8]/40 text-sm">Loading humidors…</div>
      ) : humidors.length === 0 && !showForm ? (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.15)' }}
        >
          <Box className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(180,140,75,0.3)' }} />
          <p className="text-sm text-[#E0D8C8]/45">No humidors yet. Add one to organize your collection.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {humidors.map((humidor) => {
            const assignedCount = cigarsByHumidor[humidor.id] || 0;

            return (
              <div key={humidor.id}>
                {editTarget?.id === humidor.id ? (
                  <HumidorFormInline
                    initial={humidor}
                    onSave={(data) => updateMutation.mutate({ id: humidor.id, data })}
                    onCancel={() => setEditTarget(null)}
                    saving={updateMutation.isPending}
                  />
                ) : (
                  <HumidorCard
                    humidor={humidor}
                    assignedCount={assignedCount}
                    onEdit={() => setEditTarget(humidor)}
                    onDelete={() => setDeleteConfirm(humidor)}
                  />
                )}

                {/* Delete confirm */}
                {deleteConfirm?.id === humidor.id && (
                  <div
                    className="rounded-xl p-4 mt-2"
                    style={{ background: 'rgba(224,85,85,0.08)', border: '1px solid rgba(224,85,85,0.3)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <p className="text-sm text-[#F5F1E7]">
                        Delete <strong>{humidor.name}</strong>? This cannot be undone.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(null)}
                        style={{ color: 'rgba(224,216,200,0.6)' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(humidor.id)}
                        style={{ background: 'rgba(163,50,50,0.85)', color: '#fff', border: '1px solid rgba(224,85,85,0.4)' }}
                      >
                        {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

