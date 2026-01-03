import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Flame, Calendar, Info, CheckCircle, Crown, Edit } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import SmokingLogEditor from "@/components/home/SmokingLogEditor";

export default function SmokingLogPanel({ pipes, blends, user }) {
  const [showAddLog, setShowAddLog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [autoReduceInventory, setAutoReduceInventory] = useState(true);
  const [formData, setFormData] = useState({
    pipe_id: '',
    blend_id: '',
    bowls_smoked: 1,
    is_break_in: false,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const queryClient = useQueryClient();

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
    if (pipeLogs.length === 0) return { ready: true, message: 'Never smoked - ready to use!' };
    
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
    mutationFn: ({ id, data }) => base44.entities.TobaccoBlend.update(id, data),
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SmokingLog.update(id, data),
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
          if (oldPipe?.break_in_schedule) {
            const updatedSchedule = oldPipe.break_in_schedule.map(item => {
              if (scheduleMatches(item, oldLog.blend_id, oldLog.blend_name)) {
                return {
                  ...item,
                  bowls_completed: Math.max(0, (item.bowls_completed || 0) - oldLog.bowls_smoked)
                };
              }
              return item;
            });
            await base44.entities.Pipe.update(oldPipe.id, { break_in_schedule: updatedSchedule });
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

            await base44.entities.Pipe.update(newPipe.id, { break_in_schedule: updatedSchedule });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['pipes'] });
      }
      
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
        if (pipe?.break_in_schedule) {
          const updatedSchedule = pipe.break_in_schedule.map(item => {
            if (scheduleMatches(item, log.blend_id, log.blend_name)) {
              return {
                ...item,
                bowls_completed: Math.max(0, (item.bowls_completed || 0) - log.bowls_smoked)
              };
            }
            return item;
          });
          await base44.entities.Pipe.update(pipe.id, { break_in_schedule: updatedSchedule });
          queryClient.invalidateQueries({ queryKey: ['pipes'] });
        }
      }
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.SmokingLog.create(data),
    onSuccess: async (createdLog, variables) => {
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
            await updateBlendMutation.mutateAsync({ id: blend.id, data: updateData });
          }
        }
      }
      
      // Update break-in schedule if this is a break-in session
      if (variables.is_break_in && variables.pipe_id && variables.blend_id) {
        const freshPipes = await base44.entities.Pipe.filter({ id: variables.pipe_id });
        const pipe = freshPipes[0];

        if (!pipe?.id) return;

        const norm = (s) => (s || '').trim().toLowerCase();
        const bowlsToAdd = Number(variables.bowls_smoked || 1);

        // Use existing schedule or start a new one
        const schedule = Array.isArray(pipe?.break_in_schedule) ? pipe.break_in_schedule : [];

        // Try to match by ID first, then fallback to name (in case older schedules have bad IDs)
        const matchIndex = schedule.findIndex((item) =>
          (item?.blend_id && item.blend_id === variables.blend_id) ||
          (item?.blend_name && variables.blend_name && norm(item.blend_name) === norm(variables.blend_name))
        );

        let updatedSchedule;

        if (matchIndex >= 0) {
          // Increment bowls_completed on existing item
          updatedSchedule = schedule.map((item, idx) => {
            if (idx !== matchIndex) return item;
            return {
              ...item,
              bowls_completed: (item.bowls_completed || 0) + bowlsToAdd,
            };
          });
        } else {
          // Append a new schedule item for this blend
          const blendName =
            variables.blend_name ||
            blends.find((b) => b.id === variables.blend_id)?.name ||
            'Unknown Blend';

          const newItem = {
            blend_id: variables.blend_id,
            blend_name: blendName,
            suggested_bowls: 5,
            bowls_completed: bowlsToAdd,
            reasoning: 'Added automatically from a break-in smoking log entry.',
          };

          updatedSchedule = [...schedule, newItem];
        }

        await base44.entities.Pipe.update(pipe.id, { break_in_schedule: updatedSchedule });

        // Refresh both list + pipe detail views
        queryClient.invalidateQueries({ queryKey: ['pipes'] });
        queryClient.invalidateQueries({ queryKey: ['pipe', variables.pipe_id] });
      }
      
      queryClient.invalidateQueries({ queryKey: ['smoking-logs'] });
      queryClient.invalidateQueries({ queryKey: ['tobacco-blends'] });
      setShowAddLog(false);
      setFormData({
        pipe_id: '',
        blend_id: '',
        bowls_smoked: 1,
        is_break_in: false,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const pipe = pipes.find(p => p.id === formData.pipe_id);
    const blend = blends.find(b => b.id === formData.blend_id);
    
    if (!pipe || !blend) return;

    const bowls = parseInt(formData.bowls_smoked) || 1;
    const tobaccoUsed = estimateTobaccoUsage(pipe, bowls);

    createLogMutation.mutate({
      ...formData,
      pipe_name: pipe.name,
      blend_name: blend.name,
      date: new Date(formData.date).toISOString(),
      bowls_smoked: bowls,
      tobaccoUsed,
      blend_id: formData.blend_id,
    });
  };

  const totalBowls = logs.reduce((sum, log) => sum + (log.bowls_smoked || 0), 0);
  const breakInBowls = logs.filter(l => l.is_break_in).reduce((sum, log) => sum + (log.bowls_smoked || 0), 0);

  return (
    <>
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Flame className="w-5 h-5" />
                Smoking Log
              </CardTitle>
              <p className="text-sm text-stone-600 mt-1">
                {totalBowls} total bowls ({breakInBowls} break-in)
              </p>
            </div>
            <Button
              onClick={() => setShowAddLog(true)}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Session
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-8">
              No smoking sessions logged yet. Start tracking your sessions!
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-white border border-stone-200 hover:border-orange-300 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-stone-800">{log.pipe_name}</p>
                      <span className="text-stone-400">+</span>
                      <p className="font-medium text-stone-800">{log.blend_name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(log.date), 'MMM d, yyyy')}
                      <span>•</span>
                      <span>{log.bowls_smoked} bowl{log.bowls_smoked > 1 ? 's' : ''}</span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-stone-600 mt-1">{log.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {log.is_break_in && (
                      <Badge className="bg-violet-100 text-violet-800 border-violet-200 shrink-0">
                        Break-In
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingLog(log)}
                    >
                      <Edit className="w-4 h-4 text-stone-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={showAddLog} onOpenChange={(open) => { setShowAddLog(open); if (!open) setEditingLog(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Log Smoking Session</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Pipe</Label>
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

            <div className="space-y-2">
              <Label>Tobacco Blend</Label>
              <Select value={formData.blend_id} onValueChange={(v) => setFormData({ ...formData, blend_id: v })}>
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

            <div className="space-y-2">
              <Label>Number of Bowls</Label>
              <Input
                type="number"
                min="1"
                value={formData.bowls_smoked}
                onChange={(e) => setFormData({ ...formData, bowls_smoked: e.target.value })}
              />
              {formData.pipe_id && formData.bowls_smoked && (
                <p className="text-xs text-stone-500">
                  Est. tobacco usage: ~{estimateTobaccoUsage(pipes.find(p => p.id === formData.pipe_id), parseInt(formData.bowls_smoked) || 1).toFixed(2)} oz
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
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
                <Label>Part of break-in schedule</Label>
              </div>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={autoReduceInventory}
                  onCheckedChange={setAutoReduceInventory}
                />
                <Label className="flex items-center gap-2">
                  Automatically reduce tobacco inventory
                  <Badge className="bg-amber-600 text-white text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
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
                className="flex-1 bg-orange-600 hover:bg-orange-700"
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