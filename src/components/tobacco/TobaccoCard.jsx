import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";

const BLEND_COLORS = {
  "Virginia": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Virginia/Perique": "bg-orange-100 text-orange-800 border-orange-200",
  "English": "bg-stone-700 text-white border-stone-600",
  "Balkan": "bg-stone-600 text-white border-stone-500",
  "Aromatic": "bg-purple-100 text-purple-800 border-purple-200",
  "Burley": "bg-amber-100 text-amber-800 border-amber-200",
  "Virginia/Burley": "bg-yellow-200 text-yellow-900 border-yellow-300",
  "Latakia Blend": "bg-stone-800 text-white border-stone-700",
  "Oriental/Turkish": "bg-rose-100 text-rose-800 border-rose-200",
  "Navy Flake": "bg-blue-100 text-blue-800 border-blue-200",
  "Dark Fired": "bg-stone-500 text-white border-stone-400",
  "Cavendish": "bg-amber-200 text-amber-900 border-amber-300",
};

export default function TobaccoCard({ blend, onClick, onToggleFavorite }) {
  const colorClass = BLEND_COLORS[blend.blend_type] || "bg-stone-100 text-stone-800 border-stone-200";
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer bg-gradient-to-br from-[#f5ead8] to-[#e8d5b7]/30 border-[#e8d5b7]/60 hover:shadow-xl hover:shadow-[#8b3a3a]/10 transition-all duration-300"
        onClick={onClick}
      >
        <div className="relative aspect-[4/3] bg-white overflow-hidden">
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
            <div className="w-full h-full flex items-center justify-center bg-white p-3">
              <img 
                src={getTobaccoLogo(blend.manufacturer)} 
                alt={blend.manufacturer || 'Tobacco'}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="text-amber-600 text-4xl">🍂</div></div>';
                }}
              />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
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
        <CardContent className="p-4 bg-[#f5ead8]/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-stone-800 truncate">{blend.name}</h3>
              <p className="text-sm text-stone-500 truncate">{blend.manufacturer || 'Unknown maker'}</p>
            </div>
            {blend.rating && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="text-sm font-medium text-blue-900">{blend.rating.toFixed(1)}/5</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {blend.blend_type && (
              <Badge variant="secondary" className={`${colorClass} text-xs`}>
                {blend.blend_type}
              </Badge>
            )}
            {blend.strength && (
              <Badge variant="secondary" className="bg-stone-100 text-stone-600 border-stone-200/50 text-xs">
                {blend.strength}
              </Badge>
            )}
            {blend.cut && (
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200/50 text-xs">
                {blend.cut}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}