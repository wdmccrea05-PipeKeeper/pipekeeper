import React from 'react';
import { PKCard } from "@/components/ui/pk-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
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

export default function TobaccoCard({ blend, onClick, onToggleFavorite }) {
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
      <PKCard 
        className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
        onClick={onClick}
      >
        <div className="relative aspect-[4/3] bg-[#1A2B3A] overflow-hidden">
          {blend.logo || blend.photo ? (
            <img 
              src={blend.logo || blend.photo} 
              alt={blend.name} 
              className={`w-full h-full ${blend.logo ? 'object-contain p-3' : 'object-cover'}`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-white p-3"><img src="' + getTobaccoLogo(blend.manufacturer) + '" class="w-full h-full object-contain" /></div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1A2B3A] p-3">
              <img 
                src={getTobaccoLogo(blend.manufacturer)} 
                alt={blend.manufacturer || 'Tobacco'}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="text-amber-400 text-4xl">🍂</div></div>';
                }}
              />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-[#223447]/90 hover:bg-[#223447] shadow-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.(blend);
              }}
            >
              <Heart className={`w-4 h-4 ${blend.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
            </Button>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
            {(blend.tin_total_quantity_oz || 0) > 0 && (
              <div className="flex gap-1">
                <Badge className="bg-amber-600/90 text-white border-0 backdrop-blur-sm text-xs">
                  Tin: {Number(blend.tin_total_quantity_oz).toFixed(2)}oz
                </Badge>
                {(blend.tin_tins_open || 0) > 0 && (
                  <Badge className="bg-sky-500/90 text-white border-0 backdrop-blur-sm text-xs">
                    {((blend.tin_tins_open || 0) * (blend.tin_size_oz || 0)).toFixed(2)}oz open
                  </Badge>
                )}
                {(blend.tin_tins_cellared || 0) > 0 && (
                  <Badge className="bg-emerald-600/90 text-white border-0 backdrop-blur-sm text-xs">
                    {((blend.tin_tins_cellared || 0) * (blend.tin_size_oz || 0)).toFixed(2)}oz cellared
                  </Badge>
                )}
              </div>
            )}
            {(blend.bulk_total_quantity_oz || 0) > 0 && (
              <div className="flex gap-1">
                <Badge className="bg-blue-600/90 text-white border-0 backdrop-blur-sm text-xs">
                  Bulk: {Number(blend.bulk_total_quantity_oz).toFixed(2)}oz
                </Badge>
                {(blend.bulk_open || 0) > 0 && (
                  <Badge className="bg-sky-500/90 text-white border-0 backdrop-blur-sm text-xs">
                    {Number(blend.bulk_open).toFixed(2)}oz open
                  </Badge>
                )}
                {(blend.bulk_cellared || 0) > 0 && (
                  <Badge className="bg-emerald-600/90 text-white border-0 backdrop-blur-sm text-xs">
                    {Number(blend.bulk_cellared).toFixed(2)}oz cellared
                  </Badge>
                )}
              </div>
            )}
            {(blend.pouch_total_quantity_oz || 0) > 0 && (
              <div className="flex gap-1">
                <Badge className="bg-purple-600/90 text-white border-0 backdrop-blur-sm text-xs">
                  Pouch: {Number(blend.pouch_total_quantity_oz).toFixed(2)}oz
                </Badge>
                {(blend.pouch_pouches_open || 0) > 0 && (
                  <Badge className="bg-sky-500/90 text-white border-0 backdrop-blur-sm text-xs">
                    {((blend.pouch_pouches_open || 0) * (blend.pouch_size_oz || 0)).toFixed(2)}oz open
                  </Badge>
                )}
                {(blend.pouch_pouches_cellared || 0) > 0 && (
                  <Badge className="bg-emerald-600/90 text-white border-0 backdrop-blur-sm text-xs">
                    {((blend.pouch_pouches_cellared || 0) * (blend.pouch_size_oz || 0)).toFixed(2)}oz cellared
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
         <div className="flex items-start justify-between gap-2">
           <div className="flex-1 min-w-0">
             <h3 className="font-semibold text-[#E0D8C8] truncate">{blend.name}</h3>
             <p className="text-sm text-[#E0D8C8]/60 truncate">{blend.manufacturer || 'Unknown maker'}</p>
            </div>
            {blend.rating && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">{blend.rating.toFixed(1)}/5</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
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
          </div>
          </div>
          </PKCard>
    </motion.div>
  );
}