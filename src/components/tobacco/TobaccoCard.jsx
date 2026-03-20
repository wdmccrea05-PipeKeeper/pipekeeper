import React from 'react';
import { HeritageCard } from "@/components/ui/HeritageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";
import { getAgingRecommendation } from "@/components/utils/agingRecommendation";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatWeight } from "@/components/utils/localeFormatters";
import LuxuryObjectFrame from "@/components/ui/LuxuryObjectFrame";

const BLEND_COLORS = {
  "Virginia": "bg-yellow-600 text-yellow-100 border-yellow-500/60",
  "Virginia/Perique": "bg-orange-700 text-orange-100 border-orange-600/60",
  "English": "bg-slate-700 text-slate-100 border-slate-600/60",
  "Balkan": "bg-slate-600 text-slate-100 border-slate-500/60",
  "Aromatic": "bg-purple-700 text-purple-100 border-purple-600/60",
  "Burley": "bg-amber-700 text-amber-100 border-amber-600/60",
  "Virginia/Burley": "bg-yellow-700 text-yellow-100 border-yellow-600/60",
  "Latakia Blend": "bg-slate-800 text-slate-100 border-slate-700/60",
  "Oriental/Turkish": "bg-rose-700 text-rose-100 border-rose-600/60",
  "Navy Flake": "bg-blue-700 text-blue-100 border-blue-600/60",
  "Dark Fired": "bg-slate-600 text-slate-100 border-slate-500/60",
  "Cavendish": "bg-amber-800 text-amber-100 border-amber-700/60",
};

export default function TobaccoCard({ blend, onClick, onToggleFavorite, onEdit }) {
  const { t } = useTranslation();
  const colorClass = BLEND_COLORS[blend.blend_type] || "bg-slate-700 text-slate-100 border-slate-600/60";
  const agingRec = getAgingRecommendation(blend);
  
  const agingColorClass = agingRec 
    ? agingRec.color === "green" ? "bg-green-500/20 text-green-700 border-green-500/30"
    : agingRec.color === "yellow" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
    : agingRec.color === "blue" ? "bg-blue-500/20 text-blue-700 border-blue-500/30"
    : "bg-gray-500/20 text-gray-700 border-gray-500/30"
    : "";
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <HeritageCard 
        className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
        onClick={onClick}
        withTexture={false}
      >
        <LuxuryObjectFrame
          src={blend.logo || blend.photo}
          alt={blend.name}
          aspectRatio="4/3"
          objectFit="contain"
          fallback={
            <div className="text-[#E0D8C8]/20 text-center">
              <Leaf className="w-12 h-12 mx-auto mb-2" style={{ color: "rgba(90,124,90,0.3)" }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(180,140,75,0.4)" }}>
                {blend.manufacturer || t("tobaccoExtended.unknownMaker")}
              </p>
            </div>
          }
        >
          {/* Absolute positioned overlays */}
          {/* Floating controls */}
          <div className="absolute top-3 right-3 z-30">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full shadow-lg"
              style={{
                background: "rgba(20, 14, 10, 0.85)",
                border: "1px solid rgba(120, 90, 65, 0.3)",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.(blend);
              }}
            >
              <Heart className={`w-3.5 h-3.5 ${blend.is_favorite ? 'fill-rose-400 text-rose-400' : 'text-[#E0D8C8]/60'}`} />
            </Button>
          </div>
          
          <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5 z-30">
            {(blend.tin_total_quantity_oz || 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                <Badge 
                  className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(180, 140, 75, 0.85), rgba(160, 120, 65, 0.9))",
                    color: "#1a120a"
                  }}
                >
                  {t("tobaccoExtended.tin")}: {formatWeight(Number(blend.tin_total_quantity_oz) || 0)}
                </Badge>
                {(Number(blend.tin_tins_open) || 0) > 0 && (
                  <Badge 
                    className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                    style={{ background: "rgba(56, 139, 197, 0.85)", color: "#fff" }}
                  >
                    {formatWeight((Number(blend.tin_tins_open) || 0) * (Number(blend.tin_size_oz) || 0))} {t("tobacco.open")}
                  </Badge>
                )}
                {(Number(blend.tin_tins_cellared) || 0) > 0 && (
                  <Badge 
                    className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                    style={{ background: "linear-gradient(135deg, rgba(46, 125, 92, 0.9), rgba(40, 110, 80, 0.95))", color: "#fff" }}
                  >
                    {formatWeight((Number(blend.tin_tins_cellared) || 0) * (Number(blend.tin_size_oz) || 0))} {t("tobaccoExtended.cellared")}
                  </Badge>
                )}
              </div>
            )}
            {(Number(blend.bulk_total_quantity_oz) || 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                <Badge 
                  className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                  style={{ background: "rgba(66, 100, 160, 0.85)", color: "#fff" }}
                >
                  {t("tobaccoExtended.bulk")}: {formatWeight(Number(blend.bulk_total_quantity_oz) || 0)}
                </Badge>
                {(Number(blend.bulk_open) || 0) > 0 && (
                  <Badge 
                    className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                    style={{ background: "rgba(56, 139, 197, 0.85)", color: "#fff" }}
                  >
                    {formatWeight(Number(blend.bulk_open) || 0)} {t("tobacco.open")}
                  </Badge>
                )}
                {(Number(blend.bulk_cellared) || 0) > 0 && (
                  <Badge 
                    className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                    style={{ background: "linear-gradient(135deg, rgba(46, 125, 92, 0.9), rgba(40, 110, 80, 0.95))", color: "#fff" }}
                  >
                    {formatWeight(Number(blend.bulk_cellared) || 0)} {t("tobaccoExtended.cellared")}
                  </Badge>
                )}
              </div>
            )}
            {(Number(blend.pouch_total_quantity_oz) || 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                <Badge 
                  className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                  style={{ background: "rgba(126, 84, 160, 0.85)", color: "#fff" }}
                >
                  {t("tobaccoExtended.pouches")}: {formatWeight(Number(blend.pouch_total_quantity_oz) || 0)}
                </Badge>
                {(Number(blend.pouch_pouches_open) || 0) > 0 && (
                  <Badge 
                    className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                    style={{ background: "rgba(56, 139, 197, 0.85)", color: "#fff" }}
                  >
                    {formatWeight((Number(blend.pouch_pouches_open) || 0) * (Number(blend.pouch_size_oz) || 0))} {t("tobacco.open")}
                  </Badge>
                )}
                {(Number(blend.pouch_pouches_cellared) || 0) > 0 && (
                  <Badge 
                    className="border-0 backdrop-blur-md font-semibold shadow-md text-[10px] px-2 py-0.5"
                    style={{ background: "linear-gradient(135deg, rgba(46, 125, 92, 0.9), rgba(40, 110, 80, 0.95))", color: "#fff" }}
                  >
                    {formatWeight((Number(blend.pouch_pouches_cellared) || 0) * (Number(blend.pouch_size_oz) || 0))} {t("tobaccoExtended.cellared")}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </LuxuryObjectFrame>
        <div className="p-5">
         <div className="flex items-start justify-between gap-2">
           <div className="flex-1 min-w-0">
             <h3 
               className="font-semibold truncate text-lg leading-snug mb-1.5" 
               style={{ 
                 color: "#F5F1E7",
                 fontFamily: "'Georgia', serif",
                 textShadow: "0 1px 2px rgba(0,0,0,0.5)"
               }}
             >
               {blend.name}
             </h3>
             <p className="text-sm truncate" style={{ color: "rgba(180, 140, 75, 0.75)" }}>
               {blend.manufacturer || t("tobaccoExtended.unknownMaker")}
             </p>
            </div>
            {blend.rating && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                  {(Number(blend.rating) || 0).toFixed(1)}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {blend.blend_type && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-2 py-0.5"
                style={{
                  background: "rgba(90, 124, 90, 0.18)",
                  color: "rgba(144, 180, 144, 0.95)",
                  border: "1px solid rgba(90, 124, 90, 0.3)"
                }}
              >
                {t(`blendTypes.${blend.blend_type}`, blend.blend_type)}
              </Badge>
            )}
            {blend.strength && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-2 py-0.5"
                style={{
                  background: "rgba(100, 80, 60, 0.15)",
                  color: "rgba(200, 180, 160, 0.9)",
                  border: "1px solid rgba(120, 100, 80, 0.25)"
                }}
              >
                {t(`strengths.${blend.strength}`, blend.strength)}
              </Badge>
            )}
            {blend.cut && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-2 py-0.5"
                style={{
                  background: "rgba(180, 140, 75, 0.15)",
                  color: "rgba(180, 140, 75, 0.9)",
                  border: "1px solid rgba(180, 140, 75, 0.25)"
                }}
              >
                {t(`cuts.${blend.cut}`, blend.cut)}
              </Badge>
            )}
          </div>
          </div>
          </HeritageCard>
    </motion.div>
  );
}