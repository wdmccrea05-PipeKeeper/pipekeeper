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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Flame, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function SmokingLogPanel({ pipes, blends, user }) {
  const [showAddLog, setShowAddLog] = useState(false);
  const [formData, setFormData] = useState({
    pipe_id: '',
    blend_id: '',
    bowls_smoked: 1,
    is_break_in: false,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 50),
    enabled: !!user?.email,
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.SmokingLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smoking-logs'] });
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

    createLogMutation.mutate({
      ...formData,
      pipe_name: pipe.name,
      blend_name: blend.name,
      date: new Date(formData.date).toISOString(),
      bowls_smoked: parseInt(formData.bowls_smoked) || 1,
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
                  className="flex items-start justify-between p-3 rounded-lg bg-white border border-stone-200 hover:border-orange-300 transition-colors"
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
                  {log.is_break_in && (
                    <Badge className="bg-violet-100 text-violet-800 border-violet-200 shrink-0">
                      Break-In
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={showAddLog} onOpenChange={setShowAddLog}>
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
                  {pipes.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_break_in}
                onCheckedChange={(v) => setFormData({ ...formData, is_break_in: v })}
              />
              <Label>Part of break-in schedule</Label>
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
    </>
  );
}