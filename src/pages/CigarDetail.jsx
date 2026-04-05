import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
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
  BookOpen,
  Flame,
  ShieldAlert,
  Thermometer,
  Clock3,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import CigarSessionModal from '@/components/cigars/CigarSessionModal';
import { getCigarReadinessWithContext } from '@/platform/agingReadiness';
import { getCigarInventoryMetrics } from '@/platform/cigarInventory';

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

function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
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

function SessionRow({ session }) {
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
              ? `⭐ ${session.overall_enjoyment}/10`
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
  const id = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('overview');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

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
    queryKey: ['cigar-sessions', id],
    queryFn: async () => {
      if (!id) return [];
      const result = await base44.entities.CigarSession.filter({ cigar_id: id }, '-date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!id,
    staleTime: 10000,
  });

  const { data: humidor } = useQuery({
    queryKey: ['humidor-for-cigar', cigar?.humidor_id],
    queryFn: async () => {
      const result = await base44.entities.HumidorLocation.filter({ id: cigar.humidor_id }).catch(() => []);
      return result?.[0] || null;
    },
    enabled: !!cigar?.humidor_id,
    staleTime: 10000,
  });

  const displayValue = useMemo(() => {
    const v = cigar?.estimated_value || cigar?.purchase_price;
    return v ? formatCurrency(v) : '—';
  }, [cigar]);
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
      await base44.entities.Cigar.update(cigar.id, { is_favorite: !cigar.is_favorite });
      queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const photo = Array.isArray(cigar?.photos) ? cigar.photos[0] : cigar?.photos || '';

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
        <div className="flex items-center gap-2">
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
            onClick={() => setSessionModalOpen(true)}
            className="gap-1.5"
          >
            <Flame className="w-4 h-4" />
            Log Session
          </Button>
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
        className="rounded-2xl p-6 flex gap-6 flex-col sm:flex-row"
        style={{
          background: 'linear-gradient(145deg, rgba(40,28,18,0.95), rgba(27,19,13,0.98))',
          border: '1px solid rgba(140,107,63,0.35)',
        }}
      >
        {photo && (
          <div
            className="w-24 h-32 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(58,40,28,0.6)', border: '1px solid rgba(140,107,63,0.2)' }}
          >
            <img src={photo} alt={cigar.name} className="w-full h-full object-cover" />
          </div>
        )}
        {!photo && (
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DetailStat
          label="Quantity"
          value={cigar.singles_equivalent ?? cigar.quantity ?? '—'}
          icon={Package}
        />
        <DetailStat label="Value" value={displayValue} icon={BookOpen} />
        <DetailStat
          label="Rating"
          value={cigar.rating ? `${cigar.rating}/100` : '—'}
          icon={Star}
        />
        <DetailStat
          label="Humidor"
          value={humidor?.name || (cigar.humidor_id ? 'Loading…' : 'Unassigned')}
          icon={Flame}
        />
      </div>

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
            <InfoRow label="Body" value={cigar.body} />
            <InfoRow label="Strength" value={cigar.strength} />
            <InfoRow label="Flavor Notes" value={Array.isArray(cigar.flavor_notes) ? cigar.flavor_notes.join(', ') : cigar.flavor_notes} />
            <InfoRow label="Production" value={cigar.production_status} />
            {cigar.personal_notes && (
              <div className="pt-3">
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(224,216,200,0.5)' }}>Personal Notes</p>
                <p className="text-sm" style={{ color: '#E0D8C8' }}>{cigar.personal_notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-1">
            <InfoRow label="Quantity" value={cigar.quantity} />
            <InfoRow label="Unit Type" value={cigar.unit_type} />
            <InfoRow label="Singles Equiv." value={cigar.singles_equivalent} />
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
            <InfoRow label="Purchase Source" value={cigar.purchase_source} />
            <InfoRow label="Purchase Date" value={formatDate(cigar.purchase_date)} />
            <InfoRow label="Purchase Price" value={cigar.purchase_price ? formatCurrency(cigar.purchase_price) : ''} />
            <InfoRow label="Est. Value" value={cigar.estimated_value ? formatCurrency(cigar.estimated_value) : ''} />
            <InfoRow label="Humidor" value={humidor?.name} />
            <InfoRow label="Storage Notes" value={cigar.storage_notes} />
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
              sessions.map((s) => <SessionRow key={s.id} session={s} />)
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
        onClose={() => setSessionModalOpen(false)}
        defaultCigar={cigar}
        onSessionSaved={() => {
          setSessionModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['cigar-sessions', id] });
        }}
      />
    </div>
  );
}

export default function CigarDetail() {
  return (
    <LockedModuleGuard moduleKey="cigarkeeper">
      <CigarDetailInner />
    </LockedModuleGuard>
  );
}
