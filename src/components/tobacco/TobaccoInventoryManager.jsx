import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Box, Briefcase, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { calculateCorrectCellaredValues } from "@/components/utils/cellarReconciliation";

export default function TobaccoInventoryManager({ blend, onUpdate, isUpdating }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addingToCellar, setAddingToCellar] = useState(null);

  const [formData, setFormData] = useState({
    tin_size_oz: blend?.tin_size_oz ?? '',
    tin_total_tins: blend?.tin_total_tins ?? '',
    tin_total_quantity_oz: blend?.tin_total_quantity_oz ?? '',
    tin_tins_open: blend?.tin_tins_open ?? '',
    tin_tins_cellared: blend?.tin_tins_cellared ?? '',
    tin_cellared_date: blend?.tin_cellared_date ?? '',
    bulk_total_quantity_oz: blend?.bulk_total_quantity_oz ?? '',
    bulk_open: blend?.bulk_open ?? '',
    bulk_cellared: blend?.bulk_cellared ?? '',
    bulk_cellared_date: blend?.bulk_cellared_date ?? '',
    pouch_size_oz: blend?.pouch_size_oz ?? '',
    pouch_total_pouches: blend?.pouch_total_pouches ?? '',
    pouch_total_quantity_oz: blend?.pouch_total_quantity_oz ?? '',
    pouch_pouches_open: blend?.pouch_pouches_open ?? '',
    pouch_pouches_cellared: blend?.pouch_pouches_cellared ?? '',
    pouch_cellared_date: blend?.pouch_cellared_date ?? '',
  });

  React.useEffect(() => {
    if (blend) {
      setFormData({
        tin_size_oz: blend.tin_size_oz ?? '',
        tin_total_tins: blend.tin_total_tins ?? '',
        tin_total_quantity_oz: blend.tin_total_quantity_oz ?? '',
        tin_tins_open: blend.tin_tins_open ?? '',
        tin_tins_cellared: blend.tin_tins_cellared ?? '',
        tin_cellared_date: blend.tin_cellared_date ?? '',
        bulk_total_quantity_oz: blend.bulk_total_quantity_oz ?? '',
        bulk_open: blend.bulk_open ?? '',
        bulk_cellared: blend.bulk_cellared ?? '',
        bulk_cellared_date: blend.bulk_cellared_date ?? '',
        pouch_size_oz: blend.pouch_size_oz ?? '',
        pouch_total_pouches: blend.pouch_total_pouches ?? '',
        pouch_total_quantity_oz: blend.pouch_total_quantity_oz ?? '',
        pouch_pouches_open: blend.pouch_pouches_open ?? '',
        pouch_pouches_cellared: blend.pouch_pouches_cellared ?? '',
        pouch_cellared_date: blend.pouch_cellared_date ?? '',
      });
    }
  }, [blend]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'tin_size_oz' || field === 'tin_total_tins') {
        if (field === 'tin_size_oz' && value && updated.tin_total_tins) {
          updated.tin_total_quantity_oz = parseFloat((Number(value) * Number(updated.tin_total_tins)).toFixed(2));
        } else if (field === 'tin_total_tins' && value && updated.tin_size_oz) {
          updated.tin_total_quantity_oz = parseFloat((Number(updated.tin_size_oz) * Number(value)).toFixed(2));
        }
      }

      if (field === 'pouch_size_oz' || field === 'pouch_total_pouches') {
        if (field === 'pouch_size_oz' && value && updated.pouch_total_pouches) {
          updated.pouch_total_quantity_oz = parseFloat((Number(value) * Number(updated.pouch_total_pouches)).toFixed(2));
        } else if (field === 'pouch_total_pouches' && value && updated.pouch_size_oz) {
          updated.pouch_total_quantity_oz = parseFloat((Number(updated.pouch_size_oz) * Number(value)).toFixed(2));
        }
      }

      return updated;
    });
  };

  const handleSave = () => {
    const cleanedData = {
      tin_size_oz: formData.tin_size_oz ? parseFloat(Number(formData.tin_size_oz).toFixed(2)) : null,
      tin_total_tins: formData.tin_total_tins ? Number(formData.tin_total_tins) : null,
      tin_total_quantity_oz: formData.tin_total_quantity_oz ? parseFloat(Number(formData.tin_total_quantity_oz).toFixed(2)) : null,
      tin_tins_open: formData.tin_tins_open ? Number(formData.tin_tins_open) : null,
      tin_tins_cellared: formData.tin_tins_cellared ? Number(formData.tin_tins_cellared) : null,
      tin_cellared_date: formData.tin_cellared_date || null,
      bulk_total_quantity_oz: formData.bulk_total_quantity_oz ? parseFloat(Number(formData.bulk_total_quantity_oz).toFixed(2)) : null,
      bulk_open: formData.bulk_open ? parseFloat(Number(formData.bulk_open).toFixed(2)) : null,
      bulk_cellared: formData.bulk_cellared ? parseFloat(Number(formData.bulk_cellared).toFixed(2)) : null,
      bulk_cellared_date: formData.bulk_cellared_date || null,
      pouch_size_oz: formData.pouch_size_oz ? parseFloat(Number(formData.pouch_size_oz).toFixed(2)) : null,
      pouch_total_pouches: formData.pouch_total_pouches ? Number(formData.pouch_total_pouches) : null,
      pouch_total_quantity_oz: formData.pouch_total_quantity_oz ? parseFloat(Number(formData.pouch_total_quantity_oz).toFixed(2)) : null,
      pouch_pouches_open: formData.pouch_pouches_open ? Number(formData.pouch_pouches_open) : null,
      pouch_pouches_cellared: formData.pouch_pouches_cellared ? Number(formData.pouch_pouches_cellared) : null,
      pouch_cellared_date: formData.pouch_cellared_date || null,
    };
    onUpdate(cleanedData);
  };

  const addToCellarLog = async (type, amount, date) => {
    if (!amount || !date || !blend?.id) return;

    setAddingToCellar(type);
    try {
      const containerType = type === 'tin' ? 'tin' : type === 'bulk' ? 'bulk' : 'pouch';
      
      let totalOunces = parseFloat(amount);
      
      if (type === 'tin' && formData.tin_size_oz) {
        totalOunces = parseFloat(amount) * parseFloat(formData.tin_size_oz);
      } else if (type === 'pouch' && formData.pouch_size_oz) {
        totalOunces = parseFloat(amount) * parseFloat(formData.pouch_size_oz);
      }
      
      await base44.entities.CellarLog.create({
        blend_id: blend.id,
        blend_name: blend.name,
        transaction_type: 'added',
        date,
        amount_oz: totalOunces,
        container_type: containerType,
        notes: t("inventory.autoAddedNote")
      });

      const allLogs = await base44.entities.CellarLog.filter({ blend_id: blend.id });
      const correctValues = calculateCorrectCellaredValues(blend, allLogs);
      const datesByContainer = { tin: [], bulk: [], pouch: [] };
      allLogs.forEach(log => {
        if (log.transaction_type === 'added' && log.date) {
          const ct = (log.container_type || '').toLowerCase();
          if (ct === 'tin') datesByContainer.tin.push(log.date);
          else if (ct === 'bulk' || ct === 'jar') datesByContainer.bulk.push(log.date);
          else if (ct === 'pouch') datesByContainer.pouch.push(log.date);
        }
      });
      const oldestDate = (dates) => dates.length > 0 ? dates.sort()[0] : null;
      await base44.entities.TobaccoBlend.update(blend.id, {
        bulk_cellared: correctValues.bulk_cellared,
        bulk_cellared_date: correctValues.bulk_cellared > 0 ? oldestDate(datesByContainer.bulk) : null,
        tin_tins_cellared: correctValues.tin_tins_cellared,
        tin_cellared_date: correctValues.tin_tins_cellared > 0 ? oldestDate(datesByContainer.tin) : null,
        pouch_pouches_cellared: correctValues.pouch_pouches_cellared,
        pouch_cellared_date: correctValues.pouch_pouches_cellared > 0 ? oldestDate(datesByContainer.pouch) : null,
      });

      const fieldMap = {
        tin: 'tin_tins_cellared',
        bulk: 'bulk_cellared',
        pouch: 'pouch_pouches_cellared'
      };
      
      const updatedFormData = {
        ...formData,
        [fieldMap[type]]: '',
        [`${type === 'tin' ? 'tin' : type === 'bulk' ? 'bulk' : 'pouch'}_cellared_date`]: ''
      };
      
      setFormData(updatedFormData);
      queryClient.invalidateQueries({ queryKey: ['cellar-logs', blend.id] });
      toast.success(t("inventory.addedToCellar"));
    } catch (err) {
      console.error('Error adding to cellar log:', err);
      toast.error(t("errors.addToCellarFailed"));
    } finally {
      setAddingToCellar(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl p-5" style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.35)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[#E0D8C8]" />
          <h3 className="font-semibold text-[#E0D8C8]">{t("tobaccoExtended.inventoryStatus")}</h3>
        </div>
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={isUpdating}
          className="bg-[#A35C5C] hover:bg-[#8B4A4A] text-white font-semibold"
        >
          {isUpdating ? t("common.saving") : t("inventory.saveChanges")}
        </Button>
      </div>

      <p className="text-sm text-[#E0D8C8]/70">
        {t("inventory.trackDesc")}
      </p>

      <Tabs defaultValue="tins" className="w-full">
        <TabsList className="grid w-full grid-cols-3" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(180,140,75,0.2)" }}>
          <TabsTrigger value="tins" className="flex items-center gap-1.5" style={{ color: "#E0D8C8" }}>
            <Package className="w-4 h-4" />
            <span>{t("units.tinPlural")}</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-1.5" style={{ color: "#E0D8C8" }}>
            <Box className="w-4 h-4" />
            <span>{t("tobaccoExtended.bulk")}</span>
          </TabsTrigger>
          <TabsTrigger value="pouches" className="flex items-center gap-1.5" style={{ color: "#E0D8C8" }}>
            <Briefcase className="w-4 h-4" />
            <span>{t("tobaccoExtended.pouches")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tins Tab */}
        <TabsContent value="tins" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.tinSize")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_size_oz != null && formData.tin_size_oz !== '' ? parseFloat(formData.tin_size_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('tin_size_oz', e.target.value)}
                placeholder={t("inventory.tinSizePlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.totalTins")}</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_total_tins}
                onChange={(e) => handleChange('tin_total_tins', e.target.value)}
                placeholder={t("inventory.totalTinsPlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.totalQuantity")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_total_quantity_oz != null && formData.tin_total_quantity_oz !== '' ? parseFloat(formData.tin_total_quantity_oz).toFixed(2) : ''}
                placeholder={t("tobaccoExtended.autoCalculated")}
                style={{ borderColor: "rgba(140,105,65,0.2)", background: "rgba(255,255,255,0.03)", color: "rgba(224,216,200,0.5)" }}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.tinsOpen")}</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_tins_open}
                onChange={(e) => handleChange('tin_tins_open', e.target.value)}
                placeholder={t("inventory.tinsOpenPlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("inventory.tinsToCellar")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={formData.tin_tins_cellared}
                  onChange={(e) => handleChange('tin_tins_cellared', e.target.value)}
                  placeholder={t("inventory.tinsToCellarPlaceholder")}
                  style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))", flex: 1 }}
                />
                <Button
                  size="sm"
                  onClick={() => addToCellarLog('tin', formData.tin_tins_cellared, formData.tin_cellared_date)}
                  disabled={!formData.tin_tins_cellared || !formData.tin_cellared_date || addingToCellar === 'tin'}
                  className="bg-[#A35C5C] hover:bg-[#8B4A4A] flex-shrink-0"
                >
                  {addingToCellar === 'tin' ? '...' : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.dateCellared")}</Label>
              <Input
                type="date"
                value={formData.tin_cellared_date}
                onChange={(e) => handleChange('tin_cellared_date', e.target.value)}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Bulk Tab */}
        <TabsContent value="bulk" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.bulkTotalQuantity")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_total_quantity_oz != null && formData.bulk_total_quantity_oz !== '' ? parseFloat(formData.bulk_total_quantity_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('bulk_total_quantity_oz', e.target.value)}
                placeholder={t("inventory.bulkTotalPlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.bulkOpen")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_open != null && formData.bulk_open !== '' ? parseFloat(formData.bulk_open).toFixed(2) : ''}
                onChange={(e) => handleChange('bulk_open', e.target.value)}
                placeholder={t("inventory.bulkOpenPlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("inventory.bulkToCellar")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bulk_cellared != null && formData.bulk_cellared !== '' ? parseFloat(formData.bulk_cellared).toFixed(2) : ''}
                  onChange={(e) => handleChange('bulk_cellared', e.target.value)}
                  placeholder={t("inventory.bulkToCellarPlaceholder")}
                  style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))", flex: 1 }}
                />
                <Button
                  size="sm"
                  onClick={() => addToCellarLog('bulk', formData.bulk_cellared, formData.bulk_cellared_date)}
                  disabled={!formData.bulk_cellared || !formData.bulk_cellared_date || addingToCellar === 'bulk'}
                  className="bg-[#A35C5C] hover:bg-[#8B4A4A] flex-shrink-0"
                >
                  {addingToCellar === 'bulk' ? '...' : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.dateCellared")}</Label>
              <Input
                type="date"
                value={formData.bulk_cellared_date}
                onChange={(e) => handleChange('bulk_cellared_date', e.target.value)}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Pouches Tab */}
        <TabsContent value="pouches" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.pouchSize")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_size_oz != null && formData.pouch_size_oz !== '' ? parseFloat(formData.pouch_size_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('pouch_size_oz', e.target.value)}
                placeholder={t("inventory.pouchSizePlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.totalPouches")}</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_total_pouches}
                onChange={(e) => handleChange('pouch_total_pouches', e.target.value)}
                placeholder={t("inventory.totalPouchesPlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.totalQuantity")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_total_quantity_oz != null && formData.pouch_total_quantity_oz !== '' ? parseFloat(formData.pouch_total_quantity_oz).toFixed(2) : ''}
                placeholder={t("tobaccoExtended.autoCalculated")}
                style={{ borderColor: "rgba(140,105,65,0.2)", background: "rgba(255,255,255,0.03)", color: "rgba(224,216,200,0.5)" }}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.pouchesOpen")}</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_pouches_open}
                onChange={(e) => handleChange('pouch_pouches_open', e.target.value)}
                placeholder={t("inventory.pouchesOpenPlaceholder")}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("inventory.pouchesToCellar")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={formData.pouch_pouches_cellared}
                  onChange={(e) => handleChange('pouch_pouches_cellared', e.target.value)}
                  placeholder={t("inventory.pouchesToCellarPlaceholder")}
                  style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))", flex: 1 }}
                />
                <Button
                  size="sm"
                  onClick={() => addToCellarLog('pouch', formData.pouch_pouches_cellared, formData.pouch_cellared_date)}
                  disabled={!formData.pouch_pouches_cellared || !formData.pouch_cellared_date || addingToCellar === 'pouch'}
                  className="bg-[#A35C5C] hover:bg-[#8B4A4A] flex-shrink-0"
                >
                  {addingToCellar === 'pouch' ? '...' : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">{t("tobaccoExtended.dateCellared")}</Label>
              <Input
                type="date"
                value={formData.pouch_cellared_date}
                onChange={(e) => handleChange('pouch_cellared_date', e.target.value)}
                style={{ borderColor: "rgba(140,105,65,0.4)", color: "#E0D8C8", background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))" }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}