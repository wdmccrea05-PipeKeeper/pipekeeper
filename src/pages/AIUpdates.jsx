import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Tags, CheckCircle2, Ruler } from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { isAppleBuild } from "@/components/utils/appVariant";
import FeatureGate from "@/components/subscription/FeatureGate";
import PipeGeometryAnalyzer from "@/components/ai/PipeGeometryAnalyzer";

// Helper functions for field state detection
const isBlank = (v) => v === null || v === undefined || v === "";
const isUnknown = (v) => typeof v === "string" && v.trim().toLowerCase() === "unknown";
const isMissingMeasurement = (v) => isBlank(v);
const isMissingGeometry = (v) => isBlank(v) || isUnknown(v);

export default function AIUpdates() {
  const queryClient = useQueryClient();
  const [reclassifyBusy, setReclassifyBusy] = useState(false);
  const [showPipeAnalyzer, setShowPipeAnalyzer] = useState(false);
  const [measurementLookupState, setMeasurementLookupState] = useState({
    status: "idle", // idle | running | completed | none_found | error
    selectedPipeId: null,
    results: null,
    message: "",
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () =>
      (await base44.entities.TobaccoBlend.filter({ created_by: user?.email }, "-updated_date", 500)) || [],
    enabled: !!user?.email,
  });

  const { data: pipes = [] } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () =>
      (await base44.entities.Pipe.filter({ created_by: user?.email }, "-updated_date", 500)) || [],
    enabled: !!user?.email,
  });

  const reclassifyBlends = useMutation({
    mutationFn: async () => {
      if (!user?.email) return;

      setReclassifyBusy(true);

      const blendsToUpdate = (blends || []).filter(Boolean);
      if (blendsToUpdate.length === 0) {
        toast.info("No items to categorize");
        setReclassifyBusy(false);
        return;
      }

      const categories = [
        "American",
        "Aromatic",
        "Balkan",
        "Burley",
        "Burley-based",
        "Cavendish",
        "Codger Blend",
        "Dark Fired Kentucky",
        "English",
        "English Aromatic",
        "English Balkan",
        "Full English/Oriental",
        "Kentucky",
        "Lakeland",
        "Latakia Blend",
        "Navy Flake",
        "Oriental/Turkish",
        "Other",
        "Perique",
        "Shag",
        "Virginia",
        "Virginia/Burley",
        "Virginia/Oriental",
        "Virginia/Perique",
      ];

      const prompt = `You are standardizing inventory metadata in a personal collection manager.

Task: Assign the single best category from this list:
${categories.join(", ")}

IMPORTANT:
- Do NOT provide recommendations, pairings, usage advice, or guidance encouraging consumption.
- Return updates ONLY for items that should change categories.

Items:
${blendsToUpdate.map((b) => `- ${b.name} (current: ${b.blend_type || "Unknown"})`).join("\n")}

Return JSON: { "updates": [ { "name": "...", "new_type": "..." } ] }`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            updates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  new_type: { type: "string" },
                },
                required: ["name", "new_type"],
              },
            },
          },
        },
      });

      const updates = Array.isArray(result?.updates) ? result.updates : [];
      if (updates.length === 0) {
        toast.info("All items appear correctly categorized");
        setReclassifyBusy(false);
        return;
      }

      let changed = 0;
      for (const upd of updates) {
        const blend = blendsToUpdate.find((b) => String(b.name).trim() === String(upd.name).trim());
        if (!blend) continue;

        const next = upd.new_type;
        if (!next || String(next).trim() === "" || String(next) === String(blend.blend_type || "")) continue;

        await safeUpdate("TobaccoBlend", blend.id, { blend_type: next }, user?.email);
        changed++;
      }

      queryClient.invalidateQueries({ queryKey: ["blends", user?.email] });
      toast.success(changed > 0 ? `Updated ${changed} item(s)` : "No changes applied");

      setReclassifyBusy(false);
    },
    onError: (e) => {
      console.error(e);
      setReclassifyBusy(false);
      toast.error("Failed to standardize categories");
    },
  });

  return (
    <FeatureGate 
      feature="AI_UPDATES"
      featureName="AI Updates"
      description="Automatically standardize tobacco categories, regenerate pairing matrices, and update collection optimization using advanced AI. Available in Pro tier or for grandfathered Premium users."
    >
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">
          {isAppleBuild ? "Inventory Tools" : "AI Updates"}
        </h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          {isAppleBuild
            ? "Tools for cataloging and standardizing collection metadata for easier searching and reporting."
            : "Review what's out of date and regenerate with approval. You can undo changes and reclassify blends."}
        </p>
      </div>

      <div className="space-y-4">
        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
              <Tags className="w-5 h-5 text-blue-400" />
              Category Standardization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#e8d5b7]/80 mb-4">
              Standardize your existing inventory categories for improved accuracy and filtering.
            </p>
            <Button
              size="sm"
              disabled={reclassifyBusy || blends.length === 0}
              onClick={() => reclassifyBlends.mutate()}
              className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
            >
              {reclassifyBusy ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Tags className="w-4 h-4 mr-1" />
              )}
              <span className="hidden sm:inline">Standardize Categories ({blends.length} total)</span>
              <span className="sm:hidden">📋 Standardize ({blends.length})</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
              <Ruler className="w-5 h-5 text-blue-400" />
              Pipe Measurements & Geometry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-[#e8d5b7] mb-2">Find Verified Measurements</h4>
              <p className="text-sm text-[#e8d5b7]/80 mb-3">
                Search verified manufacturer specs and databases to auto-fill missing measurements.
              </p>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-[#1a2c42] border border-[#e8d5b7]/20 rounded-lg px-3 py-2 text-[#e8d5b7] text-sm"
                  value={measurementLookupState.selectedPipeId || ""}
                  onChange={(e) =>
                    setMeasurementLookupState({ ...measurementLookupState, selectedPipeId: e.target.value })
                  }
                  disabled={measurementLookupState.status === "running"}
                >
                  <option value="">Select a pipe...</option>
                  {pipes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.maker ? `(${p.maker})` : ""}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700"
                  onClick={async () => {
                    if (!measurementLookupState.selectedPipeId) {
                      toast.error("Please select a pipe first");
                      return;
                    }

                    const pipe = pipes.find((p) => p.id === measurementLookupState.selectedPipeId);
                    if (!pipe) return;

                    setMeasurementLookupState({
                      ...measurementLookupState,
                      status: "running",
                      results: null,
                      message: "",
                    });

                    try {
                      // Count what we have
                      const photosCount = (pipe.photos || []).length;
                      const measurementFields = [
                        "length_mm",
                        "weight_grams",
                        "bowl_height_mm",
                        "bowl_width_mm",
                        "bowl_diameter_mm",
                        "bowl_depth_mm",
                      ];
                      const existingMeasurements = measurementFields.filter((f) => !isMissingMeasurement(pipe[f]));
                      const geometryFields = ["shape", "bowlStyle", "shankShape", "bend", "sizeClass"];
                      const existingGeometry = geometryFields.filter((f) => !isMissingGeometry(pipe[f]));

                      // Build lookup prompt
                      const prompt = `You are searching verified manufacturer specifications and pipe databases to find measurements for a tobacco pipe.

**Pipe Identity:**
- Name: ${pipe.name || "Unknown"}
- Maker/Brand: ${pipe.maker || "Unknown"}
- Country: ${pipe.country_of_origin || "Unknown"}
- Shape: ${pipe.shape || "Unknown"}
- Year Made: ${pipe.year_made || "Unknown"}
- Stamping: ${pipe.stamping || "None"}

**Task:**
Search verified sources (manufacturer catalogs, pipe databases, estate listings with verified specs) to find reliable measurements and geometry classifications for this specific pipe model.

**Fields to Look Up (only if missing):**

Measurements (update only if currently missing):
${measurementFields.map((f) => `- ${f}: ${isMissingMeasurement(pipe[f]) ? "MISSING - search for this" : `Current: ${pipe[f]} - SKIP`}`).join("\n")}

Geometry (update only if missing or "Unknown"):
${geometryFields.map((f) => `- ${f}: ${isMissingGeometry(pipe[f]) ? "MISSING/UNKNOWN - search for this" : `Current: ${pipe[f]} - SKIP`}`).join("\n")}

**Constraints:**
- Only return data from VERIFIED sources (manufacturer specs, authorized dealers, established pipe databases)
- Do NOT estimate or guess
- Use exact enum values for geometry fields:
  * shape: Billiard, Bent Billiard, Apple, Dublin, Bulldog, Rhodesian, etc. (see previous instructions)
  * bowlStyle: Cylindrical (Straight Wall), Conical (Tapered), Rounded / Ball, etc.
  * shankShape: Round, Diamond, Square, Oval, etc.
  * bend: Straight, 1/4 Bent, 1/2 Bent, etc.
  * sizeClass: Vest Pocket, Small, Standard, Large, etc.

**Output Format:**
Return JSON with:
- found: true/false
- updates: { field: value, ... } (only fields with verified data)
- sources: [domain names of sources used]
- message: explanation of what was/wasn't found`;

                      const result = await base44.integrations.Core.InvokeLLM({
                        prompt,
                        add_context_from_internet: true,
                        response_json_schema: {
                          type: "object",
                          properties: {
                            found: { type: "boolean" },
                            updates: {
                              type: "object",
                              additionalProperties: true,
                            },
                            sources: {
                              type: "array",
                              items: { type: "string" },
                            },
                            message: { type: "string" },
                          },
                        },
                      });

                      if (!result.found || !result.updates || Object.keys(result.updates).length === 0) {
                        setMeasurementLookupState({
                          ...measurementLookupState,
                          status: "none_found",
                          results: {
                            pipe,
                            photosCount,
                            existingMeasurements,
                            existingGeometry,
                            sources: result.sources || [],
                          },
                          message:
                            result.message ||
                            "No verified specs found for this pipe. You can add measurements manually or run Analyze Pipe Geometry from Photos.",
                        });
                        return;
                      }

                      // Apply updates
                      await safeUpdate("Pipe", pipe.id, result.updates, user?.email);
                      queryClient.invalidateQueries({ queryKey: ["pipes", user?.email] });

                      toast.success(`Updated ${Object.keys(result.updates).length} field(s)`);

                      setMeasurementLookupState({
                        ...measurementLookupState,
                        status: "completed",
                        results: {
                          pipe,
                          photosCount,
                          existingMeasurements,
                          existingGeometry,
                          updates: result.updates,
                          sources: result.sources || [],
                        },
                        message: result.message || `Successfully updated ${Object.keys(result.updates).length} fields`,
                      });
                    } catch (err) {
                      console.error("Measurement lookup error:", err);
                      setMeasurementLookupState({
                        ...measurementLookupState,
                        status: "error",
                        message: err.message || "Failed to search for verified measurements",
                      });
                      toast.error("Lookup failed");
                    }
                  }}
                  disabled={!measurementLookupState.selectedPipeId || measurementLookupState.status === "running"}
                >
                  {measurementLookupState.status === "running" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>Find Verified Measurements</>
                  )}
                </Button>
              </div>
            </div>

            {/* Measurement Lookup Results */}
            {measurementLookupState.status !== "idle" && measurementLookupState.results && (
              <div className="border border-[#e8d5b7]/20 rounded-lg p-4 bg-[#1a2c42]/50 space-y-3">
                <div className="text-xs text-[#e8d5b7]/70 space-y-1">
                  <p>
                    <strong>Pipe:</strong> {measurementLookupState.results.pipe?.name}
                  </p>
                  <p>
                    <strong>Photos found:</strong> {measurementLookupState.results.photosCount}
                  </p>
                  <p>
                    <strong>Measurements present:</strong>{" "}
                    {measurementLookupState.results.existingMeasurements?.length > 0
                      ? measurementLookupState.results.existingMeasurements.join(", ")
                      : "None"}
                  </p>
                  <p>
                    <strong>Geometry present:</strong>{" "}
                    {measurementLookupState.results.existingGeometry?.length > 0
                      ? measurementLookupState.results.existingGeometry.join(", ")
                      : "None"}
                  </p>
                  {measurementLookupState.results.sources && measurementLookupState.results.sources.length > 0 && (
                    <p>
                      <strong>Sources:</strong> {measurementLookupState.results.sources.join(", ")}
                    </p>
                  )}
                </div>

                {measurementLookupState.status === "completed" && measurementLookupState.results.updates && (
                  <div className="border-t border-[#e8d5b7]/10 pt-3">
                    <p className="text-sm font-semibold text-green-400 mb-2">
                      ✓ Updated {Object.keys(measurementLookupState.results.updates).length} field(s):
                    </p>
                    <div className="text-xs text-[#e8d5b7]/80 space-y-1">
                      {Object.entries(measurementLookupState.results.updates).map(([key, value]) => (
                        <p key={key}>
                          • {key}: <strong>{value}</strong>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {measurementLookupState.status === "none_found" && (
                  <p className="text-sm text-[#e8d5b7]/70">{measurementLookupState.message}</p>
                )}

                {measurementLookupState.status === "error" && (
                  <p className="text-sm text-red-400">Error: {measurementLookupState.message}</p>
                )}
              </div>
            )}

            <div className="border-t border-[#e8d5b7]/10 pt-4">
              <h4 className="text-sm font-semibold text-[#e8d5b7] mb-2">Analyze Pipe Geometry from Photos</h4>
              <p className="text-sm text-[#e8d5b7]/80 mb-3">
                Use AI to analyze pipe photos and dimensions to suggest geometry classifications (shape, bowl style,
                bend, etc.)
              </p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-teal-600 to-teal-700"
                onClick={() => setShowPipeAnalyzer(!showPipeAnalyzer)}
                disabled={pipes.length === 0}
              >
                {showPipeAnalyzer ? (
                  <>Hide Analyzer</>
                ) : (
                  <>
                    <Ruler className="w-4 h-4 mr-1" />
                    Analyze Geometry from Photos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPipeAnalyzer && pipes.length > 0 && (
          <PipeGeometryAnalyzer
            pipes={pipes}
            user={user}
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["pipes", user?.email] });
            }}
          />
        )}
      </div>
    </div>
    </FeatureGate>
  );
}