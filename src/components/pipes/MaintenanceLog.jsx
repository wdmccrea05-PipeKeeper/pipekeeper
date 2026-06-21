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
import { Wrench, Plus, DollarSign, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { parseLocalCalendarDate } from '@/components/utils/schemaCompatibility';
import { useCurrency } from '@/lib/currency/useCurrency';

export default function MaintenanceLog({ pipeId, pipeName }) {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
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
      toast.success(t("maintenanceLog.logAdded"));
    },
    onError: () => toast.error(t("maintenanceLog.logAddFailed")),
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId) => {
      await base44.entities.PipeMaintenanceLog.delete(logId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs', pipeId] });
      toast.success(t("maintenanceLog.logDeleted"));
    },
    onError: () => toast.error(t("maintenanceLog.logDeleteFailed")),
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
    cleaning: t("maintenanceLog.cleaning"),
    restoration: t("maintenanceLog.restoration"),
    repair: t("maintenanceLog.repair"),
    reaming: t("maintenanceLog.reaming"),
    polishing: t("maintenanceLog.polishing"),
    stem_work: t("maintenanceLog.stemWork"),
    other: t("maintenanceLog.other"),
  };

  return (
    <Card style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.35)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
    }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
            <Wrench className="w-5 h-5" style={{ color: "rgba(180,140,75,0.9)" }} />
            {t("maintenanceLog.maintenanceLog")}
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} size="sm" style={{
            background: "linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))",
            border: "1px solid rgba(140,105,65,0.4)",
            color: "#E0D8C8"
          }}>
            <Plus className="w-4 h-4 mr-1" />
            {t("maintenanceLog.addEntry")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
         {logs.length === 0 ? (
           <div className="text-center py-8 space-y-2">
             <Wrench className="w-8 h-8 mx-auto" style={{ color: "rgba(140,105,65,0.4)" }} />
             <p style={{ color: "rgba(224,216,200,0.5)" }}>{t("maintenanceLog.noRecordsYet")}</p>
           </div>
         ) : (
           <div className="space-y-3">
             {logs.map((log) => (
               <div key={log.id} className="rounded-lg p-4" style={{
                 background: "rgba(50, 40, 30, 0.3)",
                 border: "1px solid rgba(140, 105, 65, 0.2)"
               }}>
                 <div className="flex items-start justify-between mb-2">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="font-medium" style={{ color: "#E0D8C8" }}>{maintenanceTypes[log.maintenance_type] || log.maintenance_type || 'Unknown'}</span>
                       <span className="text-xs" style={{ color: "rgba(180, 140, 75, 0.8)" }}>
                         {log.date ? parseLocalCalendarDate(log.date).toLocaleDateString() : '—'}
                       </span>
                     </div>
                     {log.description && (
                       <p className="text-sm" style={{ color: "#E0D8C8" }}>{log.description}</p>
                     )}
                   </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLogMutation.mutate(log.id)}
                    style={{ color: "rgba(200,80,80,0.7)" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(180, 140, 75, 0.8)" }}>
                  {log.performed_by && (
                    <span>{t("maintenanceLog.by")} {log.performed_by}</span>
                  )}
                  {log.cost && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatFromBase(Number(log.cost))}
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
            <DialogTitle>{t("maintenanceLog.addMaintenanceEntry")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t("maintenanceLog.type")}</Label>
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
              <Label>{t("maintenanceLog.date")}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>{t("maintenanceLog.description")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("maintenanceLog.descriptionPlaceholder")}
                rows={3}
              />
            </div>

            <div>
              <Label>{t("maintenanceLog.performedBy")}</Label>
              <Input
                value={formData.performed_by}
                onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
                placeholder={t("maintenanceLog.performedByPlaceholder")}
              />
            </div>

            <div>
              <Label>{t("maintenanceLog.costOptional")}</Label>
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
                {t("forms.cancel")}
              </Button>
              <Button type="submit">{t("maintenanceLog.saveEntry")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}