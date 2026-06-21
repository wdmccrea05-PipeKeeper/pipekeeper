import React from 'react';
import { HeritageCard } from "@/components/ui/HeritageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, MapPin, Pencil } from "lucide-react";
import PipeShapeIcon from "./PipeShapeIcon";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrency } from "@/lib/currency/useCurrency";

export default function PipeListItem({ pipe, onClick, onToggleFavorite, onEdit }) {
  const { t } = useTranslation();
  // Subscribe to currency context so the component re-renders when the user changes currency
  const { formatFromBase } = useCurrency();
  const mainPhoto = pipe.photos?.[0];
  
  return (
    <HeritageCard 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={onClick}
      withTexture={false}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="relative w-20 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden shrink-0" style={{
            background: "linear-gradient(135deg, rgba(42, 30, 20, 0.5), rgba(35, 24, 16, 0.7))"
          }}>
            {mainPhoto ? (
              <img 
                src={mainPhoto} 
                alt={pipe.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PipeShapeIcon shape={pipe.shape} className="w-12 h-12 opacity-50" />
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
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#E0D8C8] text-lg break-words">{pipe.name}</h3>
                <p className="text-sm text-[#E0D8C8]/75 break-words">{pipe.maker || t("pipesExtended.unknownMaker")}</p>
              </div>
              {pipe.estimated_value && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-emerald-400">{t("forms.value")}</p>
                  <p className="font-semibold text-emerald-300">{formatFromBase(+pipe.estimated_value)}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {pipe.shape && (
                <Badge variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600/50 text-xs">
                  {t(`shapes.${pipe.shape}`, pipe.shape)}
                </Badge>
              )}
              {pipe.bowl_material && (
                <Badge variant="secondary" className="bg-slate-700 text-slate-100 border-slate-600/50 text-xs">
                  {t(`materials.${pipe.bowl_material}`, pipe.bowl_material)}
                </Badge>
              )}
              {pipe.chamber_volume && (
                <Badge variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600/50 text-xs">
                  {t(`sizes.${pipe.chamber_volume}`, pipe.chamber_volume)}
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
              {typeof onEdit === 'function' && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(pipe); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                  style={{ background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.2)', color: '#D4A574' }}
                >
                  <Pencil className="w-3 h-3" />
                  {t("auto.components_pipes_PipeListItem.edit_yjrxfv")}
                </button>
              )}
            </div>
          </div>
          </div>
          </div>
          </HeritageCard>
  );
}