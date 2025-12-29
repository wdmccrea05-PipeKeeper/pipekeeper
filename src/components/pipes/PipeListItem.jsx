import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Calendar, MapPin, DollarSign } from "lucide-react";
import PipeShapeIcon from "./PipeShapeIcon";

export default function PipeListItem({ pipe, onClick }) {
  const mainPhoto = pipe.photos?.[0];
  
  return (
    <Card 
      className="overflow-hidden cursor-pointer bg-gradient-to-br from-[#f5ead8] to-[#e8d5b7]/30 border-[#e8d5b7]/60 hover:shadow-lg hover:shadow-[#8b3a3a]/10 transition-all duration-300"
      onClick={onClick}
    >
      <CardContent className="p-4 bg-[#f5ead8]/50">
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative w-32 h-20 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden shrink-0">
            {mainPhoto ? (
              <img 
                src={mainPhoto} 
                alt={pipe.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PipeShapeIcon shape={pipe.shape} className="text-3xl text-stone-400" />
              </div>
            )}
            {pipe.is_favorite && (
              <div className="absolute top-2 right-2">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500 drop-shadow-md" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-800 text-lg truncate">{pipe.name}</h3>
                <p className="text-sm text-stone-500">{pipe.maker || 'Unknown maker'}</p>
              </div>
              {pipe.estimated_value && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-emerald-600">Value</p>
                  <p className="font-semibold text-emerald-700">${pipe.estimated_value.toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {pipe.shape && (
                <Badge variant="secondary" className="bg-amber-100/80 text-amber-800 border-amber-200/50 text-xs">
                  {pipe.shape}
                </Badge>
              )}
              {pipe.bowl_material && (
                <Badge variant="secondary" className="bg-stone-100 text-stone-600 border-stone-200/50 text-xs">
                  {pipe.bowl_material}
                </Badge>
              )}
              {pipe.chamber_volume && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200/50 text-xs">
                  {pipe.chamber_volume}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-stone-500">
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
      </CardContent>
    </Card>
  );
}