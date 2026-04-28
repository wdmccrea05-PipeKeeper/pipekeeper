import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Star,
  Cigarette,
  Package,
  Flame,
  ShieldAlert,
  Thermometer,
  Clock3,
  DollarSign,
  Check,
  X,
  MoreVertical,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import CigarSessionModal from '@/components/cigars/CigarSessionModal';
import CigarValuationModal from '@/components/cigars/CigarValuationModal';
import { getCigarReadinessWithContext } from '@/platform/agingReadiness';
import { getCigarInventoryMetrics } from '@/platform/cigarInventory';
import EnrichButton from '@/components/shared/EnrichButton';
import { useCurrency } from '@/lib/currency/useCurrency';
import { formatCigarStrengthLabel } from '@/platform/cigarCatalog';
import {
  getCigarQuickActionLabels,
  getCigarQuickActionPatch,
  getCigarQuickActionSuccessMessage,
} from '@/platform/cigarQuickActions';
import UnifiedValuationCard from '@/components/valuation/UnifiedValuationCard';
import {
  buildValuationSnapshot,
  resolveValueTrend,
} from '@/components/valuation/valueEngine';
import {
  seedInitialSnapshotIfMissing,
  refreshItemValue,
} from '@/components/valuation/valueRefreshService';
import { deriveCigarMarketValuation, buildCigarMarketValuationPatch } from '@/utils/cigarMarketValuation';
import { getCigarRarityResult } from '@/lib/collection/cigarSelectors';

function safePrimitive(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value.map((e) => safePrimitive(e, '')).filter(Boolean).join(', ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    return value.label || value.name || value.title || value.value || fallback;
  }
  return fallback;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calcAgeMonths(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30.44));
}

const READINESS_STYLE = {
  ready_now: { bg: 'rgba(76,175,130,0.12)', border: 'rgba(76,175,130,0.4)', color: '#6FCF97' },
  aging:     { bg: 'rgba(212,165,116,0.1)', border: 'rgba(212,165,116,0.4)', color: '#D4A574' },
  past_peak: { bg: 'rgba(224,100,80,0.1)',  border: 'rgba(224,100,80,0.35)', color: '#E07060' },
  no_data:   { bg: 'rgba(255,255,255,0.04)', border: 'rgba(180,140,75,0.2)', color: 'rgba(224,216,200,0.55)' },
};

const CONFIDENCE_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };
const CONFIDENCE_COLOR = { high: '#6FCF97', medium: '#D4A574', low: 'rgba(224,216,200,0.55)' };

const HUMIDOR_HEALTH_STYLE = {
  stable:      { bg: 'rgba(76,175,130,0.1)',  border: 'rgba(76,175,130,0.3)',  color: '#6FCF97' },
  dry_risk:    { bg: 'rgba(224,180,80,0.1)',  border: 'rgba(224,180,80,0.35)', color: '#E0B450' },
  humid_risk:  { bg: 'rgba(224,100,80,0.1)',  border: 'rgba(224,100,80,0.35)', color: '#E07060' },
  unmonitored: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(180,140,75,0.2)', color: 'rgba(224,216,200,0.55)' },
};

const RISK_FLAG_STYLE = {
  warning: { bg: 'rgba(224,100,80,0.1)', border: 'rgba(224,100,80,0.3)', color: '#E07060' },
  info:    { bg: 'rgba(180,140,75,0.08)', border: 'rgba(180,140,75,0.2)', color: 'rgba(224,216,200,0.65)' },
};

function AgingTabContent({ cigar, humidor }) {
  const readiness = getCigarReadinessWithContext(cigar, humidor);
  const rstyle = READINESS_STYLE[readiness.state] || READINESS_STYLE.no_data;
  const hstyle = HUMIDOR_HEALTH_STYLE[readiness.humidorHealth.state] || HUMIDOR_HEALTH_STYLE.unmonitored;

  return (
    <div className="space-y-4">
      {/* Readiness state */}
      <div
        className="rounded-xl p-4"
        style={{ background: rstyle.bg, border: `1px solid ${rstyle.border}` }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock3 className="w-4 h-4 flex-shrink-0" style={{ color: rstyle.color }} />
            <span className="text-base font-semibold" style={{ color: rstyle.color }}>
              {readiness.label}
            </span>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: CONFIDENCE_COLOR[readiness.confidence] }}
          >
            {CONFIDENCE_LABEL[readiness.confidence] || 'Unknown confidence'}
          </span>
        </div>
        {readiness.detail && (
          <p className="text-sm mt-2" style={{ color: 'rgba(224,216,200,0.75)' }}>
            {readiness.detail}
          </p>
        )}
        {readiness.monthsAged !== null && (
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.45)' }}>
            {readiness.monthsAged} month{readiness.monthsAged !== 1 ? 's' : ''} in cellar
          </p>
        )}
      </div>

      {/* Humidor health */}
      <div
        className="rounded-xl p-4"
        style={{ background: hstyle.bg, border: `1px solid ${hstyle.border}` }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Thermometer className="w-4 h-4 flex-shrink-0" style={{ color: hstyle.color }} />
          <span className="text-sm font-semibold" style={{ color: hstyle.color }}>
            {readiness.humidorHealth.label}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>
          {readiness.humidorHealth.detail}
        </p>
      </div>

      {/* Risk flags */}
      {readiness.riskFlags.filter((f) => f.severity === 'warning').length > 0 && (
        <div className="space-y-2">
          {readiness.riskFlags.filter((f) => f.severity === 'warning').map((flag) => {
            const fs = RISK_FLAG_STYLE[flag.severity];
            return (
              <div
                key={flag.type}
                className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background: fs.bg, border: `1px solid ${fs.border}` }}
              >
                <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: fs.color }} />
                <span className="text-sm font-medium" style={{ color: fs.color }}>
                  {flag.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw aging data */}
      <div className="space-y-1 pt-1">
        <InfoRow label="Aging Start" value={formatDate(cigar.aging_start_date)} />
        <InfoRow label="Ready to Smoke" value={formatDate(cigar.ready_to_smoke_date)} />
        <InfoRow label="Storage" value={cigar.storage_notes} />
      </div>
    </div>
  );
}

function EditableStatCard({
  label,
  value,
  icon: Icon,
  onSave,
  type = 'number',
  placeholder,
  editable = true,
  onCardClick,
  hint = 'tap to edit',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const start = () => {
    if (!editable) {
      if (typeof onCardClick === 'function') onCardClick();
      return;
    }
    setDraft(value === '—' || value == null ? '' : String(value).replace(/[^0-9.]/g, ''));
    setEditing(true);
  };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    const num = draft !== '' ? Number(draft) : null;
    await onSave(num);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  return (
    <div
      className="rounded-2xl p-4 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.035)', border: editing ? '1px solid rgba(140,107,63,0.55)' : '1px solid rgba(140,107,63,0.22)' }}
      onClick={!editing ? start : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(140,107,63,0.18)', border: '1px solid rgba(140,107,63,0.3)' }}>
          <Icon className="w-4 h-4" style={{ color: '#B48C4B' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'rgba(224,216,200,0.6)' }}>{label}</p>
          {editing ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                ref={inputRef}
                type={type}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
                placeholder={placeholder}
                className="w-full rounded-lg px-2 py-1 text-base font-semibold bg-transparent border"
                style={{ color: '#F5F1E7', borderColor: 'rgba(140,107,63,0.5)', outline: 'none' }}
              />
              <button type="button" onClick={e => { e.stopPropagation(); save(); }} className="p-1 rounded" style={{ color: '#6FCF97' }}><Check className="w-4 h-4" /></button>
              <button type="button" onClick={e => { e.stopPropagation(); cancel(); }} className="p-1 rounded" style={{ color: '#E07060' }}><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <p className="text-lg font-semibold mt-1 break-words" style={{ color: '#F5F1E7' }}>
              {safePrimitive(value)}
              {hint && <span className="ml-2 text-xs" style={{ color: 'rgba(140,107,63,0.5)' }}>{hint}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(140,107,63,0.22)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(140,107,63,0.18)',
            border: '1px solid rgba(140,107,63,0.3)',
          }}
        >
          <Icon className="w-4 h-4" style={{ color: '#B48C4B' }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {label}
          </p>
          <p className="text-lg font-semibold mt-1 break-words" style={{ color: '#F5F1E7' }}>
            {safePrimitive(value)}
          </p>
        </div>
      </div>
    </div>
  );
}

function EditableInfoRow({ label, value, onSave, type = 'text', options }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const display = safePrimitive(value);

  const start = () => {
    setDraft(value == null ? '' : String(value));
    setEditing(true);
  };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    const val = type === 'number' ? (draft !== '' ? Number(draft) : null) : (draft || null);
    await onSave(val);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  return (
    <div className="flex gap-3 py-2 items-center" style={{ borderBottom: '1px solid rgba(140,107,63,0.1)' }}>
      <span className="text-xs uppercase tracking-wider w-36 shrink-0 pt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{label}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          {options ? (
            <select
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="flex-1 rounded-lg px-2 py-1 text-sm bg-[rgba(20,15,12,0.8)] border"
              style={{ color: '#F5F1E7', borderColor: 'rgba(140,107,63,0.4)', outline: 'none' }}
            >
              <option value="">—</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              ref={inputRef}
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
              className="flex-1 rounded-lg px-2 py-1 text-sm bg-[rgba(20,15,12,0.8)] border"
              style={{ color: '#F5F1E7', borderColor: 'rgba(140,107,63,0.4)', outline: 'none' }}
            />
          )}
          <button type="button" onClick={save} className="p-1 rounded" style={{ color: '#6FCF97' }}><Check className="w-4 h-4" /></button>
          <button type="button" onClick={cancel} className="p-1 rounded" style={{ color: '#E07060' }}><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="flex-1 text-sm text-left group"
          style={{ color: display === '—' ? 'rgba(224,216,200,0.35)' : '#E0D8C8' }}
        >
          {display}
          <Pencil className="inline-block w-3 h-3 ml-2 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'rgba(140,107,63,0.8)' }} />
        </button>
      )}
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? 'rgba(140,107,63,0.35)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(140,107,63,0.5)' : '1px solid rgba(140,107,63,0.16)',
        color: active ? '#F5F1E7' : 'rgba(224,216,200,0.65)',
      }}
    >
      {label}
    </button>
  );
}

function InfoRow({ label, value }) {
  const display = safePrimitive(value);
  if (display === '—') return null;
  return (
    <div className="flex gap-3 py-2" style={{ borderBottom: '1px solid rgba(140,107,63,0.1)' }}>
      <span className="text-xs uppercase tracking-wider w-36 shrink-0 pt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
        {label}
      </span>
      <span className="text-sm break-words" style={{ color: '#E0D8C8' }}>
        {display}
      </span>
    </div>
  );
}

function SessionRow({ session, onEdit, onDelete }) {
  const segmentNotes = [session.first_third_notes, session.second_third_notes, session.final_third_notes].filter(Boolean);
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(140,107,63,0.18)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
            {session.overall_enjoyment > 0
              ? `⭐ ${session.overall_enjoyment}/5`
              : 'Unrated session'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {formatDate(session.date)}
            {session.occasion ? ` · ${session.occasion}` : ''}
            {session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
          </p>
          {session.notes && (
            <p className="text-sm mt-2 break-words" style={{ color: 'rgba(224,216,200,0.78)' }}>
              {session.notes}
            </p>
          )}
          {segmentNotes.length > 0 && (
            <p className="text-xs mt-2 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {segmentNotes.join(' · ')}
            </p>
          )}
          {(session.burn_quality || session.draw_quality || session.ash_quality || session.touch_ups != null || session.relights != null) && (
            <p className="text-xs mt-1 break-words" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {[session.burn_quality ? `Burn: ${session.burn_quality}` : null, session.draw_quality ? `Draw: ${session.draw_quality}` : null, session.ash_quality ? `Ash: ${session.ash_quality}` : null, session.touch_ups != null ? `Touch-ups: ${session.touch_ups}` : null, session.relights != null ? `Relights: ${session.relights}` : null].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onEdit(session)} className="h-7 px-2 text-xs">Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(session)} className="h-7 px-2 text-xs" style={{ color: '#E05555' }}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

function CigarDetailInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { formatFromBase } = useCurrency();
  const id = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('overview');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [valuationModalOpen, setValuationModalOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const saveField = async (field, value) => {
    await base44.entities.Cigar.update(cigar.id, { [field]: value, created_by: cigar.created_by || user?.email });
    queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
    queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['cigars-summary', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['cigars-insights', user?.email] });
    toast.success('Updated');
  };

  const { data: cigar, isLoading: cigarLoading } = useQuery({
    queryKey: ['cigar-detail', id, user?.email],
    queryFn: async () => {
      if (!id || !user?.email) return null;
      try {
        const fetched = await base44.entities.Cigar.get(id);
        if (fetched?.created_by === user.email) return fetched;
      } catch {
        // fall through
      }
      const found = await base44.entities.Cigar.filter({ id, created_by: user?.email }).catch(() => []);
      return found?.[0] || null;
    },
    enabled: !!id && !!user?.email,
    staleTime: 10000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['cigar-sessions', id, user?.email],
    queryFn: async () => {
      if (!id || !user?.email) return [];
      const result = await base44.entities.CigarSession.filter({ cigar_id: id, created_by: user.email }, '-date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!id && !!user?.email,
    staleTime: 10000,
  });

  const { data: humidor } = useQuery({
    queryKey: ['humidor-for-cigar', cigar?.humidor_id],
    queryFn: async () => {
      const result = await base44.entities.HumidorLocation.filter({ id: cigar.humidor_id, created_by: user?.email }).catch(() => []);
      return result?.[0] || null;
    },
    enabled: !!cigar?.humidor_id && !!user?.email,
    staleTime: 10000,
  });

  const { data: allHumidors = [] } = useQuery({
    queryKey: ['all-humidors', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.HumidorLocation.filter({ created_by: user.email }, 'name').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const [valueSnapshots, setValueSnapshots] = useState([]);
  const [priceObservations, setPriceObservations] = useState([]);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [isRefreshingValue, setIsRefreshingValue] = useState(false);

  async function loadValueSnapshots(cigarId) {
    if (!cigarId || !user?.email) { setValueSnapshots([]); return []; }
    try {
      const rows = await base44.entities.ItemValueSnapshot.filter(
        { item_id: cigarId, created_by: user.email, module_key: 'cigarkeeper' },
        '-snapshot_date', 20
      ).catch(() => []);
      setValueSnapshots(rows || []);
      return rows || [];
    } catch { setValueSnapshots([]); return []; }
  }

  async function loadPriceObservations(cigarId) {
    if (!cigarId || !user?.email) { setPriceObservations([]); return []; }
    try {
      const rows = await base44.entities.PriceObservation.filter(
        { item_id: cigarId, created_by: user.email, module_key: 'cigarkeeper' },
        '-observed_date', 20
      ).catch(() => []);
      setPriceObservations(rows || []);
      return rows || [];
    } catch { setPriceObservations([]); return []; }
  }

  // Track whether we've already run the one-shot market valuation patch for this cigar
  const marketValuationAppliedRef = useRef(false);

  // Auto-seed snapshot and load valuation data when cigar is loaded
  useEffect(() => {
    if (!cigar?.id || !user?.email) return;
    // Reset the guard whenever the cigar changes
    marketValuationAppliedRef.current = false;
  }, [cigar?.id, user?.email]);

  useEffect(() => {
    if (!cigar?.id || !user?.email) return;
    let mounted = true;
    (async () => {
      const [snapshots, observations] = await Promise.all([
        loadValueSnapshots(cigar.id),
        loadPriceObservations(cigar.id),
      ]);

      // Apply market valuation from observations ONCE — guard prevents re-triggering on invalidate
      if (cigar && observations.length > 0 && !marketValuationAppliedRef.current) {
        marketValuationAppliedRef.current = true;
        const derivation = deriveCigarMarketValuation(cigar, { observations, snapshots });
        const patch = buildCigarMarketValuationPatch(cigar, derivation);
        if (patch) {
          await base44.entities.Cigar.update(cigar.id, { ...patch, created_by: cigar.created_by || user?.email }).catch(() => {});
          queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user.email] });
        }
      }

      if (mounted && snapshots.length === 0) {
        const seeded = await seedInitialSnapshotIfMissing(
          cigar, 'cigarkeeper', 'cigar', user.email, base44, snapshots, {}
        );
        if (seeded && mounted) await loadValueSnapshots(cigar.id);
      }
    })();
    return () => { mounted = false; };
  }, [cigar?.id, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const valuationSnapshot = useMemo(
    () => cigar ? buildValuationSnapshot(cigar, 'cigarkeeper', { valueHistory: valueSnapshots }) : null,
    [cigar, valueSnapshots]
  );
  const valueTrend = useMemo(() => resolveValueTrend(valueSnapshots), [valueSnapshots]);

  async function handleRefreshValueNow() {
    if (!cigar || !user?.email || isRefreshingValue) return;
    setIsRefreshingValue(true);
    try {
      const newSnap = await refreshItemValue(cigar, 'cigarkeeper', 'cigar', user.email, base44, { valueHistory: valueSnapshots });
      if (newSnap) {
        setValueSnapshots(prev => [newSnap, ...prev]);
        await loadValueSnapshots(cigar.id);
      }
    } finally {
      setIsRefreshingValue(false);
    }
  }

  const displayValue = useMemo(() => {
    if (!valuationSnapshot || !valuationSnapshot.currentValue) return '—';
    return formatFromBase(valuationSnapshot.currentValue);
  }, [valuationSnapshot, formatFromBase]);

  const inventoryMetrics = useMemo(
    () => (cigar ? getCigarInventoryMetrics(cigar, sessions) : null),
    [cigar, sessions]
  );

  const handleDelete = async () => {
    try {
      await base44.entities.Cigar.delete(cigar.id);
      queryClient.invalidateQueries({ queryKey: ['cigars'] });
      toast.success('Cigar deleted');
      navigate('/Cigars');
    } catch {
      toast.error('Failed to delete cigar');
    }
  };

  const handleToggleFavorite = async () => {
    if (!cigar) return;
    try {
      await base44.entities.Cigar.update(cigar.id, { is_favorite: !cigar.is_favorite, created_by: cigar.created_by || user?.email });
      queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleQuickStateUpdate = async (patch, action = null) => {
    if (!patch) {
      toast.error('Unable to apply action');
      return;
    }
    try {
      await base44.entities.Cigar.update(cigar.id, { ...patch, created_by: cigar.created_by || user?.email });
      queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cigars-summary', user?.email] });
      toast.success(action ? getCigarQuickActionSuccessMessage(action, cigar, patch) : 'Updated');
    } catch {
      toast.error('Failed to update cigar');
    }
  };

  const handleDeleteSession = async (session) => {
    if (!session?.id) return;
    if (!window.confirm('Delete this session?')) return;
    try {
      await base44.entities.CigarSession.delete(session.id);
      queryClient.invalidateQueries({ queryKey: ['cigar-sessions', id, user?.email] });
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const handleSaveValuation = async (patch) => {
    try {
      await base44.entities.Cigar.update(cigar.id, { ...patch, created_by: cigar.created_by || user?.email });
      queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cigars-summary', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['cigars-insights', user?.email] });
      toast.success('Valuation updated');
    } catch {
      toast.error('Failed to update valuation');
    }
  };

  const photo = Array.isArray(cigar?.photos) ? cigar.photos[0] : cigar?.photos || '';
  const actionLabels = getCigarQuickActionLabels(cigar);
  const locationMeta = [
    cigar?.humidor_tray ? `Tray ${cigar.humidor_tray}` : null,
    cigar?.humidor_shelf ? `Shelf ${cigar.humidor_shelf}` : null,
    cigar?.humidor_drawer ? `Drawer ${cigar.humidor_drawer}` : null,
    cigar?.humidor_section ? `Section ${cigar.humidor_section}` : null,
  ].filter(Boolean);

  if (!id) {
    return (
      <div className="p-8 text-center" style={{ color: 'rgba(224,216,200,0.6)' }}>
        No cigar ID specified.
      </div>
    );
  }

  if (cigarLoading) {
    return (
      <div className="p-8" style={{ color: 'rgba(224,216,200,0.6)' }}>
        Loading…
      </div>
    );
  }

  if (!cigar) {
    return (
      <div className="p-8 text-center" style={{ color: 'rgba(224,216,200,0.6)' }}>
        <p>Cigar not found.</p>
        <Button className="mt-4" onClick={() => navigate('/Cigars')}>
          Back to Collection
        </Button>
      </div>
    );
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'sessions', label: `Sessions (${sessions.length})` },
    { key: 'aging', label: 'Aging' },
    { key: 'details', label: 'Details' },
  ];

  return (
    <div className="space-y-6 text-[#F5F1E7]">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="ghost"
          onClick={() => navigate('/Cigars')}
          className="gap-2"
          style={{ color: 'rgba(224,216,200,0.75)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Collection
        </Button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            title={cigar.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
          >
            <Star
              className="w-5 h-5"
              style={{ color: cigar.is_favorite ? '#D4A574' : 'rgba(224,216,200,0.4)' }}
              fill={cigar.is_favorite ? '#D4A574' : 'none'}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSession(null);
              setSessionModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Flame className="w-4 h-4" />
            Log Session
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'smoked_one'), 'smoked_one')}>
            Smoked One
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'bought_more'), 'bought_more')}>
            Bought More
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <MoreVertical className="w-4 h-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'toggle_wishlist'), 'toggle_wishlist')}>
                {actionLabels.toggle_wishlist}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'toggle_shopping'), 'toggle_shopping')}>
                {actionLabels.toggle_shopping}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'toggle_restock'), 'toggle_restock')}>
                {actionLabels.toggle_restock}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'toggle_not_for_me'), 'toggle_not_for_me')}>
                {actionLabels.toggle_not_for_me}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'toggle_favorite'), 'toggle_favorite')}>
                {actionLabels.toggle_favorite}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <EnrichButton
            itemType="cigar"
            record={cigar}
            onEnriched={() => queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] })}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/CigarForm?id=${encodeURIComponent(cigar.id)}`)}
            className="gap-1.5"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            style={{ color: '#E05555' }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Header */}
      <div
        className="rounded-2xl p-4 sm:p-6 flex gap-4 sm:gap-6 flex-col sm:flex-row"
        style={{
          background: 'linear-gradient(145deg, rgba(40,28,18,0.95), rgba(27,19,13,0.98))',
          border: '1px solid rgba(140,107,63,0.35)',
        }}
      >
        {photo && !imageFailed && (
          <div
            className="w-24 h-32 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(58,40,28,0.6)', border: '1px solid rgba(140,107,63,0.2)' }}
          >
            <img src={photo} alt={cigar.name || 'Cigar'} className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
          </div>
        )}
        {(!photo || imageFailed) && (
          <div
            className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(58,40,28,0.6)', border: '1px solid rgba(140,107,63,0.2)' }}
          >
            <Cigarette className="w-8 h-8" style={{ color: 'rgba(140,107,63,0.5)' }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium mb-1" style={{ color: '#B48C4B' }}>
            {safePrimitive(cigar.brand)}
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
            {safePrimitive(cigar.name, 'Unnamed Cigar')}
          </h1>
          {cigar.line && (
            <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.65)' }}>
              {cigar.line}
              {cigar.vitola ? ` · ${cigar.vitola}` : ''}
            </p>
          )}
          {cigar.country_of_origin && (
            <p className="text-xs mt-2" style={{ color: 'rgba(224,216,200,0.5)' }}>
              {cigar.country_of_origin}
            </p>
          )}
          {(humidor?.name || locationMeta.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {humidor?.name && (
                <span className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(180,140,75,0.18)', color: '#E0D8C8' }}>
                  {humidor.name}
                </span>
              )}
              {locationMeta.map((value) => (
                <span key={value} className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(224,216,200,0.8)' }}>
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <EditableStatCard
          label="Sticks"
          value={cigar.singles_equivalent ?? cigar.quantity ?? '—'}
          icon={Package}
          placeholder="# sticks"
          onSave={async (val) => {
            await base44.entities.Cigar.update(cigar.id, { singles_equivalent: val, quantity: val, created_by: cigar.created_by || user?.email });
            queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
            toast.success('Sticks updated');
          }}
        />
        <EditableStatCard
          label="Value (est.)"
          value={displayValue}
          icon={DollarSign}
          editable={false}
          onCardClick={() => setValuationModalOpen(true)}
          hint="tap to manage"
        />
        <EditableStatCard
          label="Rating"
          value={cigar.rating ?? '—'}
          icon={Star}
          placeholder="1–5"
          onSave={async (val) => {
            const clamped = val != null ? Math.min(5, Math.max(0, val)) : null;
            await base44.entities.Cigar.update(cigar.id, { rating: clamped, created_by: cigar.created_by || user?.email });
            queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
            toast.success('Rating updated');
          }}
        />
        <DetailStat
          label="Humidor"
          value={humidor?.name || (cigar.humidor_id ? 'Loading…' : 'Unassigned')}
          icon={Flame}
        />
      </div>

      <UnifiedValuationCard
        item={cigar}
        itemType="cigar"
        moduleKey="cigarkeeper"
        valuationSnapshot={valuationSnapshot}
        valueTrend={valueTrend}
        valueSnapshots={valueSnapshots}
        priceObservations={priceObservations}
        onAddSnapshot={() => setShowSnapshotModal(true)}
        onAddObservation={() => setShowObservationModal(true)}
        onEditValuation={() => setValuationModalOpen(true)}
        onRefreshNow={handleRefreshValueNow}
        isRefreshing={isRefreshingValue}
      />

      {/* Rarity / Collectibility Panel */}
      {(() => {
        const rarity = getCigarRarityResult(cigar);
        if (!rarity) return null;
        const labelColor =
          rarity.label === 'Exceptional' ? '#E0B450' :
          rarity.label === 'Rare' ? '#D4A574' :
          rarity.label === 'Collectible' ? '#6FCF97' :
          rarity.label === 'Notable' ? '#7EC8E3' :
          'rgba(224,216,200,0.55)';
        const confColor = rarity.confidence === 'high' ? '#6FCF97' : rarity.confidence === 'medium' ? '#D4A574' : 'rgba(224,216,200,0.45)';
        return (
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, rgba(40,28,18,0.95), rgba(27,19,13,0.98))', border: '1px solid rgba(140,107,63,0.25)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className="text-xs uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(224,216,200,0.55)' }}>Collectibility</span>
              <div className="flex items-center gap-2">
                {rarity.score != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: confColor }}>
                    {rarity.confidence === 'insufficient' ? 'Insufficient data' : `${rarity.confidence} confidence`}
                  </span>
                )}
              </div>
            </div>
            {rarity.score == null ? (
              <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>{rarity.reasoning}</p>
            ) : (
              <>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-4xl font-bold tabular-nums" style={{ color: labelColor }}>{rarity.score}</span>
                  <span className="text-lg font-semibold mb-0.5" style={{ color: labelColor }}>{rarity.label}</span>
                  <span className="text-xs mb-1 ml-auto" style={{ color: 'rgba(224,216,200,0.4)' }}>out of 100</span>
                </div>
                {rarity.factors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {rarity.factors.map((f) => (
                      <span key={f.label} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(140,107,63,0.18)', color: '#D8C7A6', border: '1px solid rgba(140,107,63,0.25)' }}>
                        {f.label}: {f.note}
                      </span>
                    ))}
                  </div>
                )}
                {rarity.reasoning && (
                  <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>{rarity.reasoning}</p>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <TabBtn key={t.key} label={t.label} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} />
        ))}
      </div>

      {/* Tab content */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(145deg, rgba(40,28,18,0.95), rgba(27,19,13,0.98))',
          border: '1px solid rgba(140,107,63,0.25)',
        }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-1">
            <InfoRow label="Brand" value={cigar.brand} />
            <InfoRow label="Line" value={cigar.line} />
            <InfoRow label="Vitola" value={cigar.vitola} />
            <InfoRow label="Wrapper" value={cigar.wrapper} />
            <InfoRow label="Binder" value={cigar.binder} />
            <InfoRow label="Filler" value={cigar.filler} />
            <InfoRow label="Origin" value={cigar.country_of_origin} />
            <InfoRow label="Factory" value={cigar.factory} />
            <InfoRow label="Length" value={cigar.length_inches ? `${cigar.length_inches}"` : ''} />
            <InfoRow label="Ring Gauge" value={cigar.ring_gauge} />
            <InfoRow label="Body" value={formatCigarStrengthLabel(cigar.body)} />
            <InfoRow label="Strength" value={formatCigarStrengthLabel(cigar.strength)} />
            <InfoRow label="Flavor Notes" value={Array.isArray(cigar.flavor_notes) ? cigar.flavor_notes.join(', ') : cigar.flavor_notes} />
            <InfoRow label="Production" value={cigar.production_status} />
            <InfoRow label="Wishlist" value={cigar.wishlist ? 'Yes' : 'No'} />
            <InfoRow label="Shopping List" value={cigar.shopping_list ? 'Yes' : 'No'} />
            <InfoRow label="Restock" value={cigar.restock_flag ? 'Yes' : 'No'} />
            <InfoRow label="Not for Me" value={cigar.not_for_me ? 'Yes' : 'No'} />
            {cigar.personal_notes && (
              <div className="pt-3">
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(224,216,200,0.5)' }}>Personal Notes</p>
                <p className="text-sm" style={{ color: '#E0D8C8' }}>{cigar.personal_notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-0">
            <EditableInfoRow
              label="Quantity"
              value={cigar.quantity}
              type="number"
              onSave={(v) => saveField('quantity', v)}
            />
            <EditableInfoRow
              label="Unit Type"
              value={cigar.unit_type}
              options={['single', '5pack', 'pack', 'box', 'bundle', 'partial_pack', 'partial_box']}
              onSave={(v) => saveField('unit_type', v)}
            />
            <EditableInfoRow
              label={['partial_box', 'partial_pack'].includes(cigar.unit_type) ? 'Remaining Sticks' : 'Total Sticks'}
              value={cigar.singles_equivalent}
              type="number"
              onSave={(v) => saveField('singles_equivalent', v)}
            />
            <EditableInfoRow
              label="Cigars per Package"
              value={cigar.cigars_per_package}
              type="number"
              onSave={(v) => saveField('cigars_per_package', v)}
            />
            <EditableInfoRow
              label="Package Open"
              value={cigar.package_open ? 'Yes' : 'No'}
              options={['Yes', 'No']}
              onSave={(v) => saveField('package_open', v === 'Yes')}
            />
            {inventoryMetrics && (
              <>
                <InfoRow
                  label="Last Smoked"
                  value={inventoryMetrics.lastSmokedDate ? formatDate(inventoryMetrics.lastSmokedDate) : 'Not yet'}
                />
                <InfoRow label="Times Smoked" value={inventoryMetrics.totalSmoked || 0} />
                {inventoryMetrics.consumptionRatePerMonth > 0 && (
                  <InfoRow
                    label="Consumption Rate"
                    value={`~${inventoryMetrics.consumptionRatePerMonth.toFixed(1)}/mo`}
                  />
                )}
                {inventoryMetrics.estimatedMonthsRemaining != null && (
                  <InfoRow
                    label="Est. Months Remaining"
                    value={
                      inventoryMetrics.estimatedMonthsRemaining === 0
                        ? 'Depleted'
                        : `~${inventoryMetrics.estimatedMonthsRemaining} month${inventoryMetrics.estimatedMonthsRemaining !== 1 ? 's' : ''}`
                    }
                  />
                )}
              </>
            )}
            <EditableInfoRow
              label="Purchase Source"
              value={cigar.purchase_source}
              onSave={(v) => saveField('purchase_source', v)}
            />
            <EditableInfoRow
              label="Purchase Date"
              value={cigar.purchase_date || ''}
              type="date"
              onSave={(v) => saveField('purchase_date', v)}
            />
            <EditableInfoRow
              label="Purchase Price"
              value={cigar.purchase_price}
              type="number"
              onSave={(v) => saveField('purchase_price', v)}
            />
            <InfoRow label="Estimated Value" value={displayValue} />
            <InfoRow label="Valuation Confidence" value={valuationSnapshot?.confidence || '—'} />
            <InfoRow label="Valuation Source" value={valuationSnapshot?.source || '—'} />
            <div className="py-2" style={{ borderBottom: '1px solid rgba(140,107,63,0.1)' }}>
              <Button size="sm" variant="ghost" onClick={() => setValuationModalOpen(true)}>
                Edit valuation inputs
              </Button>
            </div>
            <EditableInfoRow
              label="Storage Notes"
              value={cigar.storage_notes}
              onSave={(v) => saveField('storage_notes', v)}
            />
            <div className="flex gap-3 py-2 items-center" style={{ borderBottom: '1px solid rgba(140,107,63,0.1)' }}>
              <span className="text-xs uppercase tracking-wider w-36 shrink-0" style={{ color: 'rgba(224,216,200,0.5)' }}>Humidor</span>
              <select
                value={cigar.humidor_id || ''}
                onChange={async (e) => {
                  const val = e.target.value || null;
                  await base44.entities.Cigar.update(cigar.id, val ? { humidor_id: val, created_by: cigar.created_by || user?.email } : {
                    humidor_id: null,
                    humidor_tray: null,
                    humidor_shelf: null,
                    humidor_drawer: null,
                    humidor_section: null,
                    created_by: cigar.created_by || user?.email,
                  });
                  queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
                  queryClient.invalidateQueries({ queryKey: ['humidor-for-cigar'] });
                  toast.success('Humidor updated');
                }}
                className="flex-1 rounded-lg px-2 py-1.5 text-sm"
                style={{
                  background: 'rgba(20,15,12,0.8)',
                  border: '1px solid rgba(140,107,63,0.35)',
                  color: '#F5F1E7',
                  outline: 'none',
                }}
              >
                <option value="">Unassigned</option>
                {allHumidors.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <EditableInfoRow label="Humidor Tray" value={cigar.humidor_tray} onSave={(v) => saveField('humidor_tray', v)} />
            <EditableInfoRow label="Humidor Shelf" value={cigar.humidor_shelf} onSave={(v) => saveField('humidor_shelf', v)} />
            <EditableInfoRow label="Humidor Drawer" value={cigar.humidor_drawer} onSave={(v) => saveField('humidor_drawer', v)} />
            <EditableInfoRow label="Humidor Section" value={cigar.humidor_section} onSave={(v) => saveField('humidor_section', v)} />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ color: 'rgba(224,216,200,0.5)' }}>No sessions logged yet</p>
                <Button
                  className="mt-4"
                  onClick={() => setSessionModalOpen(true)}
                >
                  Log a Session
                </Button>
              </div>
            ) : (
              sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  onEdit={(session) => {
                    setEditingSession(session);
                    setSessionModalOpen(true);
                  }}
                  onDelete={handleDeleteSession}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'aging' && (
          <AgingTabContent cigar={cigar} humidor={humidor} />
        )}

        {activeTab === 'details' && (
          <div className="space-y-1">
            <InfoRow label="Barcode" value={cigar.barcode} />
            <InfoRow label="UPC" value={cigar.upc} />
            <InfoRow label="EAN" value={cigar.ean} />
            <InfoRow label="Aliases" value={Array.isArray(cigar.aliases) ? cigar.aliases.join(', ') : cigar.aliases} />
            <InfoRow label="Release Type" value={cigar.release_type} />
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent
          style={{
            background: 'linear-gradient(145deg, rgba(40,28,18,0.98), rgba(27,19,13,0.99))',
            border: '1px solid rgba(140,107,63,0.35)',
            color: '#F5F1E7',
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#F5F1E7' }}>Delete Cigar?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgba(224,216,200,0.65)' }}>
              This will permanently delete <strong>{cigar.name}</strong> from your collection. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ background: '#E05555', color: '#fff' }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CigarSessionModal
        isOpen={sessionModalOpen}
        onClose={() => {
          setSessionModalOpen(false);
          setEditingSession(null);
        }}
        defaultCigar={cigar}
        editSession={editingSession}
        onSessionSaved={() => {
          setSessionModalOpen(false);
          setEditingSession(null);
          queryClient.invalidateQueries({ queryKey: ['cigar-sessions', id, user?.email] });
          queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
          queryClient.invalidateQueries({ queryKey: ['cigars', user?.email] });
        }}
      />

      <CigarValuationModal
        open={valuationModalOpen}
        onOpenChange={setValuationModalOpen}
        cigar={cigar}
        onSave={handleSaveValuation}
      />

      {showSnapshotModal && (
        <CigarSnapshotModal
          cigar={cigar}
          valuationSnapshot={valuationSnapshot}
          userEmail={user?.email}
          onClose={() => setShowSnapshotModal(false)}
          onSaved={() => { setShowSnapshotModal(false); loadValueSnapshots(cigar.id); }}
        />
      )}

      {showObservationModal && (
        <CigarObservationModal
          cigar={cigar}
          userEmail={user?.email}
          onClose={() => setShowObservationModal(false)}
          onSaved={() => { setShowObservationModal(false); loadPriceObservations(cigar.id); }}
        />
      )}
    </div>
  );
}

// ── Save Checkpoint Modal ─────────────────────────────────────────────────────

function CigarSnapshotModal({ cigar, valuationSnapshot, userEmail, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    snapshot_date: today,
    computed_current_value: String(valuationSnapshot?.currentValue || ''),
    retail_value: String(cigar?.retail_price || ''),
    market_value: String(cigar?.market_estimated_total_value || ''),
    value_confidence: valuationSnapshot?.confidence || 'medium',
    source: valuationSnapshot?.source || '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const toN = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.ItemValueSnapshot.create({
        module_key: 'cigarkeeper',
        item_type: 'cigar',
        item_id: cigar.id,
        created_by: userEmail,
        snapshot_date: form.snapshot_date,
        computed_current_value: toN(form.computed_current_value),
        computed_value: toN(form.computed_current_value),
        retail_value: toN(form.retail_value),
        market_value: toN(form.market_value),
        value_confidence: form.value_confidence,
        confidence: form.value_confidence,
        source: form.source || null,
        rarity_score: valuationSnapshot?.rarityScore ?? null,
        replacement_difficulty: valuationSnapshot?.replacementDifficulty || null,
        recommendation: valuationSnapshot?.holdRecommendation || null,
        notes: form.notes || null,
        is_auto_generated: false,
      });
      onSaved();
    } catch { toast.error('Failed to save checkpoint'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">Save Value Checkpoint</h3>
        <div className="space-y-3">
          {[
            { label: 'Snapshot Date', field: 'snapshot_date', type: 'date' },
            { label: 'Current Value (total)', field: 'computed_current_value', type: 'number' },
            { label: 'Retail Value (total)', field: 'retail_value', type: 'number' },
            { label: 'Market Value (total)', field: 'market_value', type: 'number' },
            { label: 'Source', field: 'source', type: 'text' },
            { label: 'Notes', field: 'notes', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input type={type} value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Confidence</label>
            <Select value={form.value_confidence} onValueChange={v => setForm(prev => ({ ...prev, value_confidence: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Checkpoint'}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Market Observation Modal ──────────────────────────────────────────────

function CigarObservationModal({ cigar, userEmail, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    observed_date: today,
    observed_price: '',
    price_type: 'retail',
    source_name: '',
    source_url: '',
    condition_note: '',
    region: '',
    currency: 'USD',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.observed_price) return;
    setSaving(true);
    try {
      await base44.entities.PriceObservation.create({
        module_key: 'cigarkeeper',
        item_type: 'cigar',
        item_id: cigar.id,
        created_by: userEmail,
        observed_price: Number(form.observed_price),
        price_type: form.price_type,
        source_name: form.source_name || null,
        source_url: form.source_url || null,
        observed_date: form.observed_date,
        condition_note: form.condition_note || null,
        region: form.region || null,
        currency: form.currency || 'USD',
        is_manual: true,
      });
      onSaved();
    } catch { toast.error('Failed to save observation'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(59,130,246,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">Add Market Observation</h3>
        <div className="space-y-3">
          {[
            { label: 'Observed Date', field: 'observed_date', type: 'date' },
            { label: 'Price *', field: 'observed_price', type: 'number' },
            { label: 'Source Name', field: 'source_name', type: 'text' },
            { label: 'Source URL', field: 'source_url', type: 'text' },
            { label: 'Condition Note', field: 'condition_note', type: 'text' },
            { label: 'Region', field: 'region', type: 'text' },
            { label: 'Currency', field: 'currency', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input type={type} value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Price Type</label>
            <Select value={form.price_type} onValueChange={v => setForm(prev => ({ ...prev, price_type: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="aftermarket">Aftermarket</SelectItem>
                <SelectItem value="auction">Auction</SelectItem>
                <SelectItem value="collector">Collector</SelectItem>
                <SelectItem value="estimate">Estimate</SelectItem>
                <SelectItem value="private_sale">Private Sale</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.observed_price}
            style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(37,99,235,0.9))', color: '#F5F1E7' }}>
            {saving ? 'Saving…' : 'Save Observation'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// LockedModuleGuard is already applied by App.jsx's CigarReleaseRoute wrapper
export default function CigarDetail() {
  return <CigarDetailInner />;
}