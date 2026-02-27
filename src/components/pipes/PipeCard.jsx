import React from 'react';
import { PKCard } from "@/components/ui/pk-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import PipeShapeIcon from "./PipeShapeIcon";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatCurrency } from "@/components/utils/localeFormatters";

export default function PipeCard({ pipe, onClick, onToggleFavorite }) {
  const { t } = useTranslation();
  const mainPhoto = pipe.photos?.[0];
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <PKCard 
        className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
        onClick={onClick}
      >
        <div className="relative aspect-[16/9] bg-gradient-to-br from-[#1A2B3A] to-[#243548] overflow-hidden">
          {mainPhoto ? (
            <img 
              src={mainPhoto} 
              alt={pipe.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
            <div className="text-[#E0D8C8]/50 text-center">
                <PipeShapeIcon shape={pipe.shape} className="text-5xl mb-2" />
                <p className="text-xs">{pipe.shape || t("pipesExtended.noPhoto")}</p>
              </div>
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
                onToggleFavorite?.(pipe);
              }}
            >
              <Heart className={`w-4 h-4 ${pipe.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
            </Button>
          </div>
          {pipe.estimated_value && (
            <div className="absolute bottom-3 left-3 max-w-[calc(100%-24px)]">
              <Badge className="bg-emerald-600/90 text-white border-0 backdrop-blur-sm font-semibold shadow-sm text-sm truncate max-w-full">
                {formatCurrency(+pipe.estimated_value)}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-4 min-w-0">
         <h3 className="font-semibold text-[#E0D8C8] truncate text-base">{pipe.name}</h3>
         <p className="text-sm text-[#E0D8C8]/70 truncate">{pipe.maker || t("pipesExtended.unknownMaker")}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {pipe.shape && (
              <Badge variant="secondary" className="bg-amber-700/40 text-amber-100 border-amber-600/50 text-xs">
                {t(`shapes.${pipe.shape}`, pipe.shape)}
              </Badge>
            )}
            {pipe.bowl_material && (
              <Badge variant="secondary" className="bg-slate-700/40 text-slate-100 border-slate-600/50 text-xs">
                {t(`materials.${pipe.bowl_material}`, pipe.bowl_material)}
              </Badge>
            )}
            {pipe.chamber_volume && (
              <Badge variant="secondary" className="bg-amber-700/40 text-amber-100 border-amber-600/50 text-xs">
                {t(`sizes.${pipe.chamber_volume}`, pipe.chamber_volume)}
              </Badge>
            )}
          </div>
          </div>
          </PKCard>
    </motion.div>
  );
}