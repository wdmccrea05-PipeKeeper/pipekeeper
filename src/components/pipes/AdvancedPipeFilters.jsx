import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

const SHAPES = ["Billiard", "Bent Billiard", "Apple", "Bent Apple", "Dublin", "Bent Dublin", "Bulldog", "Rhodesian", "Canadian", "Liverpool", "Lovat", "Lumberman", "Prince", "Author", "Brandy", "Pot", "Tomato", "Egg", "Acorn", "Pear", "Cutty", "Devil Anse", "Hawkbill", "Diplomat", "Poker", "Cherrywood", "Duke", "Don", "Tankard", "Churchwarden", "Nosewarmer", "Vest Pocket", "MacArthur", "Calabash", "Reverse Calabash", "Cavalier", "Freehand", "Blowfish", "Volcano", "Horn", "Nautilus", "Tomahawk", "Bullmoose", "Bullcap", "Oom Paul (Hungarian)", "Tyrolean", "Unknown", "Other"];
const BENDS = ["Straight", "1/4 Bent", "1/2 Bent", "3/4 Bent", "Full Bent", "S-Bend", "Unknown"];
const SIZE_CLASSES = ["Vest Pocket", "Small", "Standard", "Large", "Magnum / XL", "Churchwarden", "MacArthur", "Unknown"];

const MATERIALS = ["Briar", "Cherry Wood", "Clay", "Corn Cob", "Meerschaum", "Morta", "Olive Wood", "Other"];
const FINISHES = ["Carved", "Natural", "Other", "Partially Rusticated", "Rusticated", "Sandblast", "Smooth"];
const CONDITIONS = ["Estate - Unrestored", "Excellent", "Fair", "Good", "Mint", "Poor", "Very Good"];
const CHAMBER_VOLUMES = ["Extra Large", "Large", "Medium", "Small"];

export default function AdvancedPipeFilters({ filters, onFilterChange, onReset }) {
  const { t } = useTranslation();
  const activeFilterCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object' && v !== null) return v.min !== undefined || v.max !== undefined;
    return v !== '';
  }).length;

  return (
    <Card className="bg-white/95 border-[#e8d5b7]/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-stone-800 flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            {t("pipes.advancedFilters")}
            {activeFilterCount > 0 && (
              <Badge className="bg-amber-600 text-white">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onReset}
              className="text-stone-600 hover:text-stone-800"
            >
              <X className="w-4 h-4 mr-1" />
              {t("common.clearAll")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("pipes.shape")}</Label>
            <Select 
              value={filters.shape || "__ALL__"}
              onValueChange={(value) => onFilterChange('shape', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allShapes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allShapes")}</SelectItem>
                {SHAPES.map(shape => (
                  <SelectItem key={shape} value={shape}>{shape}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("pipes.bowlMaterial")}</Label>
            <Select 
              value={filters.bowl_material || "__ALL__"}
              onValueChange={(value) => onFilterChange('bowl_material', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allMaterials")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allMaterials")}</SelectItem>
                {MATERIALS.map(material => (
                  <SelectItem key={material} value={material}>{material}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("pipes.finish")}</Label>
            <Select 
              value={filters.finish || "__ALL__"}
              onValueChange={(value) => onFilterChange('finish', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allFinishes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allFinishes")}</SelectItem>
                {FINISHES.map(finish => (
                  <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("pipes.condition")}</Label>
            <Select 
              value={filters.condition || "__ALL__"}
              onValueChange={(value) => onFilterChange('condition', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allConditions")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allConditions")}</SelectItem>
                {CONDITIONS.map(condition => (
                  <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("pipes.chamberVolume")}</Label>
            <Select 
              value={filters.chamber_volume || "__ALL__"}
              onValueChange={(value) => onFilterChange('chamber_volume', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allSizes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allSizes")}</SelectItem>
                {CHAMBER_VOLUMES.map(volume => (
                  <SelectItem key={volume} value={volume}>{volume}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("pipes.bend")}</Label>
            <Select 
              value={filters.bend || "__ALL__"}
              onValueChange={(value) => onFilterChange('bend', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allBends")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allBends")}</SelectItem>
                {BENDS.map(bend => (
                  <SelectItem key={bend} value={bend}>{bend}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("pipes.sizeClass")}</Label>
            <Select 
              value={filters.sizeClass || "__ALL__"}
              onValueChange={(value) => onFilterChange('sizeClass', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allSizes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allSizes")}</SelectItem>
                {SIZE_CLASSES.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("pipes.countryOfOrigin")}</Label>
            <Select 
              value={filters.country_of_origin || "__ALL__"}
              onValueChange={(value) => onFilterChange('country_of_origin', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pipes.allCountries")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("pipes.allCountries")}</SelectItem>
                <SelectItem value="Italy">{t("countries.italy")}</SelectItem>
                <SelectItem value="Denmark">{t("countries.denmark")}</SelectItem>
                <SelectItem value="England">{t("countries.england")}</SelectItem>
                <SelectItem value="United States">{t("countries.unitedStates")}</SelectItem>
                <SelectItem value="France">{t("countries.france")}</SelectItem>
                <SelectItem value="Germany">{t("countries.germany")}</SelectItem>
                <SelectItem value="Ireland">{t("countries.ireland")}</SelectItem>
                <SelectItem value="Japan">{t("countries.japan")}</SelectItem>
                <SelectItem value="Other">{t("common.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("pipes.length")}</Label>
              <span className="text-xs text-stone-600">
                {filters.length_mm?.min || 0}mm - {filters.length_mm?.max || 250}mm
              </span>
            </div>
            <Slider
              min={0}
              max={250}
              step={5}
              value={[filters.length_mm?.min || 0, filters.length_mm?.max || 250]}
              onValueChange={([min, max]) => onFilterChange('length_mm', { min, max })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("pipes.weight")}</Label>
              <span className="text-xs text-stone-600">
                {filters.weight_grams?.min || 0}g - {filters.weight_grams?.max || 150}g
              </span>
            </div>
            <Slider
              min={0}
              max={150}
              step={5}
              value={[filters.weight_grams?.min || 0, filters.weight_grams?.max || 150]}
              onValueChange={([min, max]) => onFilterChange('weight_grams', { min, max })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("pipes.estimatedValue")}</Label>
              <span className="text-xs text-stone-600">
                ${filters.estimated_value?.min || 0} - ${filters.estimated_value?.max || 1000}
              </span>
            </div>
            <Slider
              min={0}
              max={1000}
              step={50}
              value={[filters.estimated_value?.min || 0, filters.estimated_value?.max || 1000]}
              onValueChange={([min, max]) => onFilterChange('estimated_value', { min, max })}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}