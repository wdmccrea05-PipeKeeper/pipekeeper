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

function getBottlePhoto(bottle) {
  return (
    bottle?.photo ||
    bottle?.image ||
    bottle?.image_url ||
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

function DetailStat({ label, value, icon: Icon }) {
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
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">
            {label}
          </p>
          <p className="text-lg font-semibold text-[#F5F1E7] mt-1 break-words">
            {value}
          </p>
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
            {tasting.rating ? `⭐ ${tasting.rating}` : "Unrated tasting"}
          </p>
          <p className="text-xs text-[#D8C7A6]/70 mt-1">
            {formatDate(tasting.tasting_date)} •{" "}
            {tasting.serving_method || "Neat"}
          </p>
          <p className="text-sm text-[#E0D8C8]/84 mt-3 break-words whitespace-pre-wrap">
            {tasting.notes || "No notes"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => onEdit(tasting)}>
          Edit
        </Button>
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
          new Date(b.tasting_date || b.created_at) -
          new Date(a.tasting_date || a.created_at)
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
      await Promise.all([loadBottle(), loadTastings(), loadAllBottles()]);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [bottleId, userEmail, userLoading]);

  const photo = useMemo(() => getBottlePhoto(bottle), [bottle]);

  const avgRating = useMemo(() => {
    const rated = tastings.filter(
      (t) => t.rating !== null && t.rating !== undefined && t.rating !== ""
    );
    if (!rated.length) return null;
    const avg =
      rated.reduce((sum, t) => sum + Number(t.rating || 0), 0) / rated.length;
    return avg.toFixed(1);
  }, [tastings]);

  const valueSource = useMemo(() => resolveBottleValueSource(bottle), [bottle]);
  const unitValue = useMemo(() => resolveBottleUnitValue(bottle), [bottle]);
  const totalValue = useMemo(() => resolveBottleTotalValue(bottle), [bottle]);

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
    <>
      <div className="p-6 md:p-8 space-y-6 text-[#F5F1E7]">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleFindSimilar}
              style={{
                background: "rgba(180,140,75,0.15)",
                border: "1px solid rgba(180,140,75,0.3)",
                color: "#D4A574",
              }}
            >
              <Search className="w-4 h-4 mr-2" />
              Find Similar
            </Button>
            <Button variant="outline" onClick={() => setShowShareModal(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
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
              <Pencil className="w-4 h-4 mr-2" />
              Edit
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
                  alt={bottle.name}
                  className="max-h-[440px] w-full object-contain"
                  style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.45))" }}
                />
              ) : (
                <div className="w-full h-[280px] rounded-2xl flex items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#D8C7A6]/55 border border-[rgba(180,140,75,0.14)]">
                  No photo
                </div>
              )}

              <InlinePhotoEditor
                photos={
                  bottle.photos?.length
                    ? bottle.photos
                    : []
                }