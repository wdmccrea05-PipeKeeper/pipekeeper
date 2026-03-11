import React, { useState } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";

const CONFIDENCE_COLORS = {
  High: "success",
  Medium: "warning",
  Low: "secondary",
};

export default function PipeGeometryAnalyzer({ pipes, user, onComplete }) {
  const [selectedPipeId, setSelectedPipeId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const { t } = useTranslation();

  const selectedPipe = pipes.find((p) => String(p.id) === String(selectedPipeId));

  const handleAnalyze = async () => {
    if (!selectedPipe) return;

    const hasPhotos = (selectedPipe.photos?.length || 0) > 0;
    const hasDimensions =
      selectedPipe.length_mm ||
      selectedPipe.bowl_height_mm ||
      selectedPipe.bowl_width_mm ||
      selectedPipe.bowl_diameter_mm ||
      selectedPipe.weight_grams;

    if (!hasPhotos && !hasDimensions) {
      toast.error(t('pipeGeometry.needsPhotoOrDims'));
      return;
    }

    setAnalyzing(true);

    try {
      const prompt = `You are the "Pipe Measurements" classifier for PipeKeeper. Your job is to infer and propose shape, bowlStyle, shankShape, bend, and sizeClass using photos and dimensions. Output must be enum-safe, explainable, and conservative when uncertain.

**Pipe Information:**
- Name: ${selectedPipe.name || "Unknown"}
- Maker: ${selectedPipe.maker || "Unknown"}
${selectedPipe.length_mm ? `- Overall Length: ${selectedPipe.length_mm}mm` : ""}
${selectedPipe.weight_grams ? `- Weight: ${selectedPipe.weight_grams}g` : ""}
${selectedPipe.bowl_height_mm ? `- Bowl Height: ${selectedPipe.bowl_height_mm}mm` : ""}
${selectedPipe.bowl_width_mm ? `- Bowl Width (outer): ${selectedPipe.bowl_width_mm}mm` : ""}
${selectedPipe.bowl_diameter_mm ? `- Chamber Diameter: ${selectedPipe.bowl_diameter_mm}mm` : ""}
${selectedPipe.bowl_depth_mm ? `- Chamber Depth: ${selectedPipe.bowl_depth_mm}mm` : ""}

**Current Values:**
- Shape: ${selectedPipe.shape || "Unknown"}
- Bowl Style: ${selectedPipe.bowlStyle || "Unknown"}
- Shank Shape: ${selectedPipe.shankShape || "Unknown"}
- Bend: ${selectedPipe.bend || "Unknown"}
- Size Class: ${selectedPipe.sizeClass || "Standard"}

**Analysis Method:**

STEP 1 - Extract evidence from photos (if provided):
- profileSilhouette: straight/conical/rounded/squat/tall/irregular
- beadlinesPresent: true/false (bulldog/rhodesian indicator)
- shankCrossSection: round/diamond/square/oval/paneled/unclear
- bendAngle: straight/mild/medium/deep/s-curve/unclear
- stemShankProportion: normal/long-shank/short-stem/unclear
- flatBottom: true/false (poker/tankard indicator)

STEP 2 - Compute dimension ratios (if available):
- heightToOuterDia = bowl_height_mm / bowl_width_mm
- Use overallLength for size classification

STEP 3 - Score each field:

**Bend** (from photos):
- Straight: +3 if bendAngle straight
- 1/4 Bent: +3 if mild
- 1/2 Bent: +3 if medium
- 3/4 Bent: +3 if deep
- Full Bent: +3 if very deep/bowl under shank
- S-Bend: +4 if clear s-curve
- High confidence only if clear side profile

**Shank Shape** (from photos):
- Diamond: +4 if sharp corners visible
- Square: +4 if square clear
- Round: +3 if round
- Oval: +3 if flattened round
- Paneled / Faceted: +4 if facets visible
- High confidence requires clear cross-section view

**Bowl Style** (photos + ratios):
- Cylindrical (Straight Wall): +3 if straight; +2 if heightToOuterDia 1.0-1.4
- Conical (Tapered): +4 if flared; +2 if heightToOuterDia > 1.2
- Rounded / Ball: +4 if ball-like
- Squat / Pot: +4 if squat; +3 if heightToOuterDia < 0.9
- Chimney (Tall): +4 if tall; +3 if heightToOuterDia ≥ 1.6
- Paneled/Faceted: +4 if facets on bowl
- Freeform: +3 if irregular artisan

**Shape** (decision-first, then scoring):
Strong ID rules (apply first):
1. If flatBottom + upright: Poker/Tankard/Cherrywood
2. If beadlinesPresent:
   - Diamond shank = Bulldog (High)
   - Otherwise = Rhodesian (High/Med)
3. If very deep bend + tall = Oom Paul (Hungarian)
4. If calabash bowl visible = Calabash (High)
5. If extremely long stem = Churchwarden (High if clear)
6. If irregular artisan = Freehand (Med/High)

Scoring fallback:
- Billiard: +3 if classic straight walls
- Apple: +3 if rounder bowl
- Dublin: +3 if conical/flared
- Brandy: +3 if brandy flare
- Pot: +3 if squat pot
- Prince: +3 if low squat round
- Canadian/Liverpool/Lovat/Lumberman: +4 if long-shank proportion
  (Canadian: oval shank+short stem; Liverpool: round shank+short stem)
- Cutty/Devil Anse: +3 if forward-leaning old-school
- Hawkbill: +3 if tight sweep + rounded

**Size Class** (dimensions first):
Thresholds from overallLength:
- ≤110mm: Vest Pocket
- 111-135mm: Small
- 136-160mm: Standard
- 161-185mm: Large
- ≥186mm: Magnum / XL
- ≥240mm: Churchwarden
- ≥300mm: MacArthur
Default to Standard if uncertain but typical.

**Confidence Rules:**
- High: Strong evidence, clear photos/dimensions, winner leads by ≥2 points
- Medium: Moderate evidence, okay clarity, close scores
- Low: Unclear, conflicting, or insufficient data
- For fields already non-Unknown: only suggest High confidence changes

**Strict Enum Values:**
Shape: Billiard, Bent Billiard, Apple, Bent Apple, Dublin, Bent Dublin, Bulldog, Rhodesian, Canadian, Liverpool, Lovat, Lumberman, Prince, Author, Brandy, Pot, Tomato, Egg, Acorn, Pear, Cutty, Devil Anse, Hawkbill, Diplomat, Poker, Cherrywood, Duke, Don, Tankard, Churchwarden, Nosewarmer, Vest Pocket, MacArthur, Calabash, Reverse Calabash, Cavalier, Freehand, Blowfish, Volcano, Horn, Nautilus, Tomahawk, Bullmoose, Bullcap, Oom Paul (Hungarian), Tyrolean, Unknown, Other

Bowl Style: Cylindrical (Straight Wall), Conical (Tapered), Rounded / Ball, Oval / Egg, Squat / Pot, Chimney (Tall), Paneled, Faceted / Multi-Panel, Horn-Shaped, Freeform, Unknown

Shank Shape: Round, Diamond, Square, Oval, Paneled / Faceted, Military / Army Mount, Freeform, Unknown

Bend: Straight, 1/4 Bent, 1/2 Bent, 3/4 Bent, Full Bent, S-Bend, Unknown

Size Class: Vest Pocket, Small, Standard, Large, Magnum / XL, Churchwarden, MacArthur, Unknown

**Output Format:**
Provide detailed reasoning bullets for each suggestion explaining:
- What visual/dimensional evidence supports this classification
- Which scoring rules triggered
- Why confidence is High/Medium/Low
- What data is missing if Unknown

NEVER invent values outside the strict enums. Default to Unknown with explanation when uncertain.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: selectedPipe.photos || [],
        response_json_schema: {
          type: "object",
          properties: {
            proposed: {
              type: "object",
              properties: {
                shape: { type: "string" },
                bowlStyle: { type: "string" },
                shankShape: { type: "string" },
                bend: { type: "string" },
                sizeClass: { type: "string" },
              },
            },
            confidence: {
              type: "object",
              properties: {
                shape: { type: "string" },
                bowlStyle: { type: "string" },
                shankShape: { type: "string" },
                bend: { type: "string" },
                sizeClass: { type: "string" },
              },
            },
            reasons: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { type: "string" },
              },
            },
            alternatives: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { type: "string" },
              },
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
            photos_analyzed: { type: "integer" },
            dimensions_used: { type: "boolean" },
          },
        },
      });

      // Convert to suggestions format for UI
      const suggestions = [];
      const fields = ["shape", "bowlStyle", "shankShape", "bend", "sizeClass"];
      
      fields.forEach((field) => {
        const proposedValue = result?.proposed?.[field];
        const confidenceLevel = result?.confidence?.[field];
        const reasonList = result?.reasons?.[field] || [];
        const alternativeList = result?.alternatives?.[field] || [];
        
        if (proposedValue && proposedValue !== "Unknown") {
          suggestions.push({
            field,
            current_value: selectedPipe[field] || "Unknown",
            suggested_value: proposedValue,
            confidence: confidenceLevel || "Low",
            reasoning: reasonList.join(" • "),
            alternatives: alternativeList,
          });
        }
      });

      const finalResult = {
        suggestions,
        photos_analyzed: result?.photos_analyzed || 0,
        dimensions_used: result?.dimensions_used || false,
        warnings: result?.warnings || [],
      };

      setResults({
        ...finalResult,
        timestamp: new Date().toISOString(),
        pipeId: selectedPipe.id,
        applied: {},
      });
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(t('pipeGeometry.analyzeError'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async (field, value) => {
    if (!selectedPipe || !results) return;

    try {
      const updates = { [field]: value };
      await safeUpdate("Pipe", selectedPipe.id, updates, user?.email);

      setResults((prev) => ({
        ...prev,
        applied: { ...prev.applied, [field]: true },
      }));

      toast.success(t('pipeGeometry.updateSuccess', { field }));
      onComplete?.();
    } catch (err) {
      console.error("Apply error:", err);
      toast.error(t('pipeGeometry.updateFailed', { field }));
    }
  };

  const handleApplyAll = async () => {
    if (!selectedPipe || !results) return;

    try {
      const updates = {};
      results.suggestions?.forEach((s) => {
        if (s.confidence === "High" && !results.applied[s.field]) {
          updates[s.field] = s.suggested_value;
        }
      });

      if (Object.keys(updates).length === 0) {
        toast.info(t('pipeGeometry.noHighConfidence'));
        return;
      }

      await safeUpdate("Pipe", selectedPipe.id, updates, user?.email);

      setResults((prev) => {
        const newApplied = { ...prev.applied };
        Object.keys(updates).forEach((field) => {
          newApplied[field] = true;
        });
        return { ...prev, applied: newApplied };
      });

      toast.success(t('pipeGeometry.applySuccess', { count: Object.keys(updates).length }));
      onComplete?.();
    } catch (err) {
      console.error("Apply all error:", err);
      toast.error(t('pipeGeometry.applyFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t('pipeGeometry.selectPipeTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedPipeId} onValueChange={setSelectedPipeId}>
            <SelectTrigger>
              <SelectValue placeholder={t('pipeGeometry.choosePipe')} />
            </SelectTrigger>
            <SelectContent>
              {pipes.map((pipe) => (
                <SelectItem key={pipe.id} value={String(pipe.id)}>
                  {pipe.name} {pipe.maker ? `(${pipe.maker})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPipe && (
            <div className="text-sm text-[#e8d5b7]/70 space-y-1">
              <p>
                {t('pipeGeometry.photosCount', { count: selectedPipe.photos?.length || 0 })} | {t('pipeGeometry.dimensions')}:{" "}
                {[
                  selectedPipe.length_mm && "Length",
                  selectedPipe.bowl_height_mm && "Bowl Height",
                  selectedPipe.bowl_diameter_mm && "Chamber Diameter",
                  selectedPipe.weight_grams && "Weight",
                ]
                  .filter(Boolean)
                  .join(", ") || t('pipeGeometry.noDimensions')}
              </p>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={!selectedPipe || analyzing}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('pipeGeometry.analyzing')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('pipeGeometry.analyzeBtn')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && String(results.pipeId) === String(selectedPipeId) && (
        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#e8d5b7]">{t('pipeGeometry.analysisResults')}</CardTitle>
              <p className="text-xs text-[#e8d5b7]/70 mt-1">
                {t('pipeGeometry.analyzedPhotos', { count: results.photos_analyzed || 0 })}
                {results.dimensions_used && t('pipeGeometry.andDimensions')}
              </p>
            </div>
            <Button size="sm" onClick={handleApplyAll} variant="outline">
              {t('pipeGeometry.applyAllHigh')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.warnings && results.warnings.length > 0 && (
              <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-[#e8d5b7]/80 space-y-1">
                    {results.warnings.map((warning, idx) => (
                      <p key={idx}>• {warning}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {results.suggestions?.length === 0 && (
              <div className="text-center py-8">
                <Info className="w-12 h-12 mx-auto mb-3 text-[#e8d5b7]/50" />
                <p className="text-[#e8d5b7]/70">
                  {results.warnings?.length > 0
                    ? t('pipeGeometry.noSuggestionsWarning')
                    : t('pipeGeometry.noSuggestionsData')}
                </p>
              </div>
            )}

            {results.suggestions?.map((suggestion, idx) => (
              <div
                key={idx}
                className="border border-white/10 rounded-lg p-4 space-y-2 bg-[#1a2c42]/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#e8d5b7] capitalize">
                      {suggestion.field}
                    </span>
                    <Badge variant={CONFIDENCE_COLORS[suggestion.confidence]}>
                      {suggestion.confidence}
                    </Badge>
                  </div>
                  {results.applied[suggestion.field] ? (
                    <Badge variant="success">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t('pipeGeometry.applied')}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApply(suggestion.field, suggestion.suggested_value)}
                    >
                      {t('pipeGeometry.apply')}
                    </Button>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  {suggestion.current_value && (
                    <p className="text-[#e8d5b7]/60">
                      {t('pipeGeometry.current')} <span className="text-[#e8d5b7]/80">{suggestion.current_value}</span>
                    </p>
                  )}
                  <p className="text-[#e8d5b7]/80">
                    {t('pipeGeometry.suggested')} <span className="font-medium text-teal-400">{suggestion.suggested_value}</span>
                  </p>
                  {suggestion.reasoning && (
                    <p className="text-xs text-[#e8d5b7]/60 italic">{suggestion.reasoning}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}