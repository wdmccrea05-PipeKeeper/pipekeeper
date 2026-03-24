import React from 'react';
import { HeritageCard } from "@/components/ui/HeritageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, Package, Pencil } from "lucide-react";
import { BLEND_TYPE_COLORS } from "@/components/tobacco/tobaccoConstants";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";
import { getAgingRecommendation } from "@/components/utils/agingRecommendation";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatWeight } from "@/components/utils/localeFormatters";



export default function TobaccoListItem({ blend, onClick, onToggleFavorite, onEdit }) {
  const { t } = useTranslation();
  const colorClass = BLEND_TYPE_COLORS[blend.blend_type] || "bg-slate-700 text-slate-100 border-slate-600/60";
  const agingRec = getAgingRecommendation(blend);
  
  const agingColorClass = agingRec 
    ? agingRec.color === "green" ? "bg-green-500/20 text-green-700 border-green-500/30"
    : agingRec.color === "yellow" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
    : agingRec.color === "blue" ? "bg-blue-500/20 text-blue-700 border-blue-500/30"
    : "bg-gray-500/20 text-gray-700 border-gray-500/30"
    : "";
  
  return (
    <HeritageCard 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={onClick}
      withTexture={false}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative w-24 h-24 rounded-lg border overflow-hidden shrink-0" style={{
            background: "linear-gradient(135deg, rgba(42, 30, 20, 0.5), rgba(35, 24, 16, 0.7))",
            borderColor: "rgba(120, 90, 65, 0.2)"
          }}>
            {blend.logo || blend.photo ? (
              <img 
                src={blend.logo || blend.photo} 
                alt={blend.name} 
                className={`w-full h-full ${blend.logo ? 'object-contain p-2' : 'object-cover'}`}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center p-2"><img src="' + getTobaccoLogo(blend.manufacturer) + '" class="w-full h-full object-contain" /></div>';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2" style={{
                background: "linear-gradient(135deg, rgba(42, 30, 20, 0.5), rgba(35, 24, 16, 0.7))"
              }}>
               <img 
                  src={getTobaccoLogo(blend.manufacturer)} 
                  alt={blend.manufacturer || 'Tobacco'}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="text-amber-400 text-3xl">🍂</div></div>';
                  }}
                />
              </div>
            )}
            <div className="absolute top-1 right-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-white/90 hover:bg-white shadow-md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite?.(blend);
                }}
              >
                <Heart className={`w-3.5 h-3.5 ${blend.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#E0D8C8] text-lg break-words line-clamp-2">{blend.name}</h3>
                <p className="text-sm text-[#E0D8C8]/60 break-words">{blend.manufacturer || t("tobaccoExtended.unknownMaker")}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                {blend.rating && (
                  <div className="flex items-center gap-0.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-amber-300">{(+blend.rating).toFixed(1)}/5</span>
                  </div>
                )}
                {blend.quantity_owned > 0 && (
                  <Badge className="bg-amber-600/90 text-white border-0">
                    {(+blend.quantity_owned).toFixed(2)} oz
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {agingRec && (
                <Badge className={`${agingColorClass} border text-xs font-medium hidden sm:inline-flex`}>
                  {t(agingRec.messageKey)}
                </Badge>
              )}
              {blend.blend_type && (
                <Badge variant="secondary" className={`${colorClass} text-xs`}>
                  {t(`blendTypes.${blend.blend_type}`, blend.blend_type)}
                </Badge>
              )}
              {blend.strength && (
               <Badge variant="secondary" className="bg-slate-700 text-slate-100 border-slate-600/50 text-xs">
                 {t(`strengths.${blend.strength}`, blend.strength)}
               </Badge>
              )}
              {blend.cut && (
               <Badge variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600/50 text-xs hidden sm:inline-flex">
                 {t(`cuts.${blend.cut}`, blend.cut)}
               </Badge>
              )}
              {(blend.tin_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-amber-600/90 text-white border-0 text-xs font-semibold">
                  {t("tobaccoExtended.tin")}: {formatWeight(+(blend.tin_total_quantity_oz || 0))}
                </Badge>
              )}
              {(blend.bulk_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-blue-600/90 text-white border-0 text-xs font-semibold">
                  {t("tobaccoExtended.bulk")}: {formatWeight(+(blend.bulk_total_quantity_oz || 0))}
                </Badge>
              )}
              {(blend.pouch_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-purple-600/90 text-white border-0 text-xs font-semibold">
                  {t("tobaccoExtended.pouches")}: {formatWeight(+(blend.pouch_total_quantity_oz || 0))}
                </Badge>
              )}
            </div>

            {blend.flavor_notes && blend.flavor_notes.length > 0 && (
              <p className="text-xs text-[#E0D8C8]/60 truncate">
                {t("tobaccoExtended.flavors")}: {blend.flavor_notes.slice(0, 5).join(', ')}
              </p>
            )}
            {typeof onEdit === 'function' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(blend); }}
                className="mt-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                style={{ background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.2)', color: '#D4A574' }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </HeritageCard>
  );
}