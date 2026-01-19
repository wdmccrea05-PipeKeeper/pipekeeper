import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Calendar, Package, Trash2, Crown } from "lucide-react";
import { format } from "date-fns";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";

export default function CellarLog({ blend }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'added',
    date: new Date().toISOString().split('T')[0],
    amount_oz: '',
    container_type: 'tin',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['cellar-logs', blend.id],
    queryFn: async () => {
      const result = await base44.entities.CellarLog.filter(
        { blend_id: blend.id, created_by: user?.email },
        '-date'
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.CellarLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cellar-logs'] });
      queryClient.invalidateQueries({ queryKey: ['blends'] });
      queryClient.invalidateQueries({ queryKey: ['tobacco-blends'] });
      setDialogOpen(false);
      setFormData({
        transaction_type: 'added',
        date: new Date().toISOString().split('T')[0],
        amount_oz: '',
        container_type: 'tin',
        notes: ''
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id) => base44.entities.CellarLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cellar-logs'] });
      queryClient.invalidateQueries({ queryKey: ['blends'] });
      queryClient.invalidateQueries({ queryKey: ['tobacco-blends'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createLogMutation.mutate({
      blend_id: blend.id,
      blend_name: blend.name,
      transaction_type: formData.transaction_type,
      date: formData.date,
      amount_oz: parseFloat(formData.amount_oz),
      container_type: formData.container_type,
      notes: formData.notes,
    });
  };

  const totalAdded = logs
    .filter(l => l.transaction_type === 'added')
    .reduce((sum, l) => sum + (l.amount_oz || 0), 0);

  const totalRemoved = logs
    .filter(l => l.transaction_type === 'removed')
    .reduce((sum, l) => sum + (l.amount_oz || 0), 0);

  const netCellared = totalAdded - totalRemoved;

  const isPaidUser = hasPremiumAccess(user);

  if (!isPaidUser) {
    return (
      <UpgradePrompt 
        featureName="Cellaring Log"
        description="Track detailed cellaring transactions including add/remove dates, amounts in ounces, container types, and notes. View net cellared amounts and full transaction history for each blend."
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-stone-800">Cellaring Log</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-1" />
              Add Entry
            </Button>
          </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Cellar Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Transaction Type</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="added">Added to Cellar</SelectItem>
                      <SelectItem value="removed">Removed from Cellar</SelectItem>
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
                  <Label>Amount (oz)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.amount_oz}
                    onChange={(e) => setFormData({ ...formData, amount_oz: e.target.value })}
                    placeholder="2.0"
                    required
                  />
                </div>

                <div>
                  <Label>Container Type</Label>
                  <Select
                    value={formData.container_type}
                    onValueChange={(value) => setFormData({ ...formData, container_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tin">Tin</SelectItem>
                      <SelectItem value="jar">Jar</SelectItem>
                      <SelectItem value="pouch">Pouch</SelectItem>
                      <SelectItem value="bulk">Bulk</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional details..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLogMutation.isPending}>
                    {createLogMutation.isPending ? 'Saving...' : 'Save Entry'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
      </div>

      <div>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ArrowDownToLine className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Added</span>
            </div>
            <p className="text-lg font-bold text-green-800">{totalAdded.toFixed(1)} oz</p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ArrowUpFromLine className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-700 font-medium">Removed</span>
            </div>
            <p className="text-lg font-bold text-red-800">{totalRemoved.toFixed(1)} oz</p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Package className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Net</span>
            </div>
            <p className="text-lg font-bold text-amber-800">{netCellared.toFixed(1)} oz</p>
          </div>
        </div>

        {/* Log Entries */}
        {isLoading ? (
          <p className="text-sm text-stone-500 text-center py-4">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-4">
            No cellar transactions recorded yet
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  log.transaction_type === 'added' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {log.transaction_type === 'added' ? (
                    <ArrowDownToLine className="w-5 h-5" />
                  ) : (
                    <ArrowUpFromLine className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="font-semibold text-stone-800">
                        {log.transaction_type === 'added' ? 'Added to Cellar' : 'Removed from Cellar'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className="text-xs">
                          {log.amount_oz} oz
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.container_type}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Delete this cellar log entry?')) {
                          deleteLogMutation.mutate(log.id);
                        }
                      }}
                      className="text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-stone-600 mt-1">{log.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}