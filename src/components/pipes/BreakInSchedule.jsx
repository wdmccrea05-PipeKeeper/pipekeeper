import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";

export default function BreakInSchedule({ pipe, blends, isPaidUser }) {
  const [generating, setGenerating] = useState(false);
  const [schedule, setSchedule] = useState(pipe.break_in_schedule || []);
  const queryClient = useQueryClient();

  const updatePipeMutation = useMutation({
    mutationFn: (data) => base44.entities.Pipe.update(pipe.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipe', pipe.id] });
      queryClient.invalidateQueries({ queryKey: ['pipes'] });
    },
  });

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a break-in schedule for this pipe based on its characteristics and the user's available tobacco blends.

Pipe Details:
- Name: ${pipe.name}
- Shape: ${pipe.shape || 'Unknown'}
- Bowl Material: ${pipe.bowl_material || 'Unknown'}
- Chamber Volume: ${pipe.chamber_volume || 'Unknown'}
- Focus: ${pipe.focus?.join(', ') || 'None specified'}
- Condition: ${pipe.condition || 'Unknown'}

Available Tobacco Blends:
${blends.map(b => `- ${b.name} (${b.manufacturer || 'Unknown'}) - ${b.blend_type || 'Unknown'} - Strength: ${b.strength || 'Unknown'}`).join('\n')}

Create a break-in schedule with 3-5 stages that gradually introduces the pipe to smoking. For estate or new pipes, start with milder blends and progressively move to the pipe's intended focus. Each stage should specify:
1. Which blend to use (from available blends)
2. How many bowls to smoke
3. Brief reasoning

Return a schedule that totals 15-25 bowls for proper break-in.`,
        response_json_schema: {
          type: "object",
          properties: {
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  blend_id: { type: "string" },
                  blend_name: { type: "string" },
                  suggested_bowls: { type: "number" },
                  bowls_completed: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.schedule) {
        const newSchedule = result.schedule.map(s => ({ ...s, bowls_completed: 0 }));
        setSchedule(newSchedule);
        await updatePipeMutation.mutateAsync({ break_in_schedule: newSchedule });
      }
    } catch (err) {
      console.error('Error generating schedule:', err);
    } finally {
      setGenerating(false);
    }
  };

  const updateBowlsCompleted = async (index, value) => {
    const updated = [...schedule];
    updated[index].bowls_completed = Math.max(0, parseInt(value) || 0);
    setSchedule(updated);
    await updatePipeMutation.mutateAsync({ break_in_schedule: updated });
  };

  const logBreakInSession = async (scheduleItem) => {
    await base44.entities.SmokingLog.create({
      pipe_id: pipe.id,
      pipe_name: pipe.name,
      blend_id: scheduleItem.blend_id,
      blend_name: scheduleItem.blend_name,
      bowls_smoked: 1,
      is_break_in: true,
      date: new Date().toISOString(),
    });
    
    const itemIndex = schedule.findIndex(s => s.blend_id === scheduleItem.blend_id);
    if (itemIndex >= 0) {
      await updateBowlsCompleted(itemIndex, (schedule[itemIndex].bowls_completed || 0) + 1);
    }
  };

  const totalBowls = schedule.reduce((sum, s) => sum + s.suggested_bowls, 0);
  const completedBowls = schedule.reduce((sum, s) => sum + (s.bowls_completed || 0), 0);
  const progress = totalBowls > 0 ? Math.round((completedBowls / totalBowls) * 100) : 0;

  if (!isPaidUser) {
    return (
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-violet-800">
            <Sparkles className="w-5 h-5" />
            Break-In Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpgradePrompt 
            featureName="Break-In Schedule"
            description="Get AI-generated break-in schedules tailored to your pipe's characteristics. Track your progress with recommended tobacco blends and bowl counts for optimal pipe conditioning."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-violet-800">
              <Sparkles className="w-5 h-5" />
              Break-In Schedule
            </CardTitle>
            {schedule.length > 0 && (
              <p className="text-sm text-stone-600 mt-1">
                {completedBowls} / {totalBowls} bowls completed ({progress}%)
              </p>
            )}
          </div>
          {schedule.length === 0 ? (
            <Button
              onClick={generateSchedule}
              disabled={generating || blends.length === 0}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Schedule
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={generateSchedule}
              disabled={generating}
            >
              Regenerate
            </Button>
          )}
        </div>
      </CardHeader>
      {schedule.length > 0 && (
        <CardContent>
          {progress < 100 && (
            <div className="mb-4 bg-stone-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-violet-600 h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="space-y-3">
            {schedule.map((item, idx) => {
              const isComplete = item.bowls_completed >= item.suggested_bowls;
              return (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border transition-all ${
                    isComplete 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-stone-800">{item.blend_name}</p>
                        {isComplete && (
                          <Badge className="bg-green-600 text-white">
                            <Check className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-stone-600 mb-2">{item.reasoning}</p>
                      <p className="text-xs text-stone-500">
                        Suggested: {item.suggested_bowls} bowls
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.bowls_completed || 0}
                          onChange={(e) => updateBowlsCompleted(idx, e.target.value)}
                          className="w-16 h-9 text-center"
                        />
                        <span className="text-sm text-stone-500">/ {item.suggested_bowls}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => logBreakInSession(item)}
                        className="shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
      {blends.length === 0 && (
        <CardContent>
          <p className="text-sm text-stone-500 text-center py-4">
            Add tobacco blends to your collection to generate a break-in schedule
          </p>
        </CardContent>
      )}
    </Card>
  );
}