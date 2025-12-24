import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";

export default function TopPipeMatches({ blend, pipes }) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const findMatches = async () => {
    if (pipes.length === 0) return;

    setLoading(true);
    try {
      const pipesData = pipes.map(p => ({
        id: p.id,
        name: p.name,
        maker: p.maker,
        shape: p.shape,
        bowl_material: p.bowl_material,
        chamber_volume: p.chamber_volume,
        bowl_diameter_mm: p.bowl_diameter_mm,
        bowl_depth_mm: p.bowl_depth_mm,
        designations: p.designations
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe tobacco consultant. Analyze which pipes from this collection would be the best matches for smoking this tobacco blend.

Tobacco Blend:
- Name: ${blend.name}
- Type: ${blend.blend_type}
- Strength: ${blend.strength}
- Cut: ${blend.cut}
- Flavor Notes: ${blend.flavor_notes?.join(', ')}

Available Pipes:
${JSON.stringify(pipesData, null, 2)}

Return the TOP 3 best matching pipes with reasoning. Consider:
- Chamber size for the cut type
- Pipe shape/bowl characteristics for the blend type
- Designated specializations if any
- Traditional pairings and smoking experience`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pipe_id: { type: "string" },
                  pipe_name: { type: "string" },
                  match_score: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      setMatches(result.matches?.slice(0, 3) || []);
    } catch (err) {
      console.error('Error finding matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 7) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  if (pipes.length === 0) return null;

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardContent className="p-4">
        {!matches ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm text-stone-600">Find best pipe matches for this blend</span>
            </div>
            <Button
              size="sm"
              onClick={findMatches}
              disabled={loading}
              className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Find Matches
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <span className="font-semibold text-violet-800">Top Pipe Matches</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? 'Show' : 'Hide'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMatches(null)}>
                  Refresh
                </Button>
              </div>
            </div>

            {!collapsed && (
              <div className="space-y-2">
              {matches.map((match, idx) => {
                const pipe = pipes.find(p => p.id === match.pipe_id);
                if (!pipe) return null;

                return (
                  <Link key={match.pipe_id} to={createPageUrl(`PipeDetail?id=${pipe.id}`)}>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-violet-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                        {pipe.photos?.[0] ? (
                          <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PipeShapeIcon shape={pipe.shape} className="text-xl" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-stone-800">#{idx + 1}</span>
                          <span className="font-medium text-stone-800">{match.pipe_name}</span>
                          <Badge className={getScoreColor(match.match_score)}>
                            {match.match_score}/10
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-600">{match.reasoning}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}