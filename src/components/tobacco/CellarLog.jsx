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
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatWeight } from "@/components/utils/localeFormatters";

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
      const allLogs = await base44.entities.CellarLog.filter({ 
        blend_id: blend.id, 
        created_by: user?.email 
      });
      
      const added = allLogs
        .filter(l => l.transaction_type === 'added')
        .reduce((sum, l) => sum + (l.amount_oz || 0), 0);
      
      const removed = allLogs
        .filter(l => l.transaction_type === 'removed')
        .reduce((sum, l) => sum + (l.amount_oz || 0), 0);
      
      const net = Math.max(0, added - removed);
      
      const addedLogs = allLogs.filter(l => l.transaction_type === 'added' && l.date);
      const oldestDate = addedLogs.length > 0 
        ? addedLogs.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date
        : null;
      
      const updateData = {
        bulk_cellared: net,
        bulk_cellared_date: net > 0 ? oldestDate : null,
        tin_tins_cellared: 0,
        tin_cellared_date: null,
        pouch_pouches_cellared: 0,
        pouch_cellared_date: null,
      };
      
      await base44.entities.TobaccoBlend.update(blend.id, updateData);
    } catch (error) {
      console.error('Failed to sync blend cellar quantities:', error);
    }
  };

  const isPaidUser = hasPremiumAccess(user);

  if (!isPaidUser) {
    return (
      <UpgradePrompt 
        featureName={t("cellarLog.cellaringLog","Cellaring Log")}
        description={t("cellarLog.upgradeDesc","Track detailed cellaring transactions including add/remove dates, amounts in ounces, container types, and notes. View net cellared amounts and full transaction history for each blend.")}
      />
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#1a2c42]" />
            <h3 className="font-semibold text-[#1a2c42]">{t("cellarLog.cellaredTobacco")}</h3>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#D1A75D] hover:bg-[#D1A75D]/90 text-[#1a2c42] font-semibold">
                <Plus className="w-4 h-4 mr-1" />
                {t("cellarLog.addEntry","Add Entry")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("cellarLog.addCellarTransaction")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>{t("cellarLog.transactionType","Transaction Type")}</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="added">{t("cellarLog.addedToCellarOption","Added to Cellar")}</SelectItem>
                      <SelectItem value="removed">{t("cellarLog.removedFromCellarOption","Removed from Cellar")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t("cellarLog.date","Date")}</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>{t("cellarLog.amountOz","Amount (oz)")}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.amount_oz}
                    onChange={(e) => setFormData({ ...formData, amount_oz: e.target.value })}
                    placeholder={t("cellarLog.amountPlaceholder","2.0")}
                    required
                  />
                </div>

                <div>
                  <Label>{t("cellarLog.containerType","Container Type")}</Label>
                  <Select
                    value={formData.container_type}
                    onValueChange={(value) => setFormData({ ...formData, container_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tin">{t("cellarLog.containerTin","Tin")}</SelectItem>
                      <SelectItem value="jar">{t("cellarLog.containerJar","Jar")}</SelectItem>
                      <SelectItem value="pouch">{t("cellarLog.containerPouch","Pouch")}</SelectItem>
                      <SelectItem value="bulk">{t("cellarLog.containerBulk","Bulk")}</SelectItem>
                      <SelectItem value="other">{t("common.other","Other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.transaction_type === 'removed' && (
                  <div>
                    <Label>{t("cellarLog.destination","Destination")}</Label>
                    <Select
                      value={formData.removal_destination}
                      onValueChange={(value) => setFormData({ ...formData, removal_destination: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open_collection">{t("cellarLog.movedToOpenCollection","Moved to Open Collection")}</SelectItem>
                        <SelectItem value="exchanged">{t("cellarLog.exchanged","Exchanged")}</SelectItem>
                        <SelectItem value="discarded">{t("cellarLog.discarded","Discarded")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>{t("cellarLog.notesOptional","Notes (optional)")}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t("cellarLog.notesPlaceholder","Any additional details...")}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={createLogMutation.isPending}>
                    {createLogMutation.isPending ? t("cellarLog.saving","Saving...") : t("cellarLog.saveEntry","Save Entry")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
      </div>

      <div>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ArrowDownToLine className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium">{t("cellarLog.added")}</span>
          </div>
          <p className="text-lg font-bold text-[#1a2c42]">{formatWeight(totalAdded)}</p>
        </div>

        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ArrowUpFromLine className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-700 font-medium">{t("cellarLog.removed")}</span>
          </div>
          <p className="text-lg font-bold text-[#1a2c42]">{formatWeight(totalRemoved)}</p>
        </div>

        <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Package className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">{t("cellarLog.net")}</span>
          </div>
          <p className="text-lg font-bold text-[#1a2c42]">{formatWeight(netCellared)}</p>
        </div>
        </div>

        {/* Log Entries */}
        {isLoading ? (
          <p className="text-sm text-[#1a2c42]/60 text-center py-4">{t("common.loading")}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-[#1a2c42]/60 text-center py-4">
            {t("cellarLog.noTransactionsYet")}
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-[#1a2c42]/20 hover:bg-gray-50 transition-colors"
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
                      <p className="font-semibold text-[#1a2c42]">
                        {log.transaction_type === 'added' ? t("cellarLog.addedToCellar") : t("cellarLog.removedFromCellar")}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className="text-xs bg-gray-100 text-[#1a2c42] border-[#1a2c42]/20">
                          {log.amount_oz} {t("cellarLog.ozUnit","oz")}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-gray-100 text-[#1a2c42] border-[#1a2c42]/20">
                          {log.container_type}
                        </Badge>
                        {log.removal_destination && (
                          <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {log.removal_destination === 'open_collection' && t("cellarLog.toOpen")}
                            {log.removal_destination === 'exchanged' && t("cellarLog.exchanged")}
                            {log.removal_destination === 'discarded' && t("cellarLog.discarded")}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-[#1a2c42]/60">
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
                      className="text-[#1a2c42]/40 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-[#1a2c42]/70 mt-1">{log.notes}</p>
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