import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Plus, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MaintenanceLog({ pipeId, pipeName }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    maintenance_type: 'cleaning',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    performed_by: 'Self',
  });

  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ['maintenance-logs', pipeId],
    queryFn: () => base44.entities.PipeMaintenanceLog.filter({ pipe_id: pipeId }, '-date'),
  });

  const createLogMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PipeMaintenanceLog.create({
        ...data,
        pipe_id: pipeId,
        pipe_name: pipeName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs', pipeId] });
      queryClient.invalidateQueries({ queryKey: ['pipe', pipeId] });
      setShowDialog(false);
      setFormData({
        maintenance_type: 'cleaning',
        date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
        performed_by: 'Self',
      });
      toast.success('Maintenance log added');
    },
    onError: () => toast.error('Failed to add log'),
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId) => {
      await base44.entities.PipeMaintenanceLog.delete(logId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs', pipeId] });
      toast.success('Log deleted');
    },
    onError: () => toast.error('Failed to delete log'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    };
    createLogMutation.mutate(submitData);
  };

  const maintenanceTypes = {
    cleaning: 'Cleaning',
    restoration: 'Restoration',
    repair: 'Repair',
    reaming: 'Reaming',
    polishing: 'Polishing',
    stem_work: 'Stem Work',
    other: 'Other',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Maintenance Log
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-stone-500 py-8">No maintenance records yet</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border border-stone-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{maintenanceTypes[log.maintenance_type]}</span>
                      <span className="text-xs text-stone-500">
                        {new Date(log.date).toLocaleDateString()}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-sm text-stone-600">{log.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLogMutation.mutate(log.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-500">
                  {log.performed_by && (
                    <span>By: {log.performed_by}</span>
                  )}
                  {log.cost && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {log.cost.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select 
                value={formData.maintenance_type}
                onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(maintenanceTypes).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details of maintenance performed..."
                rows={3}
              />
            </div>

            <div>
              <Label>Performed By</Label>
              <Input
                value={formData.performed_by}
                onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
                placeholder="Self, Professional, etc."
              />
            </div>

            <div>
              <Label>Cost (optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}