import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, Package } from "lucide-react";
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

export default function TobaccoListItem({ blend, onClick, onToggleFavorite }) {
  const colorClass = BLEND_COLORS[blend.blend_type] || "bg-stone-100 text-stone-800 border-stone-200";
  
  return (
    <Card 
      className="overflow-hidden cursor-pointer bg-gradient-to-br from-[#f5ead8] to-[#e8d5b7]/30 border-[#e8d5b7]/60 hover:shadow-lg hover:shadow-[#8b3a3a]/10 transition-all duration-300"
      onClick={onClick}
    >
      <CardContent className="p-4 bg-[#f5ead8]/50">
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative w-24 h-24 rounded-lg bg-white border border-amber-200 overflow-hidden shrink-0">
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
              <div className="w-full h-full flex items-center justify-center p-2">
                <img 
                  src={getTobaccoLogo(blend.manufacturer)} 
                  alt={blend.manufacturer || 'Tobacco'}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="text-amber-600 text-3xl">🍂</div></div>';
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
                <h3 className="font-semibold text-stone-800 text-lg truncate">{blend.name}</h3>
                <p className="text-sm text-stone-500">{blend.manufacturer || 'Unknown maker'}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                {blend.rating && (
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{blend.rating.toFixed(1)}/5</span>
                  </div>
                )}
                {blend.quantity_owned > 0 && (
                  <Badge className="bg-amber-600/90 text-white border-0">
                    {Number(blend.quantity_owned).toFixed(2)} oz
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
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
              {(blend.tin_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-amber-600/90 text-white border-0 text-xs">
                  Tin: {Number(blend.tin_total_quantity_oz).toFixed(2)}oz
                </Badge>
              )}
              {(blend.bulk_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-blue-600/90 text-white border-0 text-xs">
                  Bulk: {Number(blend.bulk_total_quantity_oz).toFixed(2)}oz
                </Badge>
              )}
              {(blend.pouch_total_quantity_oz || 0) > 0 && (
                <Badge className="bg-purple-600/90 text-white border-0 text-xs">
                  Pouch: {Number(blend.pouch_total_quantity_oz).toFixed(2)}oz
                </Badge>
              )}
            </div>

            {blend.flavor_notes && blend.flavor_notes.length > 0 && (
              <p className="text-xs text-stone-500 truncate">
                Flavors: {blend.flavor_notes.slice(0, 5).join(', ')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}