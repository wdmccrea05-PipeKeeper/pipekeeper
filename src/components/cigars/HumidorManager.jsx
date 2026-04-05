import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Thermometer, Droplets, Box, AlertTriangle } from 'lucide-react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMPTY_FORM = {
  name: '',
  humidor_type: '',
  capacity_count: '',
  target_humidity_rh: '',
  target_temp_f: '',
  notes: '',
};

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
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(180,140,75,0.15)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: barColor }}
        />
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
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(180,140,75,0.22)',
    color: '#F5F1E7',
    borderRadius: '0.5rem',
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.22)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Name *
          </label>
          <Input value={form.name} onChange={set('name')} placeholder="My Desktop Humidor" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Type
          </label>
          <Select value={form.humidor_type} onValueChange={set('humidor_type')}>
            <SelectTrigger style={{ ...inputStyle, color: form.humidor_type ? '#F5F1E7' : 'rgba(224,216,200,0.4)' }}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent style={{ background: 'rgba(40,28,18,0.98)', border: '1px solid rgba(180,140,75,0.3)' }}>
              {['desktop', 'travel', 'cabinet', 'tupperdor', 'coolidor', 'other'].map((v) => (
                <SelectItem key={v} value={v} style={{ color: '#F5F1E7' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Capacity (count)
          </label>
          <Input type="number" value={form.capacity_count} onChange={set('capacity_count')} placeholder="50" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              Target RH%
            </label>
            <Input type="number" value={form.target_humidity_rh} onChange={set('target_humidity_rh')} placeholder="65" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              Target °F
            </label>
            <Input type="number" value={form.target_temp_f} onChange={set('target_temp_f')} placeholder="68" style={inputStyle} />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
          Notes
        </label>
        <Textarea
          value={form.notes}
          onChange={set('notes')}
          placeholder="Optional notes…"
          rows={2}
          className="resize-none"
          style={inputStyle}
        />
      </div>
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
            const capacity = humidor.capacity_count || 0;

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
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'rgba(255,255,255,0.035)',
                      border: '1px solid rgba(180,140,75,0.18)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[#F5F1E7]">{humidor.name}</h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {humidor.humidor_type && (
                            <span className="text-xs text-[#D4A574]/70 capitalize">{humidor.humidor_type}</span>
                          )}
                          {humidor.target_humidity_rh && (
                            <span className="flex items-center gap-1 text-xs text-[#E0D8C8]/50">
                              <Droplets className="w-3 h-3" />
                              {humidor.target_humidity_rh}% RH
                            </span>
                          )}
                          {humidor.target_temp_f && (
                            <span className="flex items-center gap-1 text-xs text-[#E0D8C8]/50">
                              <Thermometer className="w-3 h-3" />
                              {humidor.target_temp_f}°F
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditTarget(humidor)}
                          className="p-1.5 rounded-lg transition-all hover:bg-[rgba(180,140,75,0.15)]"
                          style={{ color: 'rgba(180,140,75,0.7)' }}
                          aria-label="Edit humidor"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(humidor)}
                          className="p-1.5 rounded-lg transition-all hover:bg-[rgba(224,85,85,0.15)]"
                          style={{ color: 'rgba(224,85,85,0.6)' }}
                          aria-label="Delete humidor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <UtilizationBar current={assignedCount} capacity={capacity} />

                    {humidor.notes && (
                      <p className="text-xs text-[#E0D8C8]/45 mt-2 line-clamp-2">{humidor.notes}</p>
                    )}
                  </div>
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
