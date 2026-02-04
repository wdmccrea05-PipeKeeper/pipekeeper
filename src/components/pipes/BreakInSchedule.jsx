import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { PKCard, PKHeader } from "@/components/ui/pk-surface";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Loader2, Plus, Check, AlertTriangle, Undo } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generateBreakInScheduleAI } from "@/components/utils/aiGenerators";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries } from "@/components/utils/cacheInvalidation";
import FeatureGate from "@/components/subscription/FeatureGate";
import { useTranslation } from "react-i18next";

export default function BreakInSchedule({ pipe, blends }) {
  if (isAppleBuild) return null;

  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [schedule, setSchedule] = useState(pipe.break_in_schedule || []);
  const [collapsed, setCollapsed] = useState(true);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    // Keep UI in sync with latest pipe data (e.g., when a smoking log updates break-in progress)
    setSchedule(Array.isArray(pipe.break_in_schedule) ? pipe.break_in_schedule : []);
  }, [pipe.id, pipe.break_in_schedule]);

  // Compute fingerprint and staleness
  const currentFingerprint = React.useMemo(() => 
    buildArtifactFingerprint({ pipes: [pipe], blends, profile: userProfile }),
    [pipe, blends, userProfile]
  );

  const isStale = React.useMemo(() => 
    !!pipe?.break_in_schedule?.length && (!pipe.break_in_schedule_input_fingerprint || pipe.break_in_schedule_input_fingerprint !== currentFingerprint),
    [pipe, currentFingerprint]
  );

  // Don't auto-show regen dialog - user can manually regenerate if desired

  const updatePipeMutation = useMutation({
    mutationFn: (data) => safeUpdate('Pipe', pipe.id, data, user?.email),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
    },
  });

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      // Use shared AI generator
      const result = await generateBreakInScheduleAI({ pipe, blends, profile: userProfile });

      if (result?.schedule) {
        const norm = (s) => (s || '').trim().toLowerCase();

        const resolveBlend = (blendName) => {
          if (!blendName) return null;
          const exact = blends.find(b => norm(b.name) === norm(blendName));
          if (exact) return exact;

          // fallback: partial match (helps with small naming differences)
          const partial = blends.find(b => norm(b.name).includes(norm(blendName)) || norm(blendName).includes(norm(b.name)));
          return partial || null;
        };

        const newSchedule = result.schedule.map((s) => {
          const matched = resolveBlend(s.blend_name);
          return {
            ...s,
            blend_id: matched?.id || s.blend_id || '',
            blend_name: matched?.name || s.blend_name,
            bowls_completed: 0,
          };
        });

        setSchedule(newSchedule);
        
        // Save with history and fingerprint
        const history = Array.isArray(pipe.break_in_schedule_history) 
          ? pipe.break_in_schedule_history 
          : [];

        const nextHistory = [
          {
            at: new Date().toISOString(),
            schedule: Array.isArray(pipe.break_in_schedule) ? pipe.break_in_schedule : [],
            reason: "User regenerated schedule",
          },
          ...history,
        ].slice(0, 3);

        await updatePipeMutation.mutateAsync({ 
           break_in_schedule: newSchedule,
           break_in_schedule_history: nextHistory,
           break_in_schedule_input_fingerprint: currentFingerprint,
         });
         setShowRegenDialog(false);
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
    
    // Invalidate smoking logs to show new entry
    queryClient.invalidateQueries({ queryKey: ['smoking-logs'] });
  };

  const undoScheduleMutation = useMutation({
    mutationFn: async () => {
      const history = Array.isArray(pipe.break_in_schedule_history) 
        ? pipe.break_in_schedule_history 
        : [];
      const last = history[0];
      if (!last?.schedule) return;

      return await safeUpdate('Pipe', pipe.id, {
        break_in_schedule: last.schedule,
        break_in_schedule_history: history.slice(1),
        break_in_schedule_input_fingerprint: null,
      }, user?.email);
    },
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
      setShowRegenDialog(false);
    },
  });

  const totalBowls = schedule.reduce((sum, s) => sum + s.suggested_bowls, 0);
  const completedBowls = schedule.reduce((sum, s) => sum + (s.bowls_completed || 0), 0);
  const progress = totalBowls > 0 ? Math.round((completedBowls / totalBowls) * 100) : 0;

  return (
    <FeatureGate 
      feature="BREAK_IN_SCHEDULE"
      featureName="Break-In Schedules"
      description="Get AI-generated break-in schedules tailored to your pipe's characteristics with Pro or legacy Premium access. Track your progress with recommended tobacco blends and bowl counts for optimal pipe conditioning."
    >
       {/* Staleness Dialog */}
       <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Break-In Schedule Out of Date
            </DialogTitle>
            <DialogDescription>
              Pipe details, blends, or preferences have changed. Regenerate schedule now? You can undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRegenDialog(false);
              setDismissedFingerprint(currentFingerprint);
            }}>
              Not Now
            </Button>
            {pipe?.break_in_schedule_history?.[0] && (
              <Button
                variant="outline"
                onClick={() => undoScheduleMutation.mutate()}
                disabled={undoScheduleMutation.isPending}
              >
                <Undo className="w-4 h-4 mr-2" />
                Undo Last Change
              </Button>
            )}
            <Button
              onClick={() => {
                setShowRegenDialog(false);
                generateSchedule();
              }}
              disabled={generating}
              className="bg-amber-700 hover:bg-amber-800"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <PKCard>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <PKHeader 
              title={<span className="flex items-center gap-2"><Sparkles className="w-5 h-5" />{t("breakInSchedule.breakInSchedule")}</span>}
            />
            {schedule.length > 0 && (
              <p className="text-sm text-[#E0D8C8]/60 mt-1">
                {completedBowls} / {totalBowls} {t("breakInSchedule.bowlsCompleted")} ({progress}%)
              </p>
            )}
          </div>
          {schedule.length === 0 ? (
           <Button
             onClick={generateSchedule}
             disabled={generating || blends.length === 0}
             className="bg-[#A35C5C] hover:bg-[#8B4A4A]"
           >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("breakInSchedule.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("breakInSchedule.generateSchedule")}
                </>
              )}
            </Button>
          ) : (
           <div className="flex gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setCollapsed(!collapsed)}
               className="bg-[#223447]/5 text-[#E0D8C8] border border-white/10 hover:bg-[#223447]/10"
             >
               {collapsed ? t("breakInSchedule.show") : t("breakInSchedule.hide")}
             </Button>
             <Button
               size="sm"
               onClick={generateSchedule}
               disabled={generating}
               className="bg-[#A35C5C] text-[#FFF7ED] hover:bg-[#8B4A4A]"
             >
               {t("optimizer.regenerate")}
             </Button>
           </div>
          )}
        </div>
      </div>
      {schedule.length > 0 && !collapsed && (
        <div className="px-6 pb-6">
          {progress < 100 && (
            <div className="mb-4 bg-[#223447]/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-[#A35C5C] h-full transition-all duration-500"
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
                      ? 'bg-green-500/15 border-green-500/30' 
                      : 'bg-[#223447]/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-[#E0D8C8]">{item.blend_name}</p>
                        {isComplete && (
                            <Badge className="bg-green-600/80 text-white">
                              <Check className="w-3 h-3 mr-1" />
                              {t("breakInSchedule.complete")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[#E0D8C8]/70 mb-2">{item.reasoning}</p>
                        <p className="text-xs text-[#E0D8C8]/50">
                        {t("breakInSchedule.suggested")} {item.suggested_bowls} {t("breakInSchedule.bowls")}
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
                        <span className="text-sm text-[#E0D8C8]/60">/ {item.suggested_bowls}</span>
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
        </div>
      )}
      {blends.length === 0 && (
        <div className="px-6 pb-6">
          <p className="text-sm text-[#E0D8C8]/60 text-center py-4">
            {t("breakInSchedule.addBlendPrompt")}
          </p>
        </div>
      )}
    </PKCard>
    </FeatureGate>
  );
}