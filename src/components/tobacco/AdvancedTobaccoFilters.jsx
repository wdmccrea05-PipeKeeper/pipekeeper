import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

const BLEND_TYPES = ["American", "Aromatic", "Balkan", "Burley", "Burley-based", "Cavendish", "Codger Blend",
  "Dark Fired Kentucky", "English", "English Aromatic", "English Balkan", "Full English/Oriental", "Kentucky",
  "Lakeland", "Latakia Blend", "Navy Flake", "Oriental/Turkish", "Other", "Perique", "Shag", "Virginia",
  "Virginia/Burley", "Virginia/Oriental", "Virginia/Perique"];

const CUTS = ["Broken Flake", "Coin", "Crumble Cake", "Cube Cut", "Flake", "Other", "Plug", "Ready Rubbed",
  "Ribbon", "Rope", "Shag", "Twist"];

const STRENGTHS = ["Full", "Medium", "Medium-Full", "Mild", "Mild-Medium"];
const ROOM_NOTES = ["Neutral", "Pleasant", "Strong", "Very Strong"];
const PRODUCTION_STATUSES = ["Current Production", "Discontinued", "Limited Edition", "Vintage"];
const AGING_POTENTIALS = ["Excellent", "Fair", "Good", "Poor"];

export default function AdvancedTobaccoFilters({ filters, onFilterChange, onReset }) {
  const { t } = useTranslation();
  const activeFilterCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object' && v !== null) return v.min !== undefined || v.max !== undefined;
    if (typeof v === 'boolean') return v;
    return v !== '';
  }).length;

  return (
    <Card className="bg-white/95 border-[#e8d5b7]/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-stone-800 flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            {t("tobacco.advancedFilters")}
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
            <Label>{t("tobacco.blendType")}</Label>
            <Select 
              value={filters.blend_type || "__ALL__"}
              onValueChange={(value) => onFilterChange('blend_type', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tobacco.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("tobacco.allTypes")}</SelectItem>
                {BLEND_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("tobacco.cut")}</Label>
            <Select 
              value={filters.cut || "__ALL__"}
              onValueChange={(value) => onFilterChange('cut', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tobacco.allCuts")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("tobacco.allCuts")}</SelectItem>
                {CUTS.map(cut => (
                  <SelectItem key={cut} value={cut}>{cut}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("tobacco.strength")}</Label>
            <Select 
              value={filters.strength || "__ALL__"}
              onValueChange={(value) => onFilterChange('strength', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tobacco.allStrengths")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("tobacco.allStrengths")}</SelectItem>
                {STRENGTHS.map(strength => (
                  <SelectItem key={strength} value={strength}>{strength}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("tobacco.roomNote")}</Label>
            <Select 
              value={filters.room_note || "__ALL__"}
              onValueChange={(value) => onFilterChange('room_note', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tobacco.allRoomNotes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("tobacco.allRoomNotes")}</SelectItem>
                {ROOM_NOTES.map(note => (
                  <SelectItem key={note} value={note}>{note}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("tobacco.productionStatus")}</Label>
            <Select 
              value={filters.production_status || "__ALL__"}
              onValueChange={(value) => onFilterChange('production_status', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tobacco.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("tobacco.allStatuses")}</SelectItem>
                {PRODUCTION_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("tobacco.agingPotential")}</Label>
            <Select 
              value={filters.aging_potential || "__ALL__"}
              onValueChange={(value) => onFilterChange('aging_potential', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("tobacco.allAgingPotentials")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("tobacco.allAgingPotentials")}</SelectItem>
                {AGING_POTENTIALS.map(potential => (
                  <SelectItem key={potential} value={potential}>{potential}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="has-inventory"
              checked={filters.has_inventory || false}
              onCheckedChange={(checked) => onFilterChange('has_inventory', checked)}
            />
            <Label htmlFor="has-inventory" className="cursor-pointer">
              {t("tobacco.onlyShowWithInventory")}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              id="open-only"
              checked={filters.open_only || false}
              onCheckedChange={(checked) => onFilterChange('open_only', checked)}
            />
            <Label htmlFor="open-only" className="cursor-pointer">
              {t("tobacco.onlyShowOpen")}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              id="cellared-only"
              checked={filters.cellared_only || false}
              onCheckedChange={(checked) => onFilterChange('cellared_only', checked)}
            />
            <Label htmlFor="cellared-only" className="cursor-pointer">
              {t("tobacco.onlyShowCellared")}
            </Label>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-stone-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("tobacco.totalQuantity")}</Label>
              <span className="text-xs text-stone-600">
                {filters.total_quantity?.min || 0}oz - {filters.total_quantity?.max || 100}oz
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[filters.total_quantity?.min || 0, filters.total_quantity?.max || 100]}
              onValueChange={([min, max]) => onFilterChange('total_quantity', { min, max })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("tobacco.rating")}</Label>
              <span className="text-xs text-stone-600">
                {filters.rating?.min || 0} - {filters.rating?.max || 5} stars
              </span>
            </div>
            <Slider
              min={0}
              max={5}
              step={0.5}
              value={[filters.rating?.min || 0, filters.rating?.max || 5]}
              onValueChange={([min, max]) => onFilterChange('rating', { min, max })}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}