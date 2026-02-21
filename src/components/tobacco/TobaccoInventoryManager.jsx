import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Box, Briefcase, Plus, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function TobaccoInventoryManager({ blend, onUpdate, isUpdating }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addingToCellar, setAddingToCellar] = useState(null);

  // Initialize form data from existing blend data, preserving all values
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

  // Update form when blend changes to reflect latest saved data
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

      // Auto-calculate tin total quantity (rounded to 2 decimals)
      if (field === 'tin_size_oz' || field === 'tin_total_tins') {
        if (field === 'tin_size_oz' && value && updated.tin_total_tins) {
          updated.tin_total_quantity_oz = parseFloat((Number(value) * Number(updated.tin_total_tins)).toFixed(2));
        } else if (field === 'tin_total_tins' && value && updated.tin_size_oz) {
          updated.tin_total_quantity_oz = parseFloat((Number(updated.tin_size_oz) * Number(value)).toFixed(2));
        }
      }

      // Auto-calculate pouch total quantity (rounded to 2 decimals)
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
      
      // Calculate actual ounces based on container size
      let totalOunces = parseFloat(amount);
      
      if (type === 'tin' && formData.tin_size_oz) {
        // For tins: multiply number of tins by tin size
        totalOunces = parseFloat(amount) * parseFloat(formData.tin_size_oz);
      } else if (type === 'pouch' && formData.pouch_size_oz) {
        // For pouches: multiply number of pouches by pouch size
        totalOunces = parseFloat(amount) * parseFloat(formData.pouch_size_oz);
      }
      // For bulk, amount is already in ounces
      
      await base44.entities.CellarLog.create({
        blend_id: blend.id,
        blend_name: blend.name,
        transaction_type: 'added',
        date,
        amount_oz: totalOunces,
        container_type: containerType,
        notes: `Added to cellar from inventory`
      });

      // Clear the cellared field
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
    <div className="space-y-4 bg-[#223447] rounded-lg p-4 border border-white/10">
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
        <TabsList className="grid w-full grid-cols-3 bg-[#1A2B3A] border-b border-[#E0D8C8]/20">
          <TabsTrigger value="tins" className="text-[#E0D8C8] data-[state=active]:text-[#D1A75D] data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D] flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Tins</span>
            <span className="sm:hidden">Tins</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="text-[#E0D8C8] data-[state=active]:text-[#D1A75D] data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D] flex items-center gap-1.5">
            <Box className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk</span>
            <span className="sm:hidden">Bulk</span>
          </TabsTrigger>
          <TabsTrigger value="pouches" className="text-[#E0D8C8] data-[state=active]:text-[#D1A75D] data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D] flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">Pouches</span>
            <span className="sm:hidden">Pouches</span>
          </TabsTrigger>
        </TabsList>

        {/* Tins Tab */}
        <TabsContent value="tins" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Tin Size (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_size_oz !== '' ? parseFloat(formData.tin_size_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('tin_size_oz', e.target.value)}
                placeholder="e.g., 1.75"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Total Tins</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_total_tins}
                onChange={(e) => handleChange('tin_total_tins', e.target.value)}
                placeholder="e.g., 5"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Total Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_total_quantity_oz !== '' ? parseFloat(formData.tin_total_quantity_oz).toFixed(2) : ''}
                placeholder="Auto-calculated"
                className="border-[#E0D8C8]/20 bg-[#223447] text-[#E0D8C8]/70"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Tins Open</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_tins_open}
                onChange={(e) => handleChange('tin_tins_open', e.target.value)}
                placeholder="e.g., 1"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Tins to Cellar</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={formData.tin_tins_cellared}
                  onChange={(e) => handleChange('tin_tins_cellared', e.target.value)}
                  placeholder="e.g., 4"
                  className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A] flex-1"
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
              <Label className="text-[#E0D8C8] font-semibold">Date Cellared</Label>
              <Input
                type="date"
                value={formData.tin_cellared_date}
                onChange={(e) => handleChange('tin_cellared_date', e.target.value)}
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
          </div>
        </TabsContent>

        {/* Bulk Tab */}
        <TabsContent value="bulk" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Total Bulk Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_total_quantity_oz !== '' ? parseFloat(formData.bulk_total_quantity_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('bulk_total_quantity_oz', e.target.value)}
                placeholder="e.g., 16"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Bulk Open (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_open !== '' ? parseFloat(formData.bulk_open).toFixed(2) : ''}
                onChange={(e) => handleChange('bulk_open', e.target.value)}
                placeholder="e.g., 2"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Bulk to Cellar (oz)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bulk_cellared !== '' ? parseFloat(formData.bulk_cellared).toFixed(2) : ''}
                  onChange={(e) => handleChange('bulk_cellared', e.target.value)}
                  placeholder="e.g., 14"
                  className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A] flex-1"
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
              <Label className="text-[#E0D8C8] font-semibold">Date Cellared</Label>
              <Input
                type="date"
                value={formData.bulk_cellared_date}
                onChange={(e) => handleChange('bulk_cellared_date', e.target.value)}
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            </div>
            </TabsContent>

        {/* Pouches Tab */}
        <TabsContent value="pouches" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Pouch Size (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_size_oz !== '' ? parseFloat(formData.pouch_size_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('pouch_size_oz', e.target.value)}
                placeholder="e.g., 1.5"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Total Pouches</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_total_pouches}
                onChange={(e) => handleChange('pouch_total_pouches', e.target.value)}
                placeholder="e.g., 3"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Total Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_total_quantity_oz !== '' ? parseFloat(formData.pouch_total_quantity_oz).toFixed(2) : ''}
                placeholder="Auto-calculated"
                className="border-[#E0D8C8]/20 bg-[#223447] text-[#E0D8C8]/70"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Pouches Open</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_pouches_open}
                onChange={(e) => handleChange('pouch_pouches_open', e.target.value)}
                placeholder="e.g., 1"
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E0D8C8] font-semibold">Pouches to Cellar</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={formData.pouch_pouches_cellared}
                  onChange={(e) => handleChange('pouch_pouches_cellared', e.target.value)}
                  placeholder="e.g., 2"
                  className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A] flex-1"
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
              <Label className="text-[#E0D8C8] font-semibold">Date Cellared</Label>
              <Input
                type="date"
                value={formData.pouch_cellared_date}
                onChange={(e) => handleChange('pouch_cellared_date', e.target.value)}
                className="border-[#E0D8C8]/20 text-[#E0D8C8] bg-[#1A2B3A]"
              />
            </div>
            </div>
            </TabsContent>
            </Tabs>
            </div>
  );
}