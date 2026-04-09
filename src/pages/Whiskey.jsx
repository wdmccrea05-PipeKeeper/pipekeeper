import React, { useMemo, useState } from "react";
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PlusCircle,
  Search,
  LayoutGrid,
  List,
  Star,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import WhiskeyKeeperModuleNav from "@/components/modules/WhiskeyKeeperModuleNav";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { formatCurrency, resolveBottleUnitValue } from "@/components/whiskey/utils/bottleValue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (typeof value === "object") {
    return value.label || value.name || value.title || value.value || fallback;
  }
  return fallback;
}

function BottleGridCard({ bottle, onOpen }) {
  const photo = getBottlePhoto(bottle);
  const unitValue = resolveBottleUnitValue(bottle);
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl overflow-hidden transition-all hover:translate-y-[-1px]"
      style={{
        background: "linear-gradient(145deg, rgba(39,27,18,0.96), rgba(25,17,11,0.98))",
        border: "1px solid rgba(180,140,75,0.18)",
        boxShadow: "0 10px 26px rgba(0,0,0,0.25)",
      }}
    >
      <div className="aspect-[4/5] bg-[rgba(255,255,255,0.03)] flex items-center justify-center overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={safeText(bottle.name, "Bottle")}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-[#D8C7A6]/45 text-sm">No photo</div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold text-[#F5F1E7] leading-tight break-words">
          {safeText(bottle.name, t('whiskey.untitledBottle'))}
        </h3>

        <p className="text-sm text-[#D8C7A6]/72 break-words">
          {[safeText(bottle.distillery, ""), safeText(bottle.type, "")]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[#E0D8C8]">
            {unitValue > 0 ? formatCurrency(unitValue) : t('common.noValue')}
          </div>
          {bottle.favorite ? (
            <Star className="w-4 h-4 text-[#D4A574]" fill="currentColor" />
          ) : null}
        </div>
      </div>
    </button>
  );
}

function BottleListRow({ bottle, onOpen }) {
  const photo = getBottlePhoto(bottle);
  const unitValue = resolveBottleUnitValue(bottle);
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all hover:translate-y-[-1px]"
      style={{
        background: "linear-gradient(145deg, rgba(39,27,18,0.96), rgba(25,17,11,0.98))",
        border: "1px solid rgba(180,140,75,0.18)",
      }}
    >
      <div className="w-16 h-20 rounded-xl bg-[rgba(255,255,255,0.03)] flex items-center justify-center overflow-hidden shrink-0">
        {photo ? (
          <img
            src={photo}
            alt={safeText(bottle.name, "Bottle")}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-[#D8C7A6]/45 text-xs">No photo</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[#F5F1E7] break-words leading-tight">
              {safeText(bottle.name, t('whiskey.untitledBottle'))}
            </h3>
            <p className="text-sm text-[#D8C7A6]/72 mt-1 break-words">
              {[
                safeText(bottle.distillery, ""),
                safeText(bottle.region, ""),
                safeText(bottle.type, ""),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm text-[#E0D8C8]">
              {unitValue > 0 ? formatCurrency(unitValue) : t('common.noValue')}
            </div>
            {bottle.favorite ? (
              <Star
                className="w-4 h-4 text-[#D4A574] ml-auto mt-2"
                fill="currentColor"
              />
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function WhiskeyInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: userLoading } = useCurrentUser();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState('date');

  const userEmail = user?.email || null;
  const shouldOpenAdd = new URLSearchParams(location.search).get("action") === "add";

  const { data: bottles = [], isLoading: loading } = useQuery({
    queryKey: ['whiskey-collection', userEmail],
    queryFn: async () => {
      const rows = await base44.entities.Bottle.filter({ created_by: userEmail }, '-updated_date', 500).catch(() => []);
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!userEmail && !userLoading,
    staleTime: 30 * 1000,
  });

  // Redirect to add form if action=add
  React.useEffect(() => {
    if (shouldOpenAdd) navigate('/BottleForm', { replace: false });
  }, [shouldOpenAdd]);

  const filteredBottles = useMemo(() => {
    let results = bottles;
    const q = search.trim().toLowerCase();
    
    if (q) {
      results = results.filter((bottle) => {
        const haystack = [
          safeText(bottle.name, ""),
          safeText(bottle.distillery, ""),
          safeText(bottle.region, ""),
          safeText(bottle.type, ""),
          safeText(bottle.country, ""),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return [...results].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'distillery') {
        return (a.distillery || '').localeCompare(b.distillery || '');
      } else if (sortBy === 'value') {
        return (resolveBottleUnitValue(b) || 0) - (resolveBottleUnitValue(a) || 0);
      } else if (sortBy === 'type') {
        return (a.type || '').localeCompare(b.type || '');
      } else {
        return new Date(b.updated_date || 0).getTime() - new Date(a.updated_date || 0).getTime();
      }
    });
  }, [bottles, search, sortBy]);

  function openBottleDetail(bottle) {
    navigate(`/BottleDetail?id=${encodeURIComponent(bottle.id)}`);
  }

  return (
    <div className="space-y-6 p-6 md:p-8 text-[#F5F1E7]">
      <WhiskeyKeeperModuleNav currentPageName="Whiskey" />

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Whiskey Collection
          </h1>
          <p className="text-[#D8C7A6]/76 mt-2">
            {filteredBottles.length} bottle{filteredBottles.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[200px]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(180,140,75,0.16)",
              }}
            >
              <Search className="w-4 h-4 text-[#D8C7A6]/65" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('whiskey.searchPlaceholder')}
                className="bg-transparent outline-none text-sm text-[#F5F1E7] placeholder:text-[#D8C7A6]/45 w-full"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                className="w-40 h-10"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(180,140,75,0.16)",
                  color: "#F5F1E7",
                }}
              >
                <ArrowUpDown className="w-4 h-4 mr-2 text-[#D8C7A6]/65" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "rgba(25,17,11,0.98)", border: "1px solid rgba(180,140,75,0.35)" }}>
                <SelectItem value="date">Newest First</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="distillery">Distillery</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="value">Value</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(180,140,75,0.18)" }}
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className="px-3 py-2 text-sm"
              style={{
                background:
                  viewMode === "grid"
                    ? "rgba(180,140,75,0.18)"
                    : "rgba(255,255,255,0.03)",
                color: "#F5F1E7",
              }}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="px-3 py-2 text-sm"
              style={{
                background:
                  viewMode === "list"
                    ? "rgba(180,140,75,0.18)"
                    : "rgba(255,255,255,0.03)",
                color: "#F5F1E7",
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => navigate("/BottleForm")}
            style={{
              background:
                "linear-gradient(135deg, rgba(196,122,58,1), rgba(160,95,40,1))",
              color: "#1A120D",
            }}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Whiskey
          </Button>
        </div>
      </div>

      {loading || userLoading ? (
        <div className="text-[#D8C7A6]/72">Loading…</div>
      ) : filteredBottles.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "rgba(42,31,24,0.55)",
            border: "1px solid rgba(180,140,75,0.16)",
          }}
        >
          <Sparkles className="w-10 h-10 mx-auto text-[#B48C4B] mb-4" />
          <p className="text-2xl font-semibold">No bottles yet</p>
          <p className="text-[#D8C7A6]/76 mt-2">
            Add your first bottle to start tracking your whiskey collection
          </p>
          <Button className="mt-5" onClick={() => navigate("/BottleForm")}>
            Add Whiskey
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {filteredBottles.map((bottle) => (
            <BottleGridCard
              key={bottle.id}
              bottle={bottle}
              onOpen={() => openBottleDetail(bottle)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBottles.map((bottle) => (
            <BottleListRow
              key={bottle.id}
              bottle={bottle}
              onOpen={() => openBottleDetail(bottle)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// LockedModuleGuard is already applied by App.jsx's WhiskeyReleaseRoute wrapper
export default function Whiskey() {
  return <WhiskeyInner />;
}