import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getPipeVariantKey } from "@/components/utils/pipeVariants";
import { regeneratePairings } from "@/components/utils/pairingRegeneration";
import { scorePipeBlend } from "@/components/utils/pairingScoreCanonical";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function PairingMatrix({ user }) {
  if (isAppleBuild) return null;

  const [expanded, setExpanded] = useState({});
  const [regenerating, setRegenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      return await base44.entities.Pipe.filter({ created_by: user?.email }, "-updated_date", 500) || [];
    },
    enabled: !!user?.email,
  });

  const { data: activePairingsRecord, isLoading: artifactsLoading } = useQuery({
    queryKey: ["activePairings", user?.email],
    queryFn: async () => {
      const active = await base44.entities.PairingMatrix.filter(
        { created_by: user?.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () => {
      return await base44.entities.TobaccoBlend.filter({ created_by: user?.email }) || [];
    },
    enabled: !!user?.email,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const regenPairings = async () => {
    setRegenerating(true);
    try {
      await regeneratePairings({
        pipes,
        blends,
        profile: userProfile,
        user,
        queryClient,
        activePairings: activePairingsRecord,
        mode: "merge"
      });
      await queryClient.invalidateQueries({ queryKey: ["activePairings", user.email] });
      toast.success("Pairings regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate pairings");
    } finally {
      setRegenerating(false);
    }
  };

  const pairings = useMemo(() => {
    const activePairings = activePairingsRecord?.pairings || [];
    return activePairings.map((p) => ({
      ...p,
      __variant_key: getPipeVariantKey(p.pipe_id, p.bowl_variant_id || null),
      recommendations: p.recommendations || [],
    }));
  }, [activePairingsRecord]);

  const pipeNameById = useMemo(() => {
    const map = new Map();
    (pipes || []).forEach((p) => map.set(String(p.id), p.name));
    return map;
  }, [pipes]);

  const variantLabel = (pair) => {
    const base = pipeNameById.get(String(pair.pipe_id)) || pair.pipe_name || "Unknown Pipe";
    if (pair.bowl_variant_id) {
      const pipe = pipes.find((p) => String(p.id) === String(pair.pipe_id));
      if (pipe?.interchangeable_bowls) {
        const bowl = pipe.interchangeable_bowls.find((b, i) =>
          String(b.bowl_variant_id || `bowl_${i}`) === String(pair.bowl_variant_id)
        );
        if (bowl) return `${base} - ${bowl.name || "Bowl"}`;
      }
      return `${base} - ${pair.bowl_variant_id}`;
    }
    return base;
  };

  const toggleExpanded = (variantKey) => {
    setExpanded((prev) => ({ ...prev, [variantKey]: !prev[variantKey] }));
  };

  if (pipesLoading || artifactsLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-stone-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading pairing matrix...
      </div>
    );
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle>Pairing Matrix</CardTitle>
        <CardDescription>Interchangeable bowls are shown as distinct pipe variants.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
         {pairings.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-8 text-center">
             <p className="text-sm text-[#E0D8C8]/70 mb-2">No pairing data yet</p>
             <p className="text-xs text-[#E0D8C8]/50 mb-4 max-w-md">
               Add pipes and tobacco to your collection, then generate AI-powered pairing recommendations.
             </p>
             <div className="flex gap-3">
               <a href={createPageUrl('Pipes')}>
                 <Button variant="outline" size="sm">
                   Add First Pipe
                 </Button>
               </a>
               <a href={createPageUrl('Tobacco')}>
                 <Button variant="outline" size="sm">
                   Add First Blend
                 </Button>
               </a>
             </div>
             <Button 
               onClick={regenPairings} 
               disabled={regenerating || pipes.length === 0 || blends.length === 0}
               className="mt-4"
             >
               {regenerating ? (
                 <Loader2 className="h-3 w-3 animate-spin mr-2" />
               ) : (
                 <RefreshCw className="h-3 w-3 mr-2" />
               )}
               Generate Pairings
             </Button>
           </div>
         ) : (
          pairings.map((p) => {
            const key = p.__variant_key;
            const isOpen = !!expanded[key];
            const recs = p.recommendations || [];

            return (
              <div key={key} className="border rounded-lg bg-white">
                <button
                  className="w-full flex items-center justify-between p-3 text-left"
                  onClick={() => toggleExpanded(key)}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div className="font-semibold text-stone-800">{variantLabel(p)}</div>
                  </div>
                  <div className="text-xs text-stone-500">
                    {(recs?.length || 0)} recommendation{(recs?.length || 0) === 1 ? "" : "s"}
                  </div>
                </button>

                {isOpen ? (
                   <div className="px-3 pb-3">
                     {recs.length ? (
                       <div className="flex flex-wrap gap-2">
                         {recs.slice(0, 3).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map((r, idx) => (
                           <Badge key={`${key}-top-${idx}`} variant="secondary" className="bg-stone-100 text-stone-800">
                             {r.tobacco_name || r.name || "Tobacco"} {r.score != null ? `(${r.score})` : ""}
                           </Badge>
                         ))}
                       </div>
                     ) : (
                       <div className="text-sm text-stone-600">No recommendations for this variant.</div>
                     )}
                    {p.reasoning ? (
                      <div className="mt-3 text-xs text-stone-600 whitespace-pre-wrap">{p.reasoning}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}