import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  DollarSign,
  Star,
  Sparkles,
  CalendarDays,
  Share2,
  Package,
  Search,
  Trash2,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  Eye,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SimilarItemsDrawer from "@/components/recommendations/SimilarItemsDrawer";
import { runFindSimilar } from "@/components/recommendations/FindSimilarEngine";
import WhiskeyKeeperIcon from "@/components/icons/WhiskeyKeeperIcon";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LogTastingModal from "@/components/whiskey/LogTastingModal";
import InlinePhotoEditor from "@/components/shared/InlinePhotoEditor";
import ShareRecordModal from "@/components/share/ShareRecordModal";
import InventoryManager from "@/components/whiskey/InventoryManager";
import LockedModuleGuard from "@/components/modules/LockedModuleGuard";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import {
  formatCurrency,
  resolveBottleTotalValue,
  resolveBottleUnitValue,
  resolveBottleValueSource,
} from "@/components/whiskey/utils/bottleValue";
import {
  buildValuationSnapshot,
  DIFFICULTY_LABELS,
  TREND_LABELS,
  HOLD_RECOMMENDATION_LABELS,
  resolveValueTrend,
} from "@/components/valuation/valueEngine";

function safePrimitive(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => safePrimitive(entry, ""))
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }
  if (typeof value === "object") {
    return (
      value.label ||
      value.name ||
      value.title ||
      value.value ||
      value.display ||
      fallback
    );
  }
  return fallback;
}

function maybePrimitive(value) {
  return safePrimitive(value, "");
}

function safeValueMeta(valueSource) {
  if (!valueSource) {
    return { label: "Value", confidence: null };
  }

  if (
    typeof valueSource === "string" ||
    typeof valueSource === "number" ||
    typeof valueSource === "boolean"
  ) {
    return {
      label: String(valueSource),
      confidence: null,
    };
  }

  if (typeof valueSource === "object") {
    return {
      label: safePrimitive(valueSource.label || valueSource.name || "Value", "Value"),
      confidence:
        valueSource.confidence === null || valueSource.confidence === undefined
          ? null
          : safePrimitive(valueSource.confidence, ""),
    };
  }

  return { label: "Value", confidence: null };
}

function getBottlePhoto(bottle) {
  return (
    bottle?.photo ||
    bottle?.image ||
    bottle?.image_url ||
    bottle?.photo_url ||
    (Array.isArray(bottle?.photos) ? bottle.photos[0] : null) ||
    null
  );
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US");
}

function DetailStat({ label, value, icon: Icon, helperText = null }) {
  const displayLabel = safePrimitive(label, "Value");
  const displayValue = safePrimitive(value);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(180,140,75,0.16)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(180,140,75,0.12)] border border-[rgba(180,140,75,0.2)]">
          <Icon className="w-4 h-4 text-[#B48C4B]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68 break-words">
            {displayLabel}
          </p>
          <p className="text-lg font-semibold text-[#F5F1E7] mt-1 break-words">
            {displayValue}
          </p>
          {helperText ? (
            <p className="text-xs text-[#D8C7A6]/58 mt-1 break-words">
              {safePrimitive(helperText, "")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TastingRow({ tasting, onEdit }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(180,140,75,0.14)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#F5F1E7]">
            {tasting.rating ? `⭐ ${safePrimitive(tasting.rating)}` : "Unrated tasting"}
          </p>
          <p className="text-xs text-[#D8C7A6]/70 mt-1">
            {formatDate(tasting.tasting_date)} •{" "}
            {safePrimitive(tasting.serving_method, "Neat")}
          </p>
          <p className="text-sm text-[#E0D8C8]/84 mt-3 break-words whitespace-pre-wrap">
            {safePrimitive(tasting.notes, "No notes")}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => onEdit(tasting)}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function AddValueSnapshotModal({ bottle, valuationSnapshot, userEmail, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    snapshot_date: today,
    retail_price: String(bottle?.retail_price || ''),
    aftermarket_price: String(bottle?.aftermarket_price || ''),
    collector_value: String(bottle?.collector_value || ''),
    computed_current_value: String(valuationSnapshot?.currentValue || ''),
    value_confidence: valuationSnapshot?.confidence || 'medium',
    source: valuationSnapshot?.source || '',
    rarity_score: String(valuationSnapshot?.rarityScore || ''),
    replacement_difficulty: valuationSnapshot?.replacementDifficulty || 'moderate',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const toN = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.BottleValueSnapshot.create({
        bottle_id: bottle.id,
        created_by: userEmail,
        snapshot_date: form.snapshot_date,
        retail_price: toN(form.retail_price),
        aftermarket_price: toN(form.aftermarket_price),
        collector_value: toN(form.collector_value),
        computed_current_value: toN(form.computed_current_value),
        value_confidence: form.value_confidence,
        source: form.source || null,
        rarity_score: toN(form.rarity_score),
        replacement_difficulty: form.replacement_difficulty,
        notes: form.notes || null,
      });
      onSaved();
    } catch (e) {
      console.error('[BottleDetail] failed to save snapshot', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(180,140,75,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">Add Value Snapshot</h3>
        <div className="space-y-3">
          {[
            { label: 'Snapshot Date', field: 'snapshot_date', type: 'date' },
            { label: 'Retail Price', field: 'retail_price', type: 'number' },
            { label: 'Aftermarket Price', field: 'aftermarket_price', type: 'number' },
            { label: 'Collector Value', field: 'collector_value', type: 'number' },
            { label: 'Computed Current Value', field: 'computed_current_value', type: 'number' },
            { label: 'Source', field: 'source', type: 'text' },
            { label: 'Rarity Score (0–100)', field: 'rarity_score', type: 'number' },
            { label: 'Notes', field: 'notes', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input
                type={type}
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
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
          <div>
            <label className="text-xs text-[#D8C7A6] block mb-1">Replacement Difficulty</label>
            <Select value={form.replacement_difficulty} onValueChange={v => setForm(prev => ({ ...prev, replacement_difficulty: v }))}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="very_hard">Very Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,rgba(163,92,92,1),rgba(140,74,74,1))', color: '#F5F1E7' }}>
            {saving ? 'Saving…' : 'Save Snapshot'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddPriceObservationModal({ bottle, userEmail, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    observed_date: today,
    observed_price: '',
    price_type: 'retail',
    source_name: '',
    source_url: '',
    condition_note: '',
    fill_level: '',
    region: '',
    currency: 'USD',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.observed_price) return;
    setSaving(true);
    try {
      await base44.entities.PriceObservation.create({
        module_key: 'whiskeykeeper',
        item_id: bottle.id,
        created_by: userEmail,
        observed_price: Number(form.observed_price),
        price_type: form.price_type,
        source_name: form.source_name || null,
        source_url: form.source_url || null,
        observed_date: form.observed_date,
        condition_note: form.condition_note || null,
        fill_level: form.fill_level || null,
        region: form.region || null,
        currency: form.currency || 'USD',
      });
      onSaved();
    } catch (e) {
      console.error('[BottleDetail] failed to save observation', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: 'linear-gradient(135deg,rgba(38,26,18,0.98),rgba(25,17,12,1))', border: '1px solid rgba(59,130,246,0.25)' }}>
        <h3 className="text-lg font-bold text-[#F5F1E7]">Add Market Observation</h3>
        <div className="space-y-3">
          {[
            { label: 'Observed Date', field: 'observed_date', type: 'date' },
            { label: 'Price *', field: 'observed_price', type: 'number' },
            { label: 'Source Name', field: 'source_name', type: 'text' },
            { label: 'Source URL', field: 'source_url', type: 'text' },
            { label: 'Condition Note', field: 'condition_note', type: 'text' },
            { label: 'Fill Level', field: 'fill_level', type: 'text' },
            { label: 'Region', field: 'region', type: 'text' },
            { label: 'Currency', field: 'currency', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="text-xs text-[#D8C7A6] block mb-1">{label}</label>
              <Input
                type={type}
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
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
          <Button onClick={handleSave} disabled={saving || !form.observed_price} style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.8),rgba(37,99,235,0.9))', color: '#F5F1E7' }}>
            {saving ? 'Saving…' : 'Save Observation'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BottleDetailInner() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, isLoading: userLoading } = useCurrentUser();

  const bottleId = params.get("id") || params.get("bottleId");
  const userEmail = user?.email || null;

  const [bottle, setBottle] = useState(null);
  const [tastings, setTastings] = useState([]);
  const [allBottles, setAllBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTasting, setEditingTasting] = useState(null);
  const [showTastingModal, setShowTastingModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarResult, setSimilarResult] = useState(null);
  const [similarError, setSimilarError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showInventoryManager, setShowInventoryManager] = useState(
    params.get("inventory") === "1"
  );
  const [valueSnapshots, setValueSnapshots] = useState([]);
  const [priceObservations, setPriceObservations] = useState([]);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);

  const updateBottle = (updates) => {
    setBottle((prev) => ({ ...prev, ...updates }));
  };

  async function handleDelete() {
    if (!bottle?.id || !userEmail || bottle.created_by !== userEmail) return;

    setDeleting(true);
    try {
      await base44.entities.Bottle.delete(bottle.id);
      navigate("/Whiskey");
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  }

  async function loadBottle() {
    if (!bottleId || !userEmail) {
      setBottle(null);
      return;
    }

    try {
      const rows = await base44.entities.Bottle.filter({
        id: bottleId,
        created_by: userEmail,
      });
      setBottle(rows?.[0] || null);
    } catch (e) {
      console.error("[BottleDetail] failed to load bottle", e);
      setBottle(null);
    }
  }

  async function loadTastings() {
    if (!bottleId || !userEmail) {
      setTastings([]);
      return;
    }

    try {
      const rows = await base44.entities.TastingLog.filter({
        bottle_id: bottleId,
        created_by: userEmail,
      });
      const sorted = [...(rows || [])].sort(
        (a, b) =>
          new Date(b.tasting_date || b.created_at || 0) -
          new Date(a.tasting_date || a.created_at || 0)
      );
      setTastings(sorted);
    } catch (e) {
      console.error("[BottleDetail] failed to load tastings", e);
      setTastings([]);
    }
  }

  async function loadAllBottles() {
    if (!userEmail) {
      setAllBottles([]);
      return;
    }

    try {
      const rows = await base44.entities.Bottle.filter(
        { created_by: userEmail },
        "-created_date",
        500
      );
      setAllBottles(rows || []);
    } catch (e) {
      console.error("[BottleDetail] failed to load bottles", e);
      setAllBottles([]);
    }
  }

  async function loadValueSnapshots() {
    if (!bottleId || !userEmail) {
      setValueSnapshots([]);
      return;
    }
    try {
      const rows = await base44.entities.BottleValueSnapshot.filter({
        bottle_id: bottleId,
        created_by: userEmail,
      }, "-snapshot_date", 20);
      setValueSnapshots(rows || []);
    } catch {
      setValueSnapshots([]);
    }
  }

  async function loadPriceObservations() {
    if (!bottleId || !userEmail) {
      setPriceObservations([]);
      return;
    }
    try {
      const rows = await base44.entities.PriceObservation.filter({
        item_id: bottleId,
        created_by: userEmail,
        module_key: "whiskeykeeper",
      }, "-observed_date", 20);
      setPriceObservations(rows || []);
    } catch {
      setPriceObservations([]);
    }
  }

  async function handleFindSimilar() {
    if (!bottle || !userEmail) return;

    setShowSimilar(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResult(null);

    try {
      const allTastings = await base44.entities.TastingLog
        .filter({ created_by: userEmail }, "-tasting_date", 100)
        .catch(() => []);

      const result = await runFindSimilar({
        recordType: "bottle",
        anchor: bottle,
        context: {
          bottles: allBottles || [],
          tastingLogs: allTastings || [],
        },
        mode: "detail",
      });

      setSimilarResult(result);
    } catch (e) {
      setSimilarError(e?.message || "Failed to find similar pours.");
    } finally {
      setSimilarLoading(false);
    }
  }

  useEffect(() => {
    if (userLoading) return;

    let mounted = true;

    (async () => {
      setLoading(true);
      await Promise.all([loadBottle(), loadTastings(), loadAllBottles(), loadValueSnapshots(), loadPriceObservations()]);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [bottleId, userEmail, userLoading]);

  const photo = useMemo(() => getBottlePhoto(bottle), [bottle]);
  const displayName = useMemo(
    () => safePrimitive(bottle?.name, "Untitled Bottle"),
    [bottle]
  );

  const avgRating = useMemo(() => {
    const rated = tastings.filter(
      (t) => t.rating !== null && t.rating !== undefined && t.rating !== ""
    );
    if (!rated.length) return null;
    const avg =
      rated.reduce((sum, t) => sum + Number(t.rating || 0), 0) / rated.length;
    return avg.toFixed(1);
  }, [tastings]);

  const valueSourceMeta = useMemo(
    () => safeValueMeta(resolveBottleValueSource(bottle)),
    [bottle]
  );
  const unitValue = useMemo(() => resolveBottleUnitValue(bottle), [bottle]);
  const totalValue = useMemo(() => resolveBottleTotalValue(bottle), [bottle]);

  const valuationSnapshot = useMemo(
    () => buildValuationSnapshot(bottle, "whiskeykeeper", { bottles: allBottles, valueHistory: valueSnapshots }),
    [bottle, allBottles, valueSnapshots]
  );

  const valueTrend = useMemo(() => resolveValueTrend(valueSnapshots), [valueSnapshots]);

  const locationLine = [
    maybePrimitive(bottle?.distillery),
    maybePrimitive(bottle?.region),
    maybePrimitive(bottle?.country),
  ].filter(Boolean);

  if (loading || userLoading) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Loading…</p>
      </div>
    );
  }

  if (!bottle) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Unable to load record.</p>
      </div>
    );
  }

  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <div className="p-6 md:p-8 space-y-6 text-[#F5F1E7]">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={handleFindSimilar}
              style={{
                background: "rgba(180,140,75,0.15)",
                border: "1px solid rgba(180,140,75,0.3)",
                color: "#D4A574",
              }}
            >
              <Search className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Find Similar</span>
            </Button>
            <Button variant="outline" onClick={() => setShowShareModal(true)}>
              <Share2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              onClick={() =>
                navigate(`/BottleForm?id=${encodeURIComponent(bottle.id)}`)
              }
              style={{
                background:
                  "linear-gradient(135deg, rgba(201,110,110,1), rgba(168,84,84,1))",
                color: "#fff",
              }}
            >
              <Pencil className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              style={{
                borderColor: "rgba(180,80,80,0.4)",
                color: "rgba(220,120,120,0.9)",
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background:
              "linear-gradient(145deg, rgba(38,26,18,0.98), rgba(25,17,12,1))",
            border: "1px solid rgba(180,140,75,0.18)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
            <div className="p-6 flex flex-col items-center gap-4 border-r border-[rgba(180,140,75,0.12)]">
              {photo ? (
                <img
                  src={photo}
                  alt={displayName}
                  className="max-h-[440px] w-full object-contain"
                  style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.45))" }}
                />
              ) : (
                <div className="w-full h-[280px] rounded-2xl flex items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#D8C7A6]/55 border border-[rgba(180,140,75,0.14)]">
                  No photo
                </div>
              )}

              <InlinePhotoEditor
                photos={bottle.photos?.length ? bottle.photos : []}
                onPhotosChange={(newPhotos) => updateBottle({ photos: newPhotos })}
              />
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-[#F5F1E7] break-words leading-tight">
                  {displayName}
                </h1>

                {locationLine.length > 0 ? (
                  <p className="text-[#D8C7A6]/80 mt-1 text-base">
                    {locationLine.join(" · ")}
                  </p>
                ) : null}

                {bottle.type || bottle.bottle_type ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {bottle.bottle_type ? (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: "rgba(79,120,180,0.2)",
                          border: "1px solid rgba(79,120,180,0.3)",
                          color: "#C5D9FF",
                        }}
                      >
                        {safePrimitive(bottle.bottle_type)}
                      </span>
                    ) : null}

                    {bottle.type ? (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: "rgba(180,140,75,0.18)",
                          border: "1px solid rgba(180,140,75,0.28)",
                          color: "#F5F1E7",
                        }}
                      >
                        {safePrimitive(bottle.type)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {unitValue > 0 ? (
                  <DetailStat
                    label={valueSourceMeta.label || "Value"}
                    value={formatCurrency(unitValue)}
                    icon={DollarSign}
                    helperText={
                      valueSourceMeta.confidence
                        ? `Confidence: ${valueSourceMeta.confidence}`
                        : null
                    }
                  />
                ) : null}
                {avgRating ? (
                  <DetailStat label="Avg Rating" value={`${avgRating} / 5`} icon={Star} />
                ) : null}
                {bottle.age ? (
                  <DetailStat label="Age" value={`${safePrimitive(bottle.age)} years`} icon={CalendarDays} />
                ) : null}
                {bottle.abv ? (
                  <DetailStat label="ABV" value={`${safePrimitive(bottle.abv)}%`} icon={Sparkles} />
                ) : null}
                {bottle.bottle_size ? (
                  <DetailStat label="Bottle Size" value={safePrimitive(bottle.bottle_size)} icon={Package} />
                ) : null}
                {bottle.bottle_count > 1 ? (
                  <DetailStat label="Bottle Count" value={safePrimitive(bottle.bottle_count)} icon={Package} />
                ) : null}
                {bottle.fill_level ? (
                  <DetailStat label="Fill Level" value={safePrimitive(bottle.fill_level)} icon={Package} />
                ) : null}
                {totalValue > 0 && bottle.bottle_count > 1 ? (
                  <DetailStat label="Total Value" value={formatCurrency(totalValue)} icon={WhiskeyKeeperIcon} />
                ) : null}
              </div>

              {bottle.purchase_price ||
              bottle.purchase_date ||
              bottle.purchase_location ||
              bottle.how_acquired ? (
                <div
                  className="rounded-2xl p-4 space-y-2"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(180,140,75,0.14)",
                  }}
                >
                  <p className="text-xs uppercase tracking-wider text-[#D4A574] font-semibold mb-3">
                    Acquisition
                  </p>
                  {bottle.how_acquired ? (
                    <p className="text-sm text-[#E0D8C8]">
                      <span className="text-[#D8C7A6]/60">How acquired: </span>
                      {safePrimitive(bottle.how_acquired)}
                    </p>
                  ) : null}
                  {bottle.purchase_price ? (
                    <p className="text-sm text-[#E0D8C8]">
                      <span className="text-[#D8C7A6]/60">Purchase price: </span>
                      {formatCurrency(bottle.purchase_price)}
                    </p>
                  ) : null}
                  {bottle.purchase_location ? (
                    <p className="text-sm text-[#E0D8C8]">
                      <span className="text-[#D8C7A6]/60">Location: </span>
                      {safePrimitive(bottle.purchase_location)}
                    </p>
                  ) : null}
                  {bottle.purchase_date ? (
                    <p className="text-sm text-[#E0D8C8]">
                      <span className="text-[#D8C7A6]/60">Date: </span>
                      {formatDate(bottle.purchase_date)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {bottle.notes ? (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(180,140,75,0.14)",
                  }}
                >
                  <p className="text-xs uppercase tracking-wider text-[#D4A574] font-semibold mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-[#E0D8C8]/90 whitespace-pre-wrap break-words leading-relaxed">
                    {safePrimitive(bottle.notes)}
                  </p>
                </div>
              ) : null}

              {/* VALUE & STRATEGY SECTION */}
              {valuationSnapshot ? (
                <div
                  className="rounded-2xl p-4 space-y-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(40,28,18,0.7), rgba(28,18,12,0.85))",
                    border: "1px solid rgba(180,140,75,0.22)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#B48C4B]" />
                      <p className="text-xs uppercase tracking-wider text-[#D4A574] font-semibold">
                        Value &amp; Strategy
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSnapshotModal(true)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                        style={{ background: "rgba(180,140,75,0.15)", color: "#D4A574", border: "1px solid rgba(180,140,75,0.25)" }}
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span className="hidden sm:inline">Add Snapshot</span>
                      </button>
                      <button
                        onClick={() => setShowObservationModal(true)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                        style={{ background: "rgba(59,130,246,0.12)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.25)" }}
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden sm:inline">Add Observation</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {valuationSnapshot.currentValue > 0 && (
                      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.14)" }}>
                        <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-1">Current Value</p>
                        <p className="text-lg font-bold text-[#F5F1E7]">{formatCurrency(valuationSnapshot.currentValue)}</p>
                      </div>
                    )}
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.14)" }}>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-1">Source</p>
                      <p className="text-sm font-medium text-[#E0D8C8]">{valuationSnapshot.source}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.14)" }}>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-1">Confidence</p>
                      <p className="text-sm font-medium" style={{ color: valuationSnapshot.confidence === 'high' ? '#4ade80' : valuationSnapshot.confidence === 'medium' ? '#fbbf24' : '#f87171' }}>
                        {capitalize(valuationSnapshot.confidence)}
                      </p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.14)" }}>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-1">Rarity</p>
                      <p className="text-sm font-medium text-[#E0D8C8]">{valuationSnapshot.rarityScore}/100</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.14)" }}>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-1">Replacement</p>
                      <p className="text-sm font-medium text-[#E0D8C8]">{DIFFICULTY_LABELS[valuationSnapshot.replacementDifficulty] || '—'}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.14)" }}>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-1">Trend</p>
                      <p className="text-sm font-medium text-[#E0D8C8]">{TREND_LABELS[valueTrend] || '—'}</p>
                    </div>
                  </div>

                  {/* Open vs Hold */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: valuationSnapshot.holdRecommendation === 'hold'
                        ? "rgba(239,68,68,0.07)"
                        : valuationSnapshot.holdRecommendation === 'open'
                        ? "rgba(16,185,129,0.07)"
                        : "rgba(180,140,75,0.07)",
                      border: valuationSnapshot.holdRecommendation === 'hold'
                        ? "1px solid rgba(239,68,68,0.25)"
                        : valuationSnapshot.holdRecommendation === 'open'
                        ? "1px solid rgba(16,185,129,0.25)"
                        : "1px solid rgba(180,140,75,0.2)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {valuationSnapshot.holdRecommendation === 'hold' ? (
                        <ShieldCheck className="w-4 h-4 text-red-400" />
                      ) : valuationSnapshot.holdRecommendation === 'open' ? (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#D4A574]" />
                      )}
                      <span className="text-sm font-semibold" style={{
                        color: valuationSnapshot.holdRecommendation === 'hold' ? '#fca5a5'
                          : valuationSnapshot.holdRecommendation === 'open' ? '#6ee7b7'
                          : '#D4A574'
                      }}>
                        Recommendation: {HOLD_RECOMMENDATION_LABELS[valuationSnapshot.holdRecommendation] || '—'}
                      </span>
                    </div>
                    {valuationSnapshot.rationale && valuationSnapshot.rationale.length > 0 && (
                      <ul className="space-y-1">
                        {valuationSnapshot.rationale.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(180,140,75,0.6)" }} />
                            <span className="text-xs text-[#E0D8C8]/80">{r}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Value History Preview */}
                  {valueSnapshots.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-2">Value History</p>
                      <div className="space-y-2">
                        {valueSnapshots.slice(0, 3).map((snap, i) => (
                          <div key={snap.id || i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.1)" }}>
                            <span className="text-[#D8C7A6]/70">{snap.snapshot_date || '—'}</span>
                            <span className="font-semibold text-[#F5F1E7]">{snap.computed_current_value > 0 ? formatCurrency(snap.computed_current_value) : '—'}</span>
                            <span className="text-[#D8C7A6]/50">{snap.source || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Observations Preview */}
                  {priceObservations.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#D8C7A6]/60 mb-2">Market Observations</p>
                      <div className="space-y-2">
                        {priceObservations.slice(0, 3).map((obs, i) => (
                          <div key={obs.id || i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.12)" }}>
                            <span className="text-[#D8C7A6]/70">{obs.observed_date || '—'}</span>
                            <span className="font-semibold text-[#F5F1E7]">{obs.observed_price > 0 ? formatCurrency(obs.observed_price) : '—'}</span>
                            <span className="text-[#D8C7A6]/50">{obs.source_name || obs.price_type || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setEditingTasting(null);
                    setShowTastingModal(true);
                  }}
                  style={{
                    background:
                      "linear-gradient(135deg,rgba(196,122,58,1),rgba(160,95,40,1))",
                    color: "#1A120D",
                  }}
                >
                  Log Tasting
                </Button>

                <Button variant="outline" onClick={() => setShowInventoryManager(true)}>
                  <Package className="w-4 h-4 mr-2" />
                  Manage Inventory
                </Button>
              </div>

              {tastings.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm uppercase tracking-wider text-[#D4A574] font-semibold">
                    Tasting Notes ({tastings.length})
                  </h3>
                  {tastings.map((tasting) => (
                    <TastingRow
                      key={tasting.id}
                      tasting={tasting}
                      onEdit={(t) => {
                        setEditingTasting(t);
                        setShowTastingModal(true);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showShareModal ? (
        <ShareRecordModal
          record={bottle}
          recordType="bottle"
          onClose={() => setShowShareModal(false)}
        />
      ) : null}

      {showTastingModal ? (
        <LogTastingModal
          bottle={bottle}
          editingTasting={editingTasting}
          onClose={() => {
            setShowTastingModal(false);
            setEditingTasting(null);
            loadTastings();
          }}
        />
      ) : null}

      {showSimilar ? (
        <SimilarItemsDrawer
          loading={similarLoading}
          result={similarResult}
          error={similarError}
          onClose={() => setShowSimilar(false)}
        />
      ) : null}

      {showDeleteConfirm ? (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete bottle?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {showInventoryManager ? (
        <InventoryManager
          bottle={bottle}
          onClose={() => setShowInventoryManager(false)}
          onUpdate={loadBottle}
        />
      ) : null}

      {showSnapshotModal ? (
        <AddValueSnapshotModal
          bottle={bottle}
          valuationSnapshot={valuationSnapshot}
          userEmail={userEmail}
          onClose={() => setShowSnapshotModal(false)}
          onSaved={() => { setShowSnapshotModal(false); loadValueSnapshots(); }}
        />
      ) : null}

      {showObservationModal ? (
        <AddPriceObservationModal
          bottle={bottle}
          userEmail={userEmail}
          onClose={() => setShowObservationModal(false)}
          onSaved={() => { setShowObservationModal(false); loadPriceObservations(); }}
        />
      ) : null}
    </LockedModuleGuard>
  );
}

export default function BottleDetail() {
  return <BottleDetailInner />;
}