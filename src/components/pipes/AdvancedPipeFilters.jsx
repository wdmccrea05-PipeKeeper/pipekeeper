import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

const SHAPES = ["Billiard", "Bent Billiard", "Apple", "Bent Apple", "Dublin", "Bent Dublin", "Bulldog", "Rhodesian", "Canadian", "Liverpool", "Lovat", "Lumberman", "Prince", "Author", "Brandy", "Pot", "Tomato", "Egg", "Acorn", "Pear", "Cutty", "Devil Anse", "Hawkbill", "Diplomat", "Poker", "Cherrywood", "Duke", "Don", "Tankard", "Churchwarden", "Nosewarmer", "Vest Pocket", "MacArthur", "Calabash", "Reverse Calabash", "Cavalier", "Freehand", "Blowfish", "Volcano", "Horn", "Nautilus", "Tomahawk", "Bullmoose", "Bullcap", "Oom Paul (Hungarian)", "Tyrolean", "Unknown", "Other"];
const BENDS = ["Straight", "1/4 Bent", "1/2 Bent", "3/4 Bent", "Full Bent", "S-Bend", "Unknown"];
const SIZE_CLASSES = ["Vest Pocket", "Small", "Standard", "Large", "Magnum / XL", "Churchwarden", "MacArthur", "Unknown"];

const MATERIALS = ["Briar", "Cherry Wood", "Clay", "Corn Cob", "Meerschaum", "Morta", "Olive Wood", "Other"];
const FINISHES = ["Carved", "Natural", "Other", "Partially Rusticated", "Rusticated", "Sandblast", "Smooth"];
const CONDITIONS = ["Estate - Unrestored", "Excellent", "Fair", "Good", "Mint", "Poor", "Very Good"];
const CHAMBER_VOLUMES = ["Extra Large", "Large", "Medium", "Small"];

export default function AdvancedPipeFilters({ filters, onFilterChange, onReset }) {
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
            Advanced Filters
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
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Shape</Label>
            <Select 
              value={filters.shape || "__ALL__"}
              onValueChange={(value) => onFilterChange('shape', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All shapes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Shapes</SelectItem>
                {SHAPES.map(shape => (
                  <SelectItem key={shape} value={shape}>{shape}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bowl Material</Label>
            <Select 
              value={filters.bowl_material || "__ALL__"}
              onValueChange={(value) => onFilterChange('bowl_material', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All materials" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Materials</SelectItem>
                {MATERIALS.map(material => (
                  <SelectItem key={material} value={material}>{material}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Finish</Label>
            <Select 
              value={filters.finish || "__ALL__"}
              onValueChange={(value) => onFilterChange('finish', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All finishes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Finishes</SelectItem>
                {FINISHES.map(finish => (
                  <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condition</Label>
            <Select 
              value={filters.condition || "__ALL__"}
              onValueChange={(value) => onFilterChange('condition', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Conditions</SelectItem>
                {CONDITIONS.map(condition => (
                  <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chamber Volume</Label>
            <Select 
              value={filters.chamber_volume || "__ALL__"}
              onValueChange={(value) => onFilterChange('chamber_volume', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sizes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Sizes</SelectItem>
                {CHAMBER_VOLUMES.map(volume => (
                  <SelectItem key={volume} value={volume}>{volume}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bend</Label>
            <Select 
              value={filters.bend || "__ALL__"}
              onValueChange={(value) => onFilterChange('bend', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All bends" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Bends</SelectItem>
                {BENDS.map(bend => (
                  <SelectItem key={bend} value={bend}>{bend}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Size Class</Label>
            <Select 
              value={filters.sizeClass || "__ALL__"}
              onValueChange={(value) => onFilterChange('sizeClass', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sizes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Sizes</SelectItem>
                {SIZE_CLASSES.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Country of Origin</Label>
            <Select 
              value={filters.country_of_origin || "__ALL__"}
              onValueChange={(value) => onFilterChange('country_of_origin', value === "__ALL__" ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Countries</SelectItem>
                <SelectItem value="Italy">Italy</SelectItem>
                <SelectItem value="Denmark">Denmark</SelectItem>
                <SelectItem value="England">England</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="France">France</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
                <SelectItem value="Ireland">Ireland</SelectItem>
                <SelectItem value="Japan">Japan</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Length (mm)</Label>
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
              <Label>Weight (grams)</Label>
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
              <Label>Estimated Value ($)</Label>
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