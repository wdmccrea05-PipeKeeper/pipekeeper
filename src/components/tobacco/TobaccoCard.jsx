import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";

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

export default function TobaccoCard({ blend, onClick }) {
  const colorClass = BLEND_COLORS[blend.blend_type] || "bg-stone-100 text-stone-800 border-stone-200";
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer bg-gradient-to-br from-amber-50/50 to-stone-50 border-stone-200/60 hover:shadow-xl hover:shadow-amber-900/10 transition-all duration-300"
        onClick={onClick}
      >
        <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-100 to-amber-200 overflow-hidden">
          {blend.photo ? (
            <img 
              src={blend.photo} 
              alt={blend.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-amber-600 text-center">
                <div className="text-4xl mb-2">🍂</div>
                <p className="text-xs text-amber-700/60">No photo</p>
              </div>
            </div>
          )}
          {blend.is_favorite && (
            <div className="absolute top-3 right-3">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500 drop-shadow-md" />
            </div>
          )}
          {blend.quantity_owned > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-amber-600/90 text-white border-0 backdrop-blur-sm">
                {blend.quantity_owned} tin{blend.quantity_owned > 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-stone-800 truncate">{blend.name}</h3>
              <p className="text-sm text-stone-500 truncate">{blend.manufacturer || 'Unknown maker'}</p>
            </div>
            {blend.rating && (
              <div className="flex items-center gap-0.5 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium">{blend.rating}</span>
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