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
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatWeight } from "@/components/utils/localeFormatters";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { calculateCorrectCellaredValues } from "@/components/utils/cellarReconciliation";
import { detectCellarDrift } from "@/components/utils/tobaccoQuantityHelpers";
import { safeUpdate } from "@/components/utils/safeUpdate";

export default function CellarLog({ blend }) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'added',
    date: new Date().toISOString().split('T')[0],
    amount_oz: '',
    container_type: 'tin',
    removal_destination: 'open_collection',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { user, hasPremium: isPaidUser } = useCurrentUser();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['cellar-logs', blend.id],
    queryFn: async () => {
      const result = await base44.entities.CellarLog.filter(
        { blend_id: blend.id, created_by: user?.email },
        '-date',
        100
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.CellarLog.create(data),
    onSuccess: async () => {
      await syncBlendCellarQuantities();
      
      queryClient.invalidateQueries({ queryKey: ['cellar-logs'] });
      queryClient.invalidateQueries({ queryKey: ['blends'] });
      queryClient.invalidateQueries({ queryKey: ['tobacco-blends'] });
      queryClient.invalidateQueries({ queryKey: ['blend', blend.id] });
      setDialogOpen(false);
      setFormData({
        transaction_type: 'added',
        date: new Date().toISOString().split('T')[0],
        amount_oz: '',
        container_type: 'tin',
        removal_destination: 'open_collection',
        notes: ''
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id) => base44.entities.CellarLog.delete(id),
    onSuccess: async () => {
      await syncBlendCellarQuantities();
      
      queryClient.invalidateQueries({ queryKey: ['cellar-logs'] });
      queryClient.invalidateQueries({ queryKey: ['blends'] });
      queryClient.invalidateQueries({ queryKey: ['tobacco-blends'] });
      queryClient.invalidateQueries({ queryKey: ['blend', blend.id] });
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
      removal_destination: formData.transaction_type === 'removed' ? formData.removal_destination : undefined,
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

  const syncBlendCellarQuantities = async () => {
    try {
      // Always fetch fresh from DB — the cache may still contain deleted entries
      // or may not yet include newly-created entries at this point.
      const allLogs = await base44.entities.CellarLog.filter({ 
        blend_id: blend.id, 
        created_by: user?.email 
      });

      const correctValues = calculateCorrectCellaredValues(blend, allLogs);

      // Calculate oldest date per container type from 'added' entries
      const datesByContainer = { tin: [], bulk: [], pouch: [] };
      allLogs.forEach(log => {
        if (log.transaction_type === 'added' && log.date) {
          const container = (log.container_type || '').toLowerCase();
          if (container === 'tin') datesByContainer.tin.push(log.date);
          else if (container === 'bulk' || container === 'jar') datesByContainer.bulk.push(log.date);
          else if (container === 'pouch') datesByContainer.pouch.push(log.date);
        }
      });
      const oldestDate = (dates) => dates.length > 0 ? dates.sort()[0] : null;

      const updateData = {
        bulk_cellared: correctValues.bulk_cellared,
        bulk_cellared_date: correctValues.bulk_cellared > 0 ? oldestDate(datesByContainer.bulk) : null,
        tin_tins_cellared: correctValues.tin_tins_cellared,
        tin_cellared_date: correctValues.tin_tins_cellared > 0 ? oldestDate(datesByContainer.tin) : null,
        pouch_pouches_cellared: correctValues.pouch_pouches_cellared,
        pouch_cellared_date: correctValues.pouch_pouches_cellared > 0 ? oldestDate(datesByContainer.pouch) : null,
      };

      await safeUpdate('TobaccoBlend', blend.id, updateData, user?.email);

      // Data integrity check: warn if significant drift remains after sync
      const updatedBlend = { ...blend, ...updateData };
      const drift = detectCellarDrift(updatedBlend, allLogs);
      if (drift.hasDrift) {
        console.warn(`[CellarLog] Cellar quantity mismatch detected for blend ${blend.id}: logs show ${drift.logValue.toFixed(2)} oz but blend fields show ${drift.entityValue.toFixed(2)} oz (${drift.drift.toFixed(2)} oz difference). This may require reconciliation.`);
      }
    } catch (error) {
      console.error('Failed to sync blend cellar quantities:', error);
    }
  };

  if (!isPaidUser) {
    return (
      <UpgradePrompt 
        featureName={t("cellarLog.cellaringLog")}
        description={t("cellarLog.upgradeDesc")}
      />
    );
  }

  const containerLabel = {
    tin: t("cellarLog.containerTin"),
    jar: t("cellarLog.containerJar"),
    pouch: t("cellarLog.containerPouch"),
    bulk: t("cellarLog.containerBulk"),
    other: t("common.other"),
  };

  return (
    <>
      <div className="rounded-lg p-4 space-y-4" style={{
        background: "linear-gradient(145deg, rgba(245,241,231,0.95), rgba(235,228,215,0.95))",
        border: "1px solid rgba(140,105,65,0.25)"
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#3a2a20]" />
            <h3 className="font-semibold text-[#3a2a20]">{t("cellarLog.cellaredTobacco")}</h3>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#A35C5C] hover:bg-[#8B4A4A] text-white font-semibold">
                <Plus className="w-4 h-4 mr-1" />
                {t("cellarLog.addEntry")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("cellarLog.addCellarTransaction")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>{t("cellarLog.transactionType")}</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="added">{t("cellarLog.addedToCellarOption")}</SelectItem>
                      <SelectItem value="removed">{t("cellarLog.removedFromCellarOption")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t("cellarLog.date")}</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>{t("cellarLog.amountOz")}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.amount_oz}
                    onChange={(e) => setFormData({ ...formData, amount_oz: e.target.value })}
                    placeholder={t("cellarLog.amountPlaceholder")}
                    required
                  />
                </div>

                <div>
                  <Label>{t("cellarLog.containerType")}</Label>
                  <Select
                    value={formData.container_type}
                    onValueChange={(value) => setFormData({ ...formData, container_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tin">{t("cellarLog.containerTin")}</SelectItem>
                      <SelectItem value="jar">{t("cellarLog.containerJar")}</SelectItem>
                      <SelectItem value="pouch">{t("cellarLog.containerPouch")}</SelectItem>
                      <SelectItem value="bulk">{t("cellarLog.containerBulk")}</SelectItem>
                      <SelectItem value="other">{t("common.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.transaction_type === 'removed' && (
                  <div>
                    <Label>{t("cellarLog.destination")}</Label>
                    <Select
                      value={formData.removal_destination}
                      onValueChange={(value) => setFormData({ ...formData, removal_destination: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open_collection">{t("cellarLog.movedToOpenCollection")}</SelectItem>
                        <SelectItem value="exchanged">{t("cellarLog.exchanged")}</SelectItem>
                        <SelectItem value="discarded">{t("cellarLog.discarded")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>{t("cellarLog.notesOptional")}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t("cellarLog.notesPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={createLogMutation.isPending}>
                    {createLogMutation.isPending ? t("cellarLog.saving") : t("cellarLog.saveEntry")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
      </div>

      <div>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ArrowDownToLine className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="text-xs text-green-700 font-medium truncate">{t("cellarLog.added")}</span>
          </div>
          <p className="text-base font-bold text-[#3a2a20] leading-tight">{formatWeight(totalAdded)}</p>
        </div>

        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ArrowUpFromLine className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="text-xs text-red-700 font-medium truncate">{t("cellarLog.removed")}</span>
          </div>
          <p className="text-base font-bold text-[#1a2c42] leading-tight">{formatWeight(totalRemoved)}</p>
        </div>

        <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 font-medium truncate">{t("cellarLog.net")}</span>
          </div>
          <p className="text-base font-bold text-[#1a2c42] leading-tight">{formatWeight(netCellared)}</p>
        </div>
        </div>

        {/* Log Entries */}
        {isLoading ? (
          <p className="text-sm text-[#3a2a20]/60 text-center py-4">{t("common.loading")}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-[#3a2a20]/60 text-center py-4">
            {t("cellarLog.noTransactionsYet")}
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-[#8b6239]/20 hover:bg-white/10 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  log.transaction_type === 'added' 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-red-500/20 text-red-600'
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
                      <p className="font-semibold text-[#3a2a20]">
                        {log.transaction_type === 'added' ? t("cellarLog.addedToCellar") : t("cellarLog.removedFromCellar")}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className="text-xs bg-white/80 text-[#3a2a20] border-[#8b6239]/20">
                          {log.amount_oz} {t("cellarLog.ozUnit")}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-white/80 text-[#3a2a20] border-[#8b6239]/20">
                          {containerLabel[log.container_type] || log.container_type}
                        </Badge>
                        {log.removal_destination && (
                          <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {log.removal_destination === 'open_collection' && t("cellarLog.toOpen")}
                            {log.removal_destination === 'exchanged' && t("cellarLog.exchanged")}
                            {log.removal_destination === 'discarded' && t("cellarLog.discarded")}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-[#3a2a20]/60">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(t("cellarLog.deleteConfirm"))) {
                          deleteLogMutation.mutate(log.id);
                        }
                      }}
                      className="text-[#3a2a20]/40 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-[#3a2a20]/70 mt-1">{log.notes}</p>
                  )}
                </div>
              </div>
              ))}
              </div>
              )}
              </div>
              </div>
              </>
  );
}