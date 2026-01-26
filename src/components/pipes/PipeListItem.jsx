import React from 'react';
import { PKCard } from "@/components/ui/pk-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, MapPin, DollarSign } from "lucide-react";
import PipeShapeIcon from "./PipeShapeIcon";

export default function PipeListItem({ pipe, onClick, onToggleFavorite }) {
  const mainPhoto = pipe.photos?.[0];
  
  return (
    <PKCard 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative w-32 h-20 rounded-lg bg-[#1A2B3A] overflow-hidden shrink-0">
            {mainPhoto ? (
              <img 
                src={mainPhoto} 
                alt={pipe.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PipeShapeIcon shape={pipe.shape} className="text-3xl text-[#E0D8C8]/50" />
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
                  onToggleFavorite?.(pipe);
                }}
              >
                <Heart className={`w-3.5 h-3.5 ${pipe.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-[#E0D8C8]/50'}`} />
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#E0D8C8] text-lg truncate">{pipe.name}</h3>
                <p className="text-sm text-[#E0D8C8]/60">{pipe.maker || 'Unknown maker'}</p>
              </div>
              {pipe.estimated_value && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-emerald-400">Value</p>
                  <p className="font-semibold text-emerald-300">${(+pipe.estimated_value).toFixed(2)}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {pipe.shape && (
                <Badge variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600/50 text-xs">
                  {pipe.shape}
                </Badge>
              )}
              {pipe.bowl_material && (
                <Badge variant="secondary" className="bg-slate-700 text-slate-100 border-slate-600/50 text-xs">
                  {pipe.bowl_material}
                </Badge>
              )}
              {pipe.chamber_volume && (
                <Badge variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600/50 text-xs">
                  {pipe.chamber_volume}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-[#E0D8C8]/60">
              {pipe.country_of_origin && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {pipe.country_of_origin}
                </div>
              )}
              {pipe.year_made && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {pipe.year_made}
                </div>
              )}
            </div>
          </div>
          </div>
          </div>
          </PKCard>
  );
}