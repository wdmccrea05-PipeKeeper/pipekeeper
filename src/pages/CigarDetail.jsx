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
  Search,
  Share2,
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
  getCigarQuickActionPatch,
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
import SimilarItemsDrawer from '@/components/recommendations/SimilarItemsDrawer';
import { runFindSimilar } from '@/components/recommendations/FindSimilarEngine';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import { getItemPhoto } from '@/lib/images/getItemPhoto';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { useTranslation } from '@/components/i18n/safeTranslation';

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

function getConfidenceLabel(t, confidence) {
  if (confidence === 'high') return t('cigars.valuation.confidenceHigh', 'High');
  if (confidence === 'medium') return t('cigars.valuation.confidenceMedium', 'Medium');
  if (confidence === 'low') return t('cigars.valuation.confidenceLow', 'Low');
  return t('common.unknown', 'Unknown');
}

function getConfidenceBadgeLabel(t, confidence) {
  if (!confidence) return t('cigars.detail.unknownConfidence', 'Unknown confidence');
  return t('cigars.detail.confidenceLevel', {
    confidence: getConfidenceLabel(t, confidence),
    defaultValue: '{{confidence}} confidence',
  });
}

function getTranslatedQuickActionLabels(t, cigar = {}) {
  return {
    smoked_one: t('cigars.detail.smokedOne', 'Smoked One'),
    bought_more: t('cigars.detail.boughtMore', 'Bought More'),
    toggle_wishlist: cigar.wishlist
      ? t('cigars.detail.removeFromWishlist', 'Remove from Wishlist')
      : t('cigars.detail.addToWishlist', 'Add to Wishlist'),
    toggle_shopping: cigar.shopping_list
      ? t('cigars.detail.removeFromShoppingList', 'Remove from Shopping List')
      : t('cigars.detail.moveToShoppingList', 'Move to Shopping List'),
    toggle_restock: cigar.restock_flag
      ? t('cigars.detail.clearRestock', 'Clear Restock')
      : t('cigars.detail.markRestock', 'Mark Restock'),
    toggle_not_for_me: cigar.not_for_me
      ? t('cigars.detail.removeNotForMe', 'Remove Not For Me')
      : t('cigars.detail.notForMeAction', 'Not For Me'),
    toggle_favorite: cigar.is_favorite
      ? t('cigars.detail.unfavorite', 'Unfavorite')
      : t('cigars.detail.favorite', 'Favorite'),
  };
}

function getTranslatedQuickActionSuccessMessage(t, action, cigar = {}, patch = {}) {
  if (action === 'smoked_one') return t('cigars.detail.loggedOneSmoked', 'Logged one smoked');
  if (action === 'bought_more') return t('cigars.detail.inventoryIncreased', 'Inventory increased');
  if (action === 'toggle_wishlist') return patch.wishlist
    ? t('cigars.detail.addedToWishlist', 'Added to wishlist')
    : t('cigars.detail.removedFromWishlist', 'Removed from wishlist');
  if (action === 'toggle_shopping') return patch.shopping_list
    ? t('cigars.detail.addedToShoppingList', 'Added to shopping list')
    : t('cigars.detail.removedFromShoppingList', 'Removed from shopping list');
  if (action === 'toggle_restock') return patch.restock_flag
    ? t('cigars.detail.markedForRestock', 'Marked for restock')
    : t('cigars.detail.restockCleared', 'Restock cleared');
  if (action === 'toggle_not_for_me') return patch.not_for_me
    ? t('cigars.detail.markedNotForMe', 'Marked not for me')
    : t('cigars.detail.removedNotForMeFlag', 'Removed not-for-me flag');
  if (action === 'toggle_favorite') return patch.is_favorite
    ? t('cigars.detail.addedToFavorites', 'Added to favorites')
    : t('cigars.detail.removedFromFavorites', 'Removed from favorites');
  return cigar?.name
    ? t('cigars.detail.updatedNamed', { name: cigar.name, defaultValue: 'Updated {{name}}' })
    : t('cigars.detail.updated', 'Updated');
}

function getTranslatedRarityLabel(t, label) {
  const key = {
    Exceptional: 'exceptional',
    Rare: 'rare',
    Collectible: 'collectible',
    Notable: 'notable',
  }[label];
  return key ? t(`cigars.detail.rarity.${key}`, label) : label;
}

function AgingTabContent({ cigar, humidor }) {
  const { t } = useTranslation();
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
            {getConfidenceBadgeLabel(t, readiness.confidence)}
          </span>
        </div>
        {readiness.detail && (
          <p className="text-sm mt-2" style={{ color: 'rgba(224,216,200,0.75)' }}>
            {readiness.detail}
          </p>
        )}
        {readiness.monthsAged !== null && (
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.45)' }}>
            {readiness.monthsAged === 1
              ? t('cigars.detail.monthInCellar', { count: readiness.monthsAged, defaultValue: '{{count}} month in cellar' })
              : t('cigars.detail.monthsInCellar', { count: readiness.monthsAged, defaultValue: '{{count}} months in cellar' })}
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
        <InfoRow label={t('cigars.detail.agingStart', 'Aging Start')} value={formatDate(cigar.aging_start_date)} />
        <InfoRow label={t('cigars.detail.readyToSmoke', 'Ready to Smoke')} value={formatDate(cigar.ready_to_smoke_date)} />
        <InfoRow label={t('cigars.detail.storage', 'Storage')} value={cigar.storage_notes} />
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
  hint = null,
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const resolvedHint = hint ?? t('cigars.detail.tapToEdit', 'tap to edit');

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
              {resolvedHint && <span className="ml-2 text-xs" style={{ color: 'rgba(140,107,63,0.5)' }}>{resolvedHint}</span>}
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
  const normalizedOptions = options?.map((option) => (
    typeof option === 'object'
      ? option
      : { value: option, label: option }
  ));

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
              {normalizedOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
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
  const { t } = useTranslation();
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
              : t('cigars.detail.unratedSession', 'Unrated session')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {formatDate(session.date)}
            {session.occasion ? ` · ${session.occasion}` : ''}
            {session.duration_minutes ? ` · ${t('cigars.detail.minutesShort', { count: session.duration_minutes, defaultValue: '{{count}} min' })}` : ''}
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
              {[
                session.burn_quality ? `${t('cigars.detail.burn', 'Burn')}: ${session.burn_quality}` : null,
                session.draw_quality ? `${t('cigars.detail.draw', 'Draw')}: ${session.draw_quality}` : null,
                session.ash_quality ? `${t('cigars.detail.ash', 'Ash')}: ${session.ash_quality}` : null,
                session.touch_ups != null ? `${t('cigars.detail.touchUps', 'Touch-ups')}: ${session.touch_ups}` : null,
                session.relights != null ? `${t('cigars.detail.relights', 'Relights')}: ${session.relights}` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onEdit(session)} className="h-7 px-2 text-xs">{t('common.edit', 'Edit')}</Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(session)} className="h-7 px-2 text-xs" style={{ color: '#E05555' }}>{t('common.delete', 'Delete')}</Button>
        </div>
      </div>
    </div>
  );
}

function CigarDetailInner() {
  const { t } = useTranslation();
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
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cigars(user?.email) });
    toast.success(t('cigars.detail.updated', 'Updated'));
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarResult, setSimilarResult] = useState(null);
  const [similarError, setSimilarError] = useState(null);

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cigars(user?.email) });
      toast.success(t('cigars.detail.cigarDeleted', 'Cigar deleted'));
      navigate('/Cigars');
    } catch {
      toast.error(t('cigars.detail.failedToDeleteCigar', 'Failed to delete cigar'));
    }
  };

  const handleToggleFavorite = async () => {
    if (!cigar) return;
    try {
      await base44.entities.Cigar.update(cigar.id, { is_favorite: !cigar.is_favorite, created_by: cigar.created_by || user?.email });
      queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
    } catch {
      toast.error(t('cigars.detail.failedToUpdateFavorite', 'Failed to update favorite'));
    }
  };

  const handleQuickStateUpdate = async (patch, action = null) => {
    if (!patch) {
      toast.error(t('cigars.detail.unableToApplyAction', 'Unable to apply action'));
      return;
    }
    try {
      await base44.entities.Cigar.update(cigar.id, { ...patch, created_by: cigar.created_by || user?.email });
      queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cigars(user?.email) });
      toast.success(action ? getTranslatedQuickActionSuccessMessage(t, action, cigar, patch) : t('cigars.detail.updated', 'Updated'));
    } catch {
      toast.error(t('cigars.detail.failedToUpdateCigar', 'Failed to update cigar'));
    }
  };

  const handleDeleteSession = async (session) => {
    if (!session?.id) return;
    if (!window.confirm(t('cigars.detail.deleteSessionConfirm', 'Delete this session?'))) return;
    try {
      await base44.entities.CigarSession.delete(session.id);
      queryClient.invalidateQueries({ queryKey: ['cigar-sessions', id, user?.email] });
      toast.success(t('cigars.detail.sessionDeleted', 'Session deleted'));
    } catch {
      toast.error(t('cigars.detail.failedToDeleteSession', 'Failed to delete session'));
    }
  };

  const handleSaveValuation = async (patch) => {
    try {
      await base44.entities.Cigar.update(cigar.id, { ...patch, created_by: cigar.created_by || user?.email });
      queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cigars(user?.email) });
      toast.success(t('cigars.detail.valuationUpdated', 'Valuation updated'));
    } catch {
      toast.error(t('cigars.detail.failedToUpdateValuation', 'Failed to update valuation'));
    }
  };

  const handleFindSimilar = async () => {
    if (!cigar || !user?.email) return;
    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarResult(null);
    setSimilarError(null);

    try {
      const allCigars = await base44.entities.Cigar.filter({ created_by: user.email }, '-created_date').catch(() => []);
      const result = await runFindSimilar({
        recordType: 'cigar',
        anchor: cigar,
        context: {
          cigars: allCigars || [],
        },
      });
      setSimilarResult(result);
    } catch (error) {
      setSimilarError(error?.message || t('cigars.detail.failedToFindSimilar', 'Failed to find similar cigars.'));
    } finally {
      setSimilarLoading(false);
    }
  };

  const photo = getItemPhoto(cigar);
  const actionLabels = getTranslatedQuickActionLabels(t, cigar);
  const locationMeta = [
    cigar?.humidor_tray ? t('cigars.detail.locationTray', { value: cigar.humidor_tray, defaultValue: 'Tray {{value}}' }) : null,
    cigar?.humidor_shelf ? t('cigars.detail.locationShelf', { value: cigar.humidor_shelf, defaultValue: 'Shelf {{value}}' }) : null,
    cigar?.humidor_drawer ? t('cigars.detail.locationDrawer', { value: cigar.humidor_drawer, defaultValue: 'Drawer {{value}}' }) : null,
    cigar?.humidor_section ? t('cigars.detail.locationSection', { value: cigar.humidor_section, defaultValue: 'Section {{value}}' }) : null,
  ].filter(Boolean);

  if (!id) {
    return (
      <div className="p-8 text-center" style={{ color: 'rgba(224,216,200,0.6)' }}>
        {t('cigars.detail.noCigarIdSpecified', 'No cigar ID specified.')}
      </div>
    );
  }

  if (cigarLoading) {
    return (
      <div className="p-8" style={{ color: 'rgba(224,216,200,0.6)' }}>
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  if (!cigar) {
    return (
      <div className="p-8 text-center" style={{ color: 'rgba(224,216,200,0.6)' }}>
        <p>{t('cigars.detail.cigarNotFound', 'Cigar not found.')}</p>
        <Button className="mt-4" onClick={() => navigate('/Cigars')}>
          {t('cigars.detail.backToCollection', 'Back to Collection')}
        </Button>
      </div>
    );
  }

  const TABS = [
    { key: 'overview', label: t('cigars.detail.overview', 'Overview') },
    { key: 'inventory', label: t('cigars.detail.inventory', 'Inventory') },
    { key: 'sessions', label: t('cigars.detail.sessionsTab', { count: sessions.length, defaultValue: 'Sessions ({{count}})' }) },
    { key: 'aging', label: t('cigars.detail.aging', 'Aging') },
    { key: 'details', label: t('cigars.detail.details', 'Details') },
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
          {t('cigars.tabCollection', 'Collection')}
        </Button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            title={cigar.is_favorite
              ? t('cigars.detail.removeFavorite', 'Remove favorite')
              : t('cigars.detail.markAsFavorite', 'Mark as favorite')}
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
            onClick={handleFindSimilar}
            className="gap-1.5"
          >
            <Search className="w-4 h-4" />
            {t('cigars.detail.similar', 'Similar')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            {t('common.share', 'Share')}
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
            {t('cigars.logSession', 'Log Session')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'smoked_one'), 'smoked_one')}>
            {actionLabels.smoked_one}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickStateUpdate(getCigarQuickActionPatch(cigar, 'bought_more'), 'bought_more')}>
            {actionLabels.bought_more}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <MoreVertical className="w-4 h-4" />
                {t('cigars.detail.actions', 'Actions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('cigars.detail.quickActions', 'Quick Actions')}</DropdownMenuLabel>
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
            {t('common.edit', 'Edit')}
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
            <img src={photo} alt={cigar.name || t('cigars.detail.cigarAlt', 'Cigar')} className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
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
            {safePrimitive(cigar.name, t('cigars.unnamedCigar', 'Unnamed Cigar'))}
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
          label={t('cigars.detail.sticks', 'Sticks')}
          value={cigar.singles_equivalent ?? cigar.quantity ?? '—'}
          icon={Package}
          placeholder={t('cigars.detail.sticksPlaceholder', '# sticks')}
          onSave={async (val) => {
            await base44.entities.Cigar.update(cigar.id, { singles_equivalent: val, quantity: val, created_by: cigar.created_by || user?.email });
            queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
            toast.success(t('cigars.detail.sticksUpdated', 'Sticks updated'));
          }}
        />
        <EditableStatCard
          label={t('cigars.detail.valueEstimated', 'Value (est.)')}
          value={displayValue}
          icon={DollarSign}
          editable={false}
          onCardClick={() => setValuationModalOpen(true)}
          hint={t('cigars.detail.tapToManage', 'tap to manage')}
        />
        <EditableStatCard
          label={t('cigars.detail.rating', 'Rating')}
          value={cigar.rating ?? '—'}
          icon={Star}
          placeholder={t('cigars.detail.ratingPlaceholder', '1–5')}
          onSave={async (val) => {
            const clamped = val != null ? Math.min(5, Math.max(0, val)) : null;
            await base44.entities.Cigar.update(cigar.id, { rating: clamped, created_by: cigar.created_by || user?.email });
            queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
            toast.success(t('cigars.detail.ratingUpdated', 'Rating updated'));
          }}
        />
        <DetailStat
          label={t('cigars.filterHumidor', 'Humidor')}
          value={humidor?.name || (cigar.humidor_id ? t('common.loading', 'Loading...') : t('cigars.detail.unassigned', 'Unassigned'))}
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
        const rarityLabel = getTranslatedRarityLabel(t, rarity.label);
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
              <span className="text-xs uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(224,216,200,0.55)' }}>{t('cigars.detail.collectibility', 'Collectibility')}</span>
              <div className="flex items-center gap-2">
                {rarity.score != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: confColor }}>
                    {rarity.confidence === 'insufficient'
                      ? t('cigars.detail.insufficientData', 'Insufficient data')
                      : getConfidenceBadgeLabel(t, rarity.confidence)}
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
                  <span className="text-lg font-semibold mb-0.5" style={{ color: labelColor }}>{rarityLabel}</span>
                  <span className="text-xs mb-1 ml-auto" style={{ color: 'rgba(224,216,200,0.4)' }}>{t('cigars.detail.outOf100', 'out of 100')}</span>
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
      <div className="flex flex-wrap gap-2">
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
            <InfoRow label={t('cigars.detail.brand', 'Brand')} value={cigar.brand} />
            <InfoRow label={t('cigars.detail.line', 'Line')} value={cigar.line} />
            <InfoRow label={t('cigars.detail.vitola', 'Vitola')} value={cigar.vitola} />
            <InfoRow label={t('cigars.detail.wrapper', 'Wrapper')} value={cigar.wrapper} />
            <InfoRow label={t('cigars.detail.binder', 'Binder')} value={cigar.binder} />
            <InfoRow label={t('cigars.detail.filler', 'Filler')} value={cigar.filler} />
            <InfoRow label={t('cigars.filterOrigin', 'Origin')} value={cigar.country_of_origin} />
            <InfoRow label={t('cigars.detail.factory', 'Factory')} value={cigar.factory} />
            <InfoRow label={t('cigars.detail.length', 'Length')} value={cigar.length_inches ? `${cigar.length_inches}"` : ''} />
            <InfoRow label={t('cigars.detail.ringGauge', 'Ring Gauge')} value={cigar.ring_gauge} />
            <InfoRow label={t('cigars.filterBody', 'Body')} value={formatCigarStrengthLabel(cigar.body)} />
            <InfoRow label={t('cigars.detail.strength', 'Strength')} value={formatCigarStrengthLabel(cigar.strength)} />
            <InfoRow label={t('cigars.detail.flavorNotes', 'Flavor Notes')} value={Array.isArray(cigar.flavor_notes) ? cigar.flavor_notes.join(', ') : cigar.flavor_notes} />
            <InfoRow label={t('cigars.detail.production', 'Production')} value={cigar.production_status} />
            <InfoRow label={t('cigars.tabWishlist', 'Wishlist')} value={cigar.wishlist ? t('profilePreferences.yes', 'Yes') : t('profilePreferences.no', 'No')} />
            <InfoRow label={t('cigars.detail.shoppingList', 'Shopping List')} value={cigar.shopping_list ? t('profilePreferences.yes', 'Yes') : t('profilePreferences.no', 'No')} />
            <InfoRow label={t('cigars.tabRestock', 'Restock')} value={cigar.restock_flag ? t('profilePreferences.yes', 'Yes') : t('profilePreferences.no', 'No')} />
            <InfoRow label={t('cigars.detail.notForMe', 'Not for Me')} value={cigar.not_for_me ? t('profilePreferences.yes', 'Yes') : t('profilePreferences.no', 'No')} />
            {cigar.personal_notes && (
              <div className="pt-3">
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('cigars.detail.personalNotes', 'Personal Notes')}</p>
                <p className="text-sm" style={{ color: '#E0D8C8' }}>{cigar.personal_notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-0">
            <EditableInfoRow
              label={t('cigars.sortQuantity', 'Quantity')}
              value={cigar.quantity}
              type="number"
              onSave={(v) => saveField('quantity', v)}
            />
            <EditableInfoRow
              label={t('cigars.detail.unitType', 'Unit Type')}
              value={cigar.unit_type}
              options={[
                { value: 'single', label: t('cigars.valuation.typeSingle', 'Single') },
                { value: '5pack', label: t('cigars.detail.type5Pack', '5-pack') },
                { value: 'pack', label: t('cigars.valuation.typePack', 'Pack') },
                { value: 'box', label: t('cigars.valuation.typeBox', 'Box') },
                { value: 'bundle', label: t('cigars.valuation.typeBundle', 'Bundle') },
                { value: 'partial_pack', label: t('cigars.detail.partialPack', 'Partial pack') },
                { value: 'partial_box', label: t('cigars.detail.partialBox', 'Partial box') },
              ]}
              onSave={(v) => saveField('unit_type', v)}
            />
            <EditableInfoRow
              label={['partial_box', 'partial_pack'].includes(cigar.unit_type)
                ? t('cigars.detail.remainingSticks', 'Remaining Sticks')
                : t('cigars.totalSticks', 'Total Sticks')}
              value={cigar.singles_equivalent}
              type="number"
              onSave={(v) => saveField('singles_equivalent', v)}
            />
            <EditableInfoRow
              label={t('cigars.detail.cigarsPerPackage', 'Cigars per Package')}
              value={cigar.cigars_per_package}
              type="number"
              onSave={(v) => saveField('cigars_per_package', v)}
            />
            <EditableInfoRow
              label={t('cigars.detail.packageOpen', 'Package Open')}
              value={cigar.package_open ? 'true' : 'false'}
              options={[
                { value: 'true', label: t('profilePreferences.yes', 'Yes') },
                { value: 'false', label: t('profilePreferences.no', 'No') },
              ]}
              onSave={(v) => saveField('package_open', v === 'true')}
            />
            {inventoryMetrics && (
              <>
                <InfoRow
                  label={t('cigars.detail.lastSmoked', 'Last Smoked')}
                  value={inventoryMetrics.lastSmokedDate ? formatDate(inventoryMetrics.lastSmokedDate) : t('cigars.detail.notYet', 'Not yet')}
                />
                <InfoRow label={t('cigars.detail.timesSmoked', 'Times Smoked')} value={inventoryMetrics.totalSmoked || 0} />
                {inventoryMetrics.consumptionRatePerMonth > 0 && (
                  <InfoRow
                    label={t('cigars.detail.consumptionRate', 'Consumption Rate')}
                    value={t('cigars.detail.perMonthShort', { count: inventoryMetrics.consumptionRatePerMonth.toFixed(1), defaultValue: '~{{count}}/mo' })}
                  />
                )}
                {inventoryMetrics.estimatedMonthsRemaining != null && (
                  <InfoRow
                    label={t('cigars.detail.estimatedMonthsRemaining', 'Est. Months Remaining')}
                    value={
                      inventoryMetrics.estimatedMonthsRemaining === 0
                        ? t('cigars.detail.depleted', 'Depleted')
                        : inventoryMetrics.estimatedMonthsRemaining === 1
                          ? t('cigars.detail.monthRemaining', {
                              count: inventoryMetrics.estimatedMonthsRemaining,
                              defaultValue: '~{{count}} month',
                            })
                          : t('cigars.detail.monthsRemaining', {
                              count: inventoryMetrics.estimatedMonthsRemaining,
                              defaultValue: '~{{count}} months',
                            })
                    }
                  />
                )}
              </>
            )}
            <EditableInfoRow
              label={t('cigars.detail.purchaseSource', 'Purchase Source')}
              value={cigar.purchase_source}
              onSave={(v) => saveField('purchase_source', v)}
            />
            <EditableInfoRow
              label={t('cigars.detail.purchaseDate', 'Purchase Date')}
              value={cigar.purchase_date || ''}
              type="date"
              onSave={(v) => saveField('purchase_date', v)}
            />
            <EditableInfoRow
              label={t('cigars.valuation.purchasePrice', 'Purchase Price')}
              value={cigar.purchase_price}
              type="number"
              onSave={(v) => saveField('purchase_price', v)}
            />
            <InfoRow label={t('cigars.estimatedValue', 'Estimated Value')} value={displayValue} />
            <InfoRow
              label={t('cigars.valuation.valuationConfidence', 'Valuation Confidence')}
              value={valuationSnapshot?.confidence ? getConfidenceLabel(t, valuationSnapshot.confidence) : '—'}
            />
            <InfoRow label={t('cigars.detail.valuationSource', 'Valuation Source')} value={valuationSnapshot?.source || '—'} />
            <div className="py-2" style={{ borderBottom: '1px solid rgba(140,107,63,0.1)' }}>
              <Button size="sm" variant="ghost" onClick={() => setValuationModalOpen(true)}>
                {t('cigars.detail.editValuationInputs', 'Edit valuation inputs')}
              </Button>
            </div>
            <EditableInfoRow
              label={t('cigars.detail.storageNotes', 'Storage Notes')}
              value={cigar.storage_notes}
              onSave={(v) => saveField('storage_notes', v)}
            />
            <div className="flex gap-3 py-2 items-center" style={{ borderBottom: '1px solid rgba(140,107,63,0.1)' }}>
              <span className="text-xs uppercase tracking-wider w-36 shrink-0" style={{ color: 'rgba(224,216,200,0.5)' }}>{t('cigars.filterHumidor', 'Humidor')}</span>
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
                  toast.success(t('cigars.detail.humidorUpdated', 'Humidor updated'));
                }}
                className="flex-1 rounded-lg px-2 py-1.5 text-sm"
                style={{
                  background: 'rgba(20,15,12,0.8)',
                  border: '1px solid rgba(140,107,63,0.35)',
                  color: '#F5F1E7',
                  outline: 'none',
                }}
              >
                <option value="">{t('cigars.detail.unassigned', 'Unassigned')}</option>
                {allHumidors.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <EditableInfoRow label={t('cigars.detail.humidorTray', 'Humidor Tray')} value={cigar.humidor_tray} onSave={(v) => saveField('humidor_tray', v)} />
            <EditableInfoRow label={t('cigars.detail.humidorShelf', 'Humidor Shelf')} value={cigar.humidor_shelf} onSave={(v) => saveField('humidor_shelf', v)} />
            <EditableInfoRow label={t('cigars.detail.humidorDrawer', 'Humidor Drawer')} value={cigar.humidor_drawer} onSave={(v) => saveField('humidor_drawer', v)} />
            <EditableInfoRow label={t('cigars.detail.humidorSection', 'Humidor Section')} value={cigar.humidor_section} onSave={(v) => saveField('humidor_section', v)} />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ color: 'rgba(224,216,200,0.5)' }}>{t('cigars.detail.noSessionsLoggedYet', 'No sessions logged yet')}</p>
                <Button
                  className="mt-4"
                  onClick={() => setSessionModalOpen(true)}
                >
                  {t('cigars.detail.logASession', 'Log a Session')}
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
            <InfoRow label={t('cigars.detail.barcode', 'Barcode')} value={cigar.barcode} />
            <InfoRow label="UPC" value={cigar.upc} />
            <InfoRow label="EAN" value={cigar.ean} />
            <InfoRow label={t('cigars.detail.aliases', 'Aliases')} value={Array.isArray(cigar.aliases) ? cigar.aliases.join(', ') : cigar.aliases} />
            <InfoRow label={t('cigars.detail.releaseType', 'Release Type')} value={cigar.release_type} />
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
            <AlertDialogTitle style={{ color: '#F5F1E7' }}>{t('cigars.detail.deleteCigarTitle', 'Delete Cigar?')}</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'rgba(224,216,200,0.65)' }}>
              {t('cigars.detail.deleteCigarDescription', {
                name: cigar.name,
                defaultValue: 'This will permanently delete {{name}} from your collection. This action cannot be undone.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ background: '#E05555', color: '#fff' }}
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareRecordModal
        isOpen={showShareModal}
        onOpenChange={setShowShareModal}
        moduleType="cigar"
        record={cigar}
        userProfile={{ email: user?.email }}
      />

      <SimilarItemsDrawer
        isOpen={showSimilar}
        onClose={() => setShowSimilar(false)}
        result={similarResult}
        loading={similarLoading}
        error={similarError}
        onRetry={handleFindSimilar}
        recordType="cigar"
        anchorName={cigar?.name}
      />

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
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cigarSessionsById(id, user?.email) });
          queryClient.invalidateQueries({ queryKey: ['cigar-detail', id, user?.email] });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cigars(user?.email) });
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
  const { t } = useTranslation();
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
    } catch { toast.error(t('cigars.detail.failedToSaveCheckpoint', 'Failed to save checkpoint')); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t('cigars.detail.saveValueCheckpoint', 'Save Value Checkpoint')}</h3>
        <div className="space-y-3">
          {[
            { label: t('cigars.detail.snapshotDate', 'Snapshot Date'), field: 'snapshot_date', type: 'date' },
            { label: t('cigars.detail.currentValueTotal', 'Current Value (total)'), field: 'computed_current_value', type: 'number' },
            { label: t('cigars.detail.retailValueTotal', 'Retail Value (total)'), field: 'retail_value', type: 'number' },
            { label: t('cigars.detail.marketValueTotal', 'Market Value (total)'), field: 'market_value', type: 'number' },
            { label: t('cigars.detail.source', 'Source'), field: 'source', type: 'text' },
            { label: t('common.notes', 'Notes'), field: 'notes', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input type={type} value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t('cigars.detail.confidence', 'Confidence')}</label>
            <Select value={form.value_confidence} onValueChange={v => setForm(prev => ({ ...prev, value_confidence: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('cigars.valuation.confidenceHigh', 'High')}</SelectItem>
                <SelectItem value="medium">{t('cigars.valuation.confidenceMedium', 'Medium')}</SelectItem>
                <SelectItem value="low">{t('cigars.valuation.confidenceLow', 'Low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t('common.saving', 'Saving...') : t('cigars.detail.saveCheckpoint', 'Save Checkpoint')}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Market Observation Modal ──────────────────────────────────────────────

function CigarObservationModal({ cigar, userEmail, onClose, onSaved }) {
  const { t } = useTranslation();
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
    } catch { toast.error(t('cigars.detail.failedToSaveObservation', 'Failed to save observation')); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(59,130,246,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">{t('cigars.detail.addMarketObservation', 'Add Market Observation')}</h3>
        <div className="space-y-3">
          {[
            { label: t('cigars.detail.observedDate', 'Observed Date'), field: 'observed_date', type: 'date' },
            { label: t('cigars.detail.priceRequired', 'Price *'), field: 'observed_price', type: 'number' },
            { label: t('cigars.detail.sourceName', 'Source Name'), field: 'source_name', type: 'text' },
            { label: t('cigars.detail.sourceUrl', 'Source URL'), field: 'source_url', type: 'text' },
            { label: t('cigars.detail.conditionNote', 'Condition Note'), field: 'condition_note', type: 'text' },
            { label: t('cigars.detail.region', 'Region'), field: 'region', type: 'text' },
            { label: t('cigars.detail.currency', 'Currency'), field: 'currency', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input type={type} value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]" />
            </div>
          ))}
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">{t('cigars.detail.priceType', 'Price Type')}</label>
            <Select value={form.price_type} onValueChange={v => setForm(prev => ({ ...prev, price_type: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">{t('cigars.detail.priceTypeRetail', 'Retail')}</SelectItem>
                <SelectItem value="aftermarket">{t('cigars.detail.priceTypeAftermarket', 'Aftermarket')}</SelectItem>
                <SelectItem value="auction">{t('cigars.detail.priceTypeAuction', 'Auction')}</SelectItem>
                <SelectItem value="collector">{t('cigars.detail.priceTypeCollector', 'Collector')}</SelectItem>
                <SelectItem value="estimate">{t('cigars.detail.priceTypeEstimate', 'Estimate')}</SelectItem>
                <SelectItem value="private_sale">{t('cigars.detail.priceTypePrivateSale', 'Private Sale')}</SelectItem>
                <SelectItem value="other">{t('cigars.detail.priceTypeOther', 'Other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !form.observed_price}
            style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(37,99,235,0.9))', color: '#F5F1E7' }}>
            {saving ? t('common.saving', 'Saving...') : t('cigars.detail.saveObservation', 'Save Observation')}
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