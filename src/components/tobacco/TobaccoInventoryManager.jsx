import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";

export default function TobaccoInventoryManager({ blend, onUpdate, isUpdating }) {
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

  return (
    <div className="space-y-4 bg-white rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[#1a2c42]" />
          <h3 className="font-semibold text-[#1a2c42]">Inventory & Status</h3>
        </div>
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={isUpdating}
          className="bg-[#D1A75D] hover:bg-[#D1A75D]/90 text-[#1a2c42] font-semibold"
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <p className="text-sm text-[#1a2c42]/70">
        Track your tobacco across tins, bulk, and pouches. Automatic reductions (e.g., smoking logs) deduct from Open quantities first.
      </p>

      <Tabs defaultValue="tins" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border-b border-[#1a2c42]/20">
          <TabsTrigger value="tins" className="text-[#1a2c42] data-[state=active]:text-[#D1A75D] data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D]">Tins</TabsTrigger>
          <TabsTrigger value="bulk" className="text-[#1a2c42] data-[state=active]:text-[#D1A75D] data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D]">Bulk</TabsTrigger>
          <TabsTrigger value="pouches" className="text-[#1a2c42] data-[state=active]:text-[#D1A75D] data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D]">Pouches</TabsTrigger>
        </TabsList>

        {/* Tins Tab */}
        <TabsContent value="tins" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Tin Size (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_size_oz !== '' ? parseFloat(formData.tin_size_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('tin_size_oz', e.target.value)}
                placeholder="e.g., 1.75"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Total Tins</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_total_tins}
                onChange={(e) => handleChange('tin_total_tins', e.target.value)}
                placeholder="e.g., 5"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Total Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_total_quantity_oz !== '' ? parseFloat(formData.tin_total_quantity_oz).toFixed(2) : ''}
                placeholder="Auto-calculated"
                className="border-[#1a2c42]/20 bg-gray-50 text-[#1a2c42]"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Tins Open</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_tins_open}
                onChange={(e) => handleChange('tin_tins_open', e.target.value)}
                placeholder="e.g., 1"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Tins Cellared</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_tins_cellared}
                onChange={(e) => handleChange('tin_tins_cellared', e.target.value)}
                placeholder="e.g., 4"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Cellared</Label>
              <Input
                type="date"
                value={formData.tin_cellared_date}
                onChange={(e) => handleChange('tin_cellared_date', e.target.value)}
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
          </div>
        </TabsContent>

        {/* Bulk Tab */}
        <TabsContent value="bulk" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Total Bulk Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_total_quantity_oz !== '' ? parseFloat(formData.bulk_total_quantity_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('bulk_total_quantity_oz', e.target.value)}
                placeholder="e.g., 16"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Bulk Open (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_open !== '' ? parseFloat(formData.bulk_open).toFixed(2) : ''}
                onChange={(e) => handleChange('bulk_open', e.target.value)}
                placeholder="e.g., 2"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Bulk Cellared (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_cellared !== '' ? parseFloat(formData.bulk_cellared).toFixed(2) : ''}
                onChange={(e) => handleChange('bulk_cellared', e.target.value)}
                placeholder="e.g., 14"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Date Cellared</Label>
              <Input
                type="date"
                value={formData.bulk_cellared_date}
                onChange={(e) => handleChange('bulk_cellared_date', e.target.value)}
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            </div>
            </TabsContent>

        {/* Pouches Tab */}
        <TabsContent value="pouches" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Pouch Size (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_size_oz !== '' ? parseFloat(formData.pouch_size_oz).toFixed(2) : ''}
                onChange={(e) => handleChange('pouch_size_oz', e.target.value)}
                placeholder="e.g., 1.5"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Total Pouches</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_total_pouches}
                onChange={(e) => handleChange('pouch_total_pouches', e.target.value)}
                placeholder="e.g., 3"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Total Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_total_quantity_oz !== '' ? parseFloat(formData.pouch_total_quantity_oz).toFixed(2) : ''}
                placeholder="Auto-calculated"
                className="border-[#1a2c42]/20 bg-gray-50 text-[#1a2c42]"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Pouches Open</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_pouches_open}
                onChange={(e) => handleChange('pouch_pouches_open', e.target.value)}
                placeholder="e.g., 1"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Pouches Cellared</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_pouches_cellared}
                onChange={(e) => handleChange('pouch_pouches_cellared', e.target.value)}
                placeholder="e.g., 2"
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a2c42] font-semibold">Date Cellared</Label>
              <Input
                type="date"
                value={formData.pouch_cellared_date}
                onChange={(e) => handleChange('pouch_cellared_date', e.target.value)}
                className="border-[#1a2c42]/20 text-[#1a2c42]"
              />
            </div>
            </div>
            </TabsContent>
            </Tabs>
            </div>
  );
}