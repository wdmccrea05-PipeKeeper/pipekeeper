import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Ruler } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PipeMeasurementCalculator({ pipe, onUpdate }) {
  const [calculating, setCalculating] = useState(false);

  const hasMeasurements = pipe.length_mm || pipe.weight_grams || pipe.bowl_diameter_mm || pipe.bowl_depth_mm;
  
  const handleCalculate = async () => {
    setCalculating(true);
    
    try {
      const prompt = `You are analyzing a pipe to calculate missing measurements.

Pipe Information:
- Maker: ${pipe.maker || 'Unknown'}
- Name: ${pipe.name || 'Unknown'}
- Shape: ${pipe.shape || 'Unknown'}
- Existing measurements:
  ${pipe.length_mm ? `Length: ${pipe.length_mm}mm` : ''}
  ${pipe.weight_grams ? `Weight: ${pipe.weight_grams}g` : ''}
  ${pipe.bowl_height_mm ? `Bowl Height: ${pipe.bowl_height_mm}mm` : ''}
  ${pipe.bowl_width_mm ? `Bowl Width: ${pipe.bowl_width_mm}mm` : ''}
  ${pipe.bowl_diameter_mm ? `Chamber Diameter: ${pipe.bowl_diameter_mm}mm` : ''}
  ${pipe.bowl_depth_mm ? `Chamber Depth: ${pipe.bowl_depth_mm}mm` : ''}
  ${pipe.chamber_volume ? `Chamber Volume: ${pipe.chamber_volume}` : ''}

CRITICAL RULES:
1. ONLY provide measurements if you find VERIFIED manufacturer or retailer specifications
2. Search for exact specifications from official sources (manufacturer catalogs, authorized retailers)
3. DO NOT estimate, guess, or calculate based on similar pipes
4. If no verified data exists, return null for that measurement
5. Only include measurements that are explicitly missing from the existing data

Return JSON with ONLY the missing measurements you found verified data for. Include dimensions_found=true and dimensions_source if you found any verified measurements.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            length_mm: { type: ["number", "null"] },
            weight_grams: { type: ["number", "null"] },
            bowl_height_mm: { type: ["number", "null"] },
            bowl_width_mm: { type: ["number", "null"] },
            bowl_diameter_mm: { type: ["number", "null"] },
            bowl_depth_mm: { type: ["number", "null"] },
            chamber_volume: { type: ["string", "null"], enum: ["Small", "Medium", "Large", "Extra Large", null] },
            dimensions_found: { type: "boolean" },
            dimensions_source: { type: ["string", "null"] },
            notes: { type: ["string", "null"] }
          }
        }
      });

      // Filter out null values and existing measurements
      const updates = {};
      let foundAny = false;
      
      Object.keys(result).forEach(key => {
        if (result[key] !== null && result[key] !== undefined && !pipe[key]) {
          updates[key] = result[key];
          if (key !== 'dimensions_found' && key !== 'dimensions_source' && key !== 'notes') {
            foundAny = true;
          }
        }
      });

      // Calculate chamber volume if we have the necessary dimensions
      const finalBowlDiameter = updates.bowl_diameter_mm || pipe.bowl_diameter_mm;
      const finalBowlDepth = updates.bowl_depth_mm || pipe.bowl_depth_mm;
      
      if (finalBowlDiameter && finalBowlDepth && !updates.chamber_volume && !pipe.chamber_volume) {
        const radius = finalBowlDiameter / 2;
        const volumeCm3 = Math.PI * Math.pow(radius / 10, 2) * (finalBowlDepth / 10);
        
        if (volumeCm3 < 1.5) {
          updates.chamber_volume = "Small";
        } else if (volumeCm3 < 2.5) {
          updates.chamber_volume = "Medium";
        } else if (volumeCm3 < 3.5) {
          updates.chamber_volume = "Large";
        } else {
          updates.chamber_volume = "Extra Large";
        }
      }

      if (foundAny) {
        await onUpdate(updates);
        toast.success(`Found ${Object.keys(updates).filter(k => k !== 'dimensions_found' && k !== 'dimensions_source' && k !== 'notes').length} verified measurements`);
      } else {
        toast.info('No verified measurements found for this pipe');
      }
    } catch (error) {
      console.error('Measurement calculation error:', error);
      toast.error('Failed to calculate measurements');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Ruler className="w-5 h-5 text-stone-400 mt-1" />
        <div className="flex-1">
          <h3 className="font-medium text-stone-800 mb-1">Calculate Missing Measurements</h3>
          <p className="text-sm text-stone-600 mb-3">
            AI will search for verified manufacturer specifications to fill in missing dimensions.
            {hasMeasurements && " Only missing measurements will be added."}
          </p>
          <Button 
            size="sm"
            onClick={handleCalculate}
            disabled={calculating}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Ruler className="w-4 h-4 mr-2" />
                Find Measurements
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}