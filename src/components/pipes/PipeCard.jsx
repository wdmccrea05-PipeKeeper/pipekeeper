import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import PipeShapeIcon from "./PipeShapeIcon";

export default function PipeCard({ pipe, onClick }) {
  const mainPhoto = pipe.photos?.[0];
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer bg-gradient-to-br from-stone-50 to-amber-50/30 border-stone-200/60 hover:shadow-xl hover:shadow-amber-900/10 transition-all duration-300"
        onClick={onClick}
      >
        <div className="relative aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden">
          {mainPhoto ? (
            <img 
              src={mainPhoto} 
              alt={pipe.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-stone-400 text-center">
                <PipeShapeIcon shape={pipe.shape} className="text-5xl mb-2" />
                <p className="text-xs">{pipe.shape || 'No photo'}</p>
              </div>
            </div>
          )}
          {pipe.is_favorite && (
            <div className="absolute top-3 right-3">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500 drop-shadow-md" />
            </div>
          )}
          {pipe.estimated_value && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-emerald-600/90 text-white border-0 backdrop-blur-sm">
                ${pipe.estimated_value}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-stone-800 truncate">{pipe.name}</h3>
          <p className="text-sm text-stone-500 truncate">{pipe.maker || 'Unknown maker'}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
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
        </CardContent>
      </Card>
    </motion.div>
  );
}