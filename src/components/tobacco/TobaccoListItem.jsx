import React from 'react';
import { PKCard } from "@/components/ui/pk-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, Package } from "lucide-react";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";
import { getAgingRecommendation } from "@/components/utils/agingRecommendation";

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

export default function TobaccoListItem({ blend, onClick, onToggleFavorite }) {
  const colorClass = BLEND_COLORS[blend.blend_type] || "bg-slate-700 text-slate-100 border-slate-600/60";
  const agingRec = getAgingRecommendation(blend);
  
  const agingColorClass = agingRec 
    ? agingRec.color === "green" ? "bg-green-500/20 text-green-700 border-green-500/30"
    : agingRec.color === "yellow" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
    : agingRec.color === "blue" ? "bg-blue-500/20 text-blue-700 border-blue-500/30"
    : "bg-gray-500/20 text-gray-700 border-gray-500/30"
    : "";
  
  return (
    <PKCard 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative w-24 h-24 rounded-lg bg-[#1A2B3A] border border-white/10 overflow-hidden shrink-0">
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
              <div className="w-full h-full flex items-center justify-center p-2 bg-[#1A2B3A]">
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
                <h3 className="font-semibold text-[#E0D8C8] text-lg truncate">{blend.name}</h3>
                <p className="text-sm text-[#E0D8C8]/60">{blend.manufacturer || 'Unknown maker'}</p>
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
                <Badge className={`${agingColorClass} border text-xs font-medium`}>
                  {agingRec.message}
                </Badge>
              )}
              {blend.blend_type && (
                <Badge variant="secondary" className={`${colorClass} text-xs`}>
                  {blend.blend_type}
                </Badge>
              )}
              {blend.strength && (
               <Badge variant="secondary" className="bg-slate-700 text-slate-100 border-slate-600/50 text-xs">
                 {blend.strength}
               </Badge>
              )}
              {blend.cut && (
               <Badge variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600/50 text-xs">
                 {blend.cut}
               </Badge>
              )}
              {(blend.tin_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-amber-600/90 text-white border-0 text-xs font-semibold">
                  Tin: {(+(blend.tin_total_quantity_oz || 0)).toFixed(2)}oz
                </Badge>
              )}
              {(blend.bulk_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-blue-600/90 text-white border-0 text-xs font-semibold">
                  Bulk: {(+(blend.bulk_total_quantity_oz || 0)).toFixed(2)}oz
                </Badge>
              )}
              {(blend.pouch_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-purple-600/90 text-white border-0 text-xs font-semibold">
                  Pouch: {(+(blend.pouch_total_quantity_oz || 0)).toFixed(2)}oz
                </Badge>
              )}
            </div>

            {blend.flavor_notes && blend.flavor_notes.length > 0 && (
              <p className="text-xs text-[#E0D8C8]/60 truncate">
                Flavors: {blend.flavor_notes.slice(0, 5).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </PKCard>
  );
}