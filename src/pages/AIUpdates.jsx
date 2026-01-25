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

export default function AIUpdates() {
  const queryClient = useQueryClient();
  const [reclassifyBusy, setReclassifyBusy] = useState(false);
  const [showPipeAnalyzer, setShowPipeAnalyzer] = useState(false);

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
              <Ruler className="w-5 h-5 text-teal-400" />
              Pipe Geometry Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#e8d5b7]/80 mb-4">
              Analyze pipe photos and dimensions to auto-fill geometry fields (shape, bowl style, bend, etc.)
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
                  <span className="hidden sm:inline">Analyze Pipe Geometry ({pipes.length} total)</span>
                  <span className="sm:hidden">🔧 Analyze ({pipes.length})</span>
                </>
              )}
            </Button>
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