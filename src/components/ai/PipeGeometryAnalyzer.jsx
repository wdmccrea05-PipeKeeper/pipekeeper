import React, { useState } from "react";
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

  const selectedPipe = pipes.find((p) => p.id === selectedPipeId);

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
      toast.error("This pipe needs photos or dimensions to analyze geometry");
      return;
    }

    setAnalyzing(true);

    try {
      const prompt = `You are analyzing a tobacco pipe to classify its geometry attributes based on photos and dimensions.

**Pipe Information:**
- Name: ${selectedPipe.name || "Unknown"}
- Maker: ${selectedPipe.maker || "Unknown"}
${selectedPipe.length_mm ? `- Overall Length: ${selectedPipe.length_mm}mm` : ""}
${selectedPipe.weight_grams ? `- Weight: ${selectedPipe.weight_grams}g` : ""}
${selectedPipe.bowl_height_mm ? `- Bowl Height: ${selectedPipe.bowl_height_mm}mm` : ""}
${selectedPipe.bowl_width_mm ? `- Bowl Width: ${selectedPipe.bowl_width_mm}mm` : ""}
${selectedPipe.bowl_diameter_mm ? `- Chamber Diameter: ${selectedPipe.bowl_diameter_mm}mm` : ""}
${selectedPipe.bowl_depth_mm ? `- Chamber Depth: ${selectedPipe.bowl_depth_mm}mm` : ""}

**Current Classifications (may be Unknown):**
- Shape: ${selectedPipe.shape || "Unknown"}
- Bowl Style: ${selectedPipe.bowlStyle || "Unknown"}
- Shank Shape: ${selectedPipe.shankShape || "Unknown"}
- Bend: ${selectedPipe.bend || "Unknown"}
- Size Class: ${selectedPipe.sizeClass || "Standard"}

**Task:**
Analyze the pipe photos (if provided) and dimensions to suggest values for these geometry fields. Use visual cues like bowl silhouette, shank profile, stem alignment, and dimensional ratios.

**Strict Enum Values (ONLY use these exact values):**

Shape: Billiard, Bent Billiard, Apple, Bent Apple, Dublin, Bent Dublin, Bulldog, Rhodesian, Canadian, Liverpool, Lovat, Lumberman, Prince, Author, Brandy, Pot, Tomato, Egg, Acorn, Pear, Cutty, Devil Anse, Hawkbill, Diplomat, Poker, Cherrywood, Duke, Don, Tankard, Churchwarden, Nosewarmer, Vest Pocket, MacArthur, Calabash, Reverse Calabash, Cavalier, Freehand, Blowfish, Volcano, Horn, Nautilus, Tomahawk, Bullmoose, Bullcap, Oom Paul (Hungarian), Tyrolean, Unknown, Other

Bowl Style: Cylindrical (Straight Wall), Conical (Tapered), Rounded / Ball, Oval / Egg, Squat / Pot, Chimney (Tall), Paneled, Faceted / Multi-Panel, Horn-Shaped, Freeform, Unknown

Shank Shape: Round, Diamond, Square, Oval, Paneled / Faceted, Military / Army Mount, Freeform, Unknown

Bend: Straight, 1/4 Bent, 1/2 Bent, 3/4 Bent, Full Bent, S-Bend, Unknown

Size Class: Vest Pocket, Small, Standard, Large, Magnum / XL, Churchwarden, MacArthur, Unknown

**Rules:**
- Only return High confidence if you're very certain based on strong visual or dimensional evidence
- Use Medium for probable matches with some uncertainty
- Use Low when insufficient data or ambiguous features
- Default to Unknown when truly unclear
- For fields already set to non-Unknown values, only suggest changes if you have High confidence
- NEVER return values not in the exact enum lists above

Return JSON with suggestions for each field and confidence level (High, Medium, Low).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: selectedPipe.photos || [],
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  current_value: { type: "string" },
                  suggested_value: { type: "string" },
                  confidence: { type: "string" },
                  reasoning: { type: "string" },
                },
                required: ["field", "suggested_value", "confidence"],
              },
            },
            photos_analyzed: { type: "integer" },
            dimensions_used: { type: "boolean" },
          },
        },
      });

      setResults({
        ...result,
        timestamp: new Date().toISOString(),
        pipeId: selectedPipe.id,
        applied: {},
      });
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Failed to analyze pipe geometry");
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

      toast.success(`Updated ${field}`);
      onComplete?.();
    } catch (err) {
      console.error("Apply error:", err);
      toast.error(`Failed to update ${field}`);
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
        toast.info("No high-confidence suggestions to apply");
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

      toast.success(`Applied ${Object.keys(updates).length} updates`);
      onComplete?.();
    } catch (err) {
      console.error("Apply all error:", err);
      toast.error("Failed to apply updates");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Select Pipe to Analyze</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedPipeId} onValueChange={setSelectedPipeId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a pipe..." />
            </SelectTrigger>
            <SelectContent>
              {pipes.map((pipe) => (
                <SelectItem key={pipe.id} value={pipe.id}>
                  {pipe.name} {pipe.maker ? `(${pipe.maker})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPipe && (
            <div className="text-sm text-[#e8d5b7]/70 space-y-1">
              <p>
                Photos: {selectedPipe.photos?.length || 0} | Dimensions:{" "}
                {[
                  selectedPipe.length_mm && "Length",
                  selectedPipe.bowl_height_mm && "Bowl Height",
                  selectedPipe.bowl_diameter_mm && "Chamber Diameter",
                  selectedPipe.weight_grams && "Weight",
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
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
                Analyzing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Analyze Pipe Geometry
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && results.pipeId === selectedPipeId && (
        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#e8d5b7]">Analysis Results</CardTitle>
              <p className="text-xs text-[#e8d5b7]/70 mt-1">
                Analyzed {results.photos_analyzed || 0} photos
                {results.dimensions_used && " and dimensions"}
              </p>
            </div>
            <Button size="sm" onClick={handleApplyAll} variant="outline">
              Apply All High Confidence
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.suggestions?.length === 0 && (
              <div className="text-center py-8">
                <Info className="w-12 h-12 mx-auto mb-3 text-[#e8d5b7]/50" />
                <p className="text-[#e8d5b7]/70">
                  All geometry fields appear correctly set or insufficient data to suggest changes.
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
                      Applied
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApply(suggestion.field, suggestion.suggested_value)}
                    >
                      Apply
                    </Button>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  {suggestion.current_value && (
                    <p className="text-[#e8d5b7]/60">
                      Current: <span className="text-[#e8d5b7]/80">{suggestion.current_value}</span>
                    </p>
                  )}
                  <p className="text-[#e8d5b7]/80">
                    Suggested: <span className="font-medium text-teal-400">{suggestion.suggested_value}</span>
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