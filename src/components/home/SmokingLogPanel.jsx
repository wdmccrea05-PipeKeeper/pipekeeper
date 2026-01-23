import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Flame, Calendar, Info, CheckCircle, Crown, Edit, ChevronDown } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import SmokingLogEditor from "@/components/home/SmokingLogEditor";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries, invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { toast } from "sonner";

export default function SmokingLogPanel({ pipes, blends, user }) {
  if (isAppleBuild) return null;

  const hasPaidAccess = hasPremiumAccess(user);
  const entitlements = useEntitlements();

  if (!hasPaidAccess) {
    return (
      <UpgradePrompt 
        featureName="Smoking Log"
        description="Track your smoking sessions, monitor pipe rest periods, manage break-in schedules, and automatically reduce tobacco inventory. Build a detailed history to power AI recommendations."
      />
    );
  }
  const [showAddLog, setShowAddLog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [autoReduceInventory, setAutoReduceInventory] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    pipe_id: '',
    bowl_variant_id: '',
    blend_id: '',
    container_id: '',
    bowls_smoked: 1,
    is_break_in: false,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const selectedPipe = pipes.find(p => p.id === formData.pipe_id);
  const hasMultipleBowls = selectedPipe?.interchangeable_bowls?.length > 0;

  const queryClient = useQueryClient();

  const { data: containers = [] } = useQuery({
    queryKey: ["containers", user?.email, formData?.blend_id],
    enabled: !!user?.email && !!formData?.blend_id,
    queryFn: async () => {
      try {
        return await base44.entities.TobaccoContainer.filter(
          { user_email: user.email, blend_id: formData.blend_id },
          "-updated_date",
          50
        ) || [];
      } catch (err) {
        console.error('Failed to load containers:', err);
        return [];
      }
    },
  });

  // Helper for matching schedule items by ID or name
  const norm = (s) => (s || '').trim().toLowerCase();
  const scheduleMatches = (item, blendId, blendName) =>
    (item?.blend_id && blendId && item.blend_id === blendId) ||
    (item?.blend_name && blendName && norm(item.blend_name) === norm(blendName));

  const { data: logs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 50),
    enabled: !!user?.email,
  });

  // Calculate tobacco usage based on pipe bowl size
  const estimateTobaccoUsage = (pipe, bowls) => {
    if (!pipe) return 0;
    
    const chamberVolume = pipe.chamber_volume || 'Medium';
    const volumeMap = {
      'Small': 0.5,
      'Medium': 0.75,
      'Large': 1.0,
      'Extra Large': 1.25
    };
    
    const gramsPerBowl = volumeMap[chamberVolume] || 0.75;
    const totalGrams = gramsPerBowl * bowls;
    const ozPerGram = 0.035274;
    
    return totalGrams * ozPerGram;
  };

  // Get pipe rest status
  const getPipeRestStatus = (pipeId) => {
    const pipeLogs = logs.filter(l => l.pipe_id === pipeId).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (pipeLogs.length === 0) return { ready: true, message: 'No usage logged yet.' };
    
    const lastSmoked = new Date(pipeLogs[0].date);
    const hoursSinceSmoke = differenceInHours(new Date(), lastSmoked);
    const daysRested = Math.floor(hoursSinceSmoke / 24);
    
    if (hoursSinceSmoke >= 24) {
      return { ready: true, message: `Rested ${daysRested} day${daysRested > 1 ? 's' : ''} - ready!` };
    } else {
      const hoursLeft = 24 - hoursSinceSmoke;
      return { ready: false, message: `Needs ${hoursLeft} more hour${hoursLeft > 1 ? 's' : ''} rest` };
    }
  };

  const updateBlendMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('TobaccoBlend', id, data, user?.email),
    onSuccess: () => {
      invalidateBlendQueries(queryClient, user?.email);
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('SmokingLog', id, data, user?.email),
    onSuccess: async (_, variables) => {
      // Update break-in schedule when log is edited
      const oldLog = logs.find(l => l.id === variables.id);
      const newData = variables.data;
      
      // If break-in status or bowl count changed, update the pipe's schedule
      if (oldLog && (oldLog.is_break_in !== newData.is_break_in || 
                     oldLog.bowls_smoked !== newData.bowls_smoked ||
                     oldLog.blend_id !== newData.blend_id ||
                     oldLog.pipe_id !== newData.pipe_id)) {
        
        // Remove contribution from old pipe/blend
        if (oldLog.is_break_in && oldLog.pipe_id) {
          const freshOldPipes = await base44.entities.Pipe.filter({ id: oldLog.pipe_id });
          const oldPipe = freshOldPipes[0];
          const oldSchedule = Array.isArray(oldPipe?.break_in_schedule) ? oldPipe.break_in_schedule : [];
          if (oldSchedule.length > 0) {
            const updatedSchedule = oldSchedule.map(item => {
              if (scheduleMatches(item, oldLog.blend_id, oldLog.blend_name)) {
                return {
                  ...item,
                  bowls_completed: Math.max(0, (item.bowls_completed || 0) - oldLog.bowls_smoked)
                };
              }
              return item;
            });
            await safeUpdate('Pipe', oldPipe.id, { break_in_schedule: updatedSchedule }, user?.email);
          }
        }
        
        // Add contribution to new pipe/blend
        if (newData.is_break_in && newData.pipe_id) {
          const freshNewPipes = await base44.entities.Pipe.filter({ id: newData.pipe_id });
          const newPipe = freshNewPipes[0];
          if (newPipe) {
            const schedule = Array.isArray(newPipe.break_in_schedule) ? newPipe.break_in_schedule : [];

            const resolvedBlendName =
              newData.blend_name ||
              blends.find((b) => b.id === newData.blend_id)?.name ||
              '';

            const idx = schedule.findIndex((item) =>
              scheduleMatches(item, newData.blend_id, resolvedBlendName)
            );

            let updatedSchedule;

            if (idx >= 0) {
              // Update existing item
              updatedSchedule = schedule.map((item, i) =>
                i !== idx
                  ? item
                  : { ...item, bowls_completed: (item.bowls_completed || 0) + newData.bowls_smoked }
              );
            } else {
              // Append new item
              updatedSchedule = [
                ...schedule,
                {
                  blend_id: newData.blend_id,
                  blend_name: resolvedBlendName || "Unknown Blend",
                  suggested_bowls: 5,
                  bowls_completed: Number(newData.bowls_smoked || 1),
                  reasoning: "Added automatically from an edited break-in smoking log entry.",
                },
              ];
            }

            await safeUpdate('Pipe', newPipe.id, { break_in_schedule: updatedSchedule }, user?.email);
          }
        }
        
        invalidatePipeQueries(queryClient, user?.email);
      }

      if (oldLog?.pipe_id) queryClient.invalidateQueries({ queryKey: ['pipe', oldLog.pipe_id] });
      if (newData?.pipe_id) queryClient.invalidateQueries({ queryKey: ['pipe', newData.pipe_id] });
      
      queryClient.invalidateQueries({ queryKey: ['smoking-logs'] });
      setEditingLog(null);
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id) => base44.entities.SmokingLog.delete(id),
    onSuccess: async (_, logId) => {
      queryClient.invalidateQueries({ queryKey: ['smoking-logs'] });
      setEditingLog(null);
      
      // Update break-in schedules for affected pipe
      const log = logs.find(l => l.id === logId);
      if (log?.is_break_in && log?.pipe_id) {
        const freshPipes = await base44.entities.Pipe.filter({ id: log.pipe_id });
        const pipe = freshPipes[0];
        const currentSchedule = Array.isArray(pipe?.break_in_schedule) ? pipe.break_in_schedule : [];
        if (currentSchedule.length > 0) {
          const updatedSchedule = currentSchedule.map(item => {
            if (scheduleMatches(item, log.blend_id, log.blend_name)) {
              return {
                ...item,
                bowls_completed: Math.max(0, (item.bowls_completed || 0) - log.bowls_smoked)
              };
            }
            return item;
          });
          await safeUpdate('Pipe', pipe.id, { break_in_schedule: updatedSchedule }, user?.email);
          invalidatePipeQueries(queryClient, user?.email);
          queryClient.invalidateQueries({ queryKey: ['pipe', log.pipe_id] });
        }
      }
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.SmokingLog.create(data),
    onSuccess: async (createdLog, variables) => {
      // Decrement container if chosen
      if (variables.container_id) {
        try {
          const containerRes = await base44.entities.TobaccoContainer.filter({ id: variables.container_id });
          const container = containerRes?.[0];
          if (container?.id) {
            const gramsUsed = variables.tobaccoUsed * 28.35; // Convert oz to grams
            await safeUpdate('TobaccoContainer', container.id, {
              quantity_grams: Math.max(0, Number(container.quantity_grams || 0) - gramsUsed),
              updated_date: new Date().toISOString(),
            }, user?.email);
            queryClient.invalidateQueries({ queryKey: ["containers", user?.email, variables.blend_id] });
          }
        } catch (err) {
          console.error('Failed to update container:', err);
        }
      }

      // Reduce tobacco inventory
      if (autoReduceInventory && variables.tobaccoUsed > 0) {
        const blend = blends.find(b => b.id === variables.blend_id);
        if (blend) {
          // Reduce from opened inventory first
          let remaining = variables.tobaccoUsed;
          const updateData = {};
          
          // Try to reduce from open bulk first
          if (blend.bulk_open > 0 && remaining > 0) {
            const toReduce = Math.min(blend.bulk_open, remaining);
            updateData.bulk_open = Math.max(0, blend.bulk_open - toReduce);
            updateData.bulk_total_quantity_oz = Math.max(0, (blend.bulk_total_quantity_oz || 0) - toReduce);
            remaining -= toReduce;
          }
          
          // Then open tins (convert to oz and reduce)
          if (blend.tin_tins_open > 0 && remaining > 0 && blend.tin_size_oz) {
            const tinCapacity = blend.tin_size_oz;
            const tinsToReduce = Math.ceil(remaining / tinCapacity);
            const actualReduction = Math.min(tinsToReduce, blend.tin_tins_open);
            updateData.tin_tins_open = Math.max(0, blend.tin_tins_open - actualReduction);
            updateData.tin_total_tins = Math.max(0, (blend.tin_total_tins || 0) - actualReduction);
            updateData.tin_total_quantity_oz = Math.max(0, (blend.tin_total_quantity_oz || 0) - (actualReduction * tinCapacity));
            remaining -= (actualReduction * tinCapacity);
          }
          
          // Then open pouches
          if (blend.pouch_pouches_open > 0 && remaining > 0 && blend.pouch_size_oz) {
            const pouchCapacity = blend.pouch_size_oz;
            const pouchesToReduce = Math.ceil(remaining / pouchCapacity);
            const actualReduction = Math.min(pouchesToReduce, blend.pouch_pouches_open);
            updateData.pouch_pouches_open = Math.max(0, blend.pouch_pouches_open - actualReduction);
            updateData.pouch_total_pouches = Math.max(0, (blend.pouch_total_pouches || 0) - actualReduction);
            updateData.pouch_total_quantity_oz = Math.max(0, (blend.pouch_total_quantity_oz || 0) - (actualReduction * pouchCapacity));
          }
          
          if (Object.keys(updateData).length > 0) {
            try {
              await updateBlendMutation.mutateAsync({ id: blend.id, data: updateData });
            } catch (err) {
              console.error('Failed to update blend inventory:', err);
            }
          }
        }
      }
      
      // Update break-in schedule if this is a break-in session
      if (variables.is_break_in && variables.pipe_id && variables.blend_id) {
        const freshPipes = await base44.entities.Pipe.filter({ id: variables.pipe_id });
        const pipe = freshPipes[0];

        // If pipe isn't found, skip schedule update but DO NOT abort the onSuccess flow
        if (pipe?.id) {
          const bowlsToAdd = Number(variables.bowls_smoked || 1);

          const schedule = Array.isArray(pipe.break_in_schedule) ? pipe.break_in_schedule : [];

          // Resolve blend name once so matching works even if variables.blend_name is missing
          const resolvedBlendName =
            variables.blend_name ||
            blends.find((b) => b.id === variables.blend_id)?.name ||
            '';

          const matchIndex = schedule.findIndex((item) =>
            scheduleMatches(item, variables.blend_id, resolvedBlendName)
          );

          let updatedSchedule;

          if (matchIndex >= 0) {
            updatedSchedule = schedule.map((item, idx) =>
              idx !== matchIndex
                ? item
                : { ...item, bowls_completed: (item.bowls_completed || 0) + bowlsToAdd }
            );
          } else {
            updatedSchedule = [
              ...schedule,
              {
                blend_id: variables.blend_id,
                blend_name: resolvedBlendName || 'Unknown Blend',
                suggested_bowls: 5,
                bowls_completed: bowlsToAdd,
                reasoning: 'Added automatically from a break-in smoking log entry.',
              },
            ];
          }

          await safeUpdate('Pipe', pipe.id, { break_in_schedule: updatedSchedule }, user?.email);

          // Refresh list + pipe detail
          invalidatePipeQueries(queryClient, user?.email);
          queryClient.invalidateQueries({ queryKey: ['pipe', variables.pipe_id] });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['smoking-logs'] });
      invalidateBlendQueries(queryClient, user?.email);
      setShowAddLog(false);
      setFormData({
        pipe_id: '',
        bowl_variant_id: '',
        blend_id: '',
        container_id: '',
        bowls_smoked: 1,
        is_break_in: false,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check free tier limits
    if (entitlements.tier === "free") {
      const existingLogs = await base44.entities.SmokingLog.filter({ created_by: user?.email });
      if (existingLogs.length >= entitlements.limits.smokingLogs) {
        toast.error(`Free tier limited to ${entitlements.limits.smokingLogs} smoking logs. Upgrade for unlimited.`);
        return;
      }
    }

    const pipe = pipes.find(p => p.id === formData.pipe_id);
    const blend = blends.find(b => b.id === formData.blend_id);
    
    if (!pipe || !blend) return;

    const bowls = parseInt(formData.bowls_smoked) || 1;
    const tobaccoUsed = estimateTobaccoUsage(pipe, bowls);

    let bowl_name = null;
    if (formData.bowl_variant_id && hasMultipleBowls) {
      const bowl = selectedPipe.interchangeable_bowls.find(
        b => (b.bowl_variant_id || `bowl_${selectedPipe.interchangeable_bowls.indexOf(b)}`) === formData.bowl_variant_id
      );
      bowl_name = bowl?.name || null;
    }

    createLogMutation.mutate({
      ...formData,
      pipe_name: pipe.name,
      blend_name: blend.name,
      bowl_name: bowl_name,
      date: new Date(formData.date).toISOString(),
      bowls_smoked: bowls,
      tobaccoUsed,
      blend_id: formData.blend_id,
      container_id: formData.container_id || null,
    });
  };

  const totalBowls = logs.reduce((sum, log) => sum + (log.bowls_smoked || 0), 0);
  const breakInBowls = logs.filter(l => l.is_break_in).reduce((sum, log) => sum + (log.bowls_smoked || 0), 0);

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-[#E0D8C8]/15 bg-[#223447]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <div>
                  <CardTitle className="flex items-center gap-2 text-[#E0D8C8]">
                    <Flame className="w-5 h-5" />
                    Smoking Log
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                  <p className="text-sm text-[#E0D8C8]/70 mt-1">
                    {totalBowls} total bowls ({breakInBowls} break-in)
                  </p>
                </div>
              </CollapsibleTrigger>
              <Button
                onClick={() => setShowAddLog(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Session
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-[#E0D8C8]/70 text-center py-8">
              No smoking sessions logged yet. Start tracking your sessions!
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-[#1E2F43] border border-[#E0D8C8]/15 hover:border-[#A35C5C]/50 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[#E0D8C8]">{log.pipe_name}</p>
                      <span className="text-[#E0D8C8]/50">+</span>
                      <p className="font-medium text-[#E0D8C8]">{log.blend_name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#E0D8C8]/70">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(log.date), 'MMM d, yyyy')}
                      <span>•</span>
                      <span>{log.bowls_smoked} bowl{log.bowls_smoked > 1 ? 's' : ''}</span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-[#E0D8C8]/70 mt-1">{log.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {log.is_break_in && (
                      <Badge className="bg-[#A35C5C]/30 text-[#E0D8C8] border-[#A35C5C]/50 shrink-0">
                        Break-In
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingLog(log)}
                    >
                      <Edit className="w-4 h-4 text-[#E0D8C8]/70" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Sheet open={showAddLog} onOpenChange={(open) => { setShowAddLog(open); if (!open) setEditingLog(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Log Smoking Session</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">Pipe</Label>
              <Select value={formData.pipe_id} onValueChange={(v) => setFormData({ ...formData, pipe_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pipe" />
                </SelectTrigger>
                <SelectContent>
                  {pipes.map(p => {
                    const restStatus = getPipeRestStatus(p.id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2 w-full">
                          <span>{p.name}</span>
                          {restStatus.ready ? (
                            <CheckCircle className="w-3 h-3 text-green-600 ml-auto" />
                          ) : (
                            <Badge variant="outline" className="text-xs ml-auto">Resting</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {formData.pipe_id && (
                <Alert className="mt-2">
                  <Info className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    {getPipeRestStatus(formData.pipe_id).message}
                  </AlertDescription>
                </Alert>
              )}
              </div>

              {hasMultipleBowls && (
              <div className="space-y-2">
                <Label className="text-[#E0D8C8]">Bowl Used (Optional)</Label>
                <Select value={formData.bowl_variant_id} onValueChange={(v) => setFormData({ ...formData, bowl_variant_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bowl variant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No specific bowl selected</SelectItem>
                    {selectedPipe.interchangeable_bowls.map((bowl, idx) => {
                      const bowlId = bowl.bowl_variant_id || `bowl_${idx}`;
                      return (
                        <SelectItem key={bowlId} value={bowlId}>
                          {bowl.name || `Bowl ${idx + 1}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              )}

              <div className="space-y-2">
              <Label className="text-[#E0D8C8]">Tobacco Blend</Label>
              <Select value={formData.blend_id} onValueChange={(v) => setFormData({ ...formData, blend_id: v, container_id: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blend" />
                </SelectTrigger>
                <SelectContent>
                  {blends.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>

            {formData.blend_id && containers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[#E0D8C8]">Container (Optional)</Label>
                <Select value={formData.container_id || ""} onValueChange={(v) => setFormData({ ...formData, container_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto / None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Auto / None</SelectItem>
                    {containers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.container_name} — {c.quantity_grams ?? 0}g
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">Number of Bowls</Label>
              <Input
                type="number"
                min="1"
                value={formData.bowls_smoked}
                onChange={(e) => setFormData({ ...formData, bowls_smoked: e.target.value })}
              />
              {formData.pipe_id && formData.bowls_smoked && (
                <p className="text-xs text-[#E0D8C8]/60">
                  Est. tobacco usage: ~{estimateTobaccoUsage(pipes.find(p => p.id === formData.pipe_id), parseInt(formData.bowls_smoked) || 1).toFixed(2)} oz
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_break_in}
                  onCheckedChange={(v) => setFormData({ ...formData, is_break_in: v })}
                />
                <Label className="text-[#E0D8C8]">Part of break-in schedule</Label>
              </div>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={autoReduceInventory}
                  onCheckedChange={setAutoReduceInventory}
                />
                <Label className="flex items-center gap-2 text-[#E0D8C8]">
                  Automatically reduce tobacco inventory
                  <Badge className="bg-[#A35C5C] text-[#F3EBDD] text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#E0D8C8]">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="How was the smoke? Any observations..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddLog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!formData.pipe_id || !formData.blend_id || createLogMutation.isPending}
                className="flex-1"
              >
                Log Session
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Edit Smoking Session</SheetTitle>
          </SheetHeader>
          {editingLog && (
            <SmokingLogEditor
              log={editingLog}
              pipes={pipes}
              blends={blends}
              onSave={async (data) => {
                await updateLogMutation.mutateAsync({ id: editingLog.id, data });
              }}
              onDelete={async () => {
                if (window.confirm('Delete this smoking session?')) {
                  await deleteLogMutation.mutateAsync(editingLog.id);
                }
              }}
              onCancel={() => setEditingLog(null)}
              isLoading={updateLogMutation.isPending || deleteLogMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}