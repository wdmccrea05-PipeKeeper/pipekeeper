import React from 'react';
import { HeritageCard } from "@/components/ui/HeritageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import PipeShapeIcon from "./PipeShapeIcon";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatCurrency } from "@/components/utils/localeFormatters";
import LuxuryObjectFrame from "@/components/ui/LuxuryObjectFrame";

export default function PipeCard({ pipe, onClick, onToggleFavorite, onEdit }) {
  const { t } = useTranslation();
  const mainPhoto = pipe.photos?.[0];
  
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
          src={mainPhoto}
          alt={pipe.name}
          aspectRatio="16/9"
          objectFit="contain"
          fallback={
            <div className="text-[#E0D8C8]/30 text-center">
              <PipeShapeIcon shape={pipe.shape} className="w-12 h-12 mx-auto mb-2" style={{ color: "rgba(180,140,75,0.4)" }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(180,140,75,0.5)" }}>
                {pipe.shape || t("pipesExtended.noPhoto")}
              </p>
            </div>
          }
        >
          {/* Absolute positioned overlays */}
        </LuxuryObjectFrame>
        
        {/* Floating overlay controls */}
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
              onToggleFavorite?.(pipe);
            }}
          >
            <Heart className={`w-3.5 h-3.5 ${pipe.is_favorite ? 'fill-rose-400 text-rose-400' : 'text-[#E0D8C8]/60'}`} />
          </Button>
        </div>
        
        {pipe.estimated_value && (
          <div className="absolute bottom-3 left-3 right-3 z-30">
            <Badge 
              className="border-0 backdrop-blur-md font-semibold shadow-lg text-xs truncate max-w-full"
              style={{
                background: "linear-gradient(135deg, rgba(46, 125, 92, 0.9), rgba(40, 110, 80, 0.95))",
                color: "#fff"
              }}
            >
              {formatCurrency(+pipe.estimated_value)}
            </Badge>
          </div>
        )}
        <div className="p-5 min-w-0">
         <h3 
           className="font-semibold truncate text-lg leading-snug mb-1.5" 
           style={{ 
             color: "#F5F1E7",
             fontFamily: "'Georgia', serif",
             textShadow: "0 1px 2px rgba(0,0,0,0.5)"
           }}
         >
           {pipe.name}
         </h3>
         <p className="text-sm truncate" style={{ color: "rgba(180, 140, 75, 0.75)" }}>
           {pipe.maker || t("pipesExtended.unknownMaker")}
         </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {pipe.shape && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-2 py-0.5"
                style={{
                  background: "rgba(180, 140, 75, 0.15)",
                  color: "rgba(180, 140, 75, 0.9)",
                  border: "1px solid rgba(180, 140, 75, 0.25)"
                }}
              >
                {t(`shapes.${pipe.shape}`, pipe.shape)}
              </Badge>
            )}
            {pipe.bowl_material && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-2 py-0.5"
                style={{
                  background: "rgba(100, 80, 60, 0.15)",
                  color: "rgba(200, 180, 160, 0.9)",
                  border: "1px solid rgba(120, 100, 80, 0.25)"
                }}
              >
                {t(`materials.${pipe.bowl_material}`, pipe.bowl_material)}
              </Badge>
            )}
            {pipe.chamber_volume && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-2 py-0.5"
                style={{
                  background: "rgba(180, 140, 75, 0.15)",
                  color: "rgba(180, 140, 75, 0.9)",
                  border: "1px solid rgba(180, 140, 75, 0.25)"
                }}
              >
                {t(`sizes.${pipe.chamber_volume}`, pipe.chamber_volume)}
              </Badge>
            )}
          </div>
          </div>
          </HeritageCard>
    </motion.div>
  );
}