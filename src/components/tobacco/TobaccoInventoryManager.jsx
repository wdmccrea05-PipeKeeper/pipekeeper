import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";

export default function TobaccoInventoryManager({ blend, onUpdate, isUpdating }) {
  const [formData, setFormData] = useState({
    tin_size_oz: blend.tin_size_oz || '',
    tin_total_tins: blend.tin_total_tins || '',
    tin_total_quantity_oz: blend.tin_total_quantity_oz || '',
    tin_tins_open: blend.tin_tins_open || '',
    tin_tins_cellared: blend.tin_tins_cellared || '',
    tin_cellared_date: blend.tin_cellared_date || '',
    bulk_total_quantity_oz: blend.bulk_total_quantity_oz || '',
    bulk_open: blend.bulk_open || '',
    bulk_cellared: blend.bulk_cellared || '',
    bulk_cellared_date: blend.bulk_cellared_date || '',
    pouch_size_oz: blend.pouch_size_oz || '',
    pouch_total_pouches: blend.pouch_total_pouches || '',
    pouch_total_quantity_oz: blend.pouch_total_quantity_oz || '',
    pouch_pouches_open: blend.pouch_pouches_open || '',
    pouch_pouches_cellared: blend.pouch_pouches_cellared || '',
    pouch_cellared_date: blend.pouch_cellared_date || '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate tin total quantity
      if (field === 'tin_size_oz' || field === 'tin_total_tins') {
        if (field === 'tin_size_oz' && value && updated.tin_total_tins) {
          updated.tin_total_quantity_oz = Number(value) * Number(updated.tin_total_tins);
        } else if (field === 'tin_total_tins' && value && updated.tin_size_oz) {
          updated.tin_total_quantity_oz = Number(updated.tin_size_oz) * Number(value);
        }
      }

      // Auto-calculate pouch total quantity
      if (field === 'pouch_size_oz' || field === 'pouch_total_pouches') {
        if (field === 'pouch_size_oz' && value && updated.pouch_total_pouches) {
          updated.pouch_total_quantity_oz = Number(value) * Number(updated.pouch_total_pouches);
        } else if (field === 'pouch_total_pouches' && value && updated.pouch_size_oz) {
          updated.pouch_total_quantity_oz = Number(updated.pouch_size_oz) * Number(value);
        }
      }

      return updated;
    });
  };

  const handleSave = () => {
    const cleanedData = {
      tin_size_oz: formData.tin_size_oz ? Number(formData.tin_size_oz) : null,
      tin_total_tins: formData.tin_total_tins ? Number(formData.tin_total_tins) : null,
      tin_total_quantity_oz: formData.tin_total_quantity_oz ? Number(formData.tin_total_quantity_oz) : null,
      tin_tins_open: formData.tin_tins_open ? Number(formData.tin_tins_open) : null,
      tin_tins_cellared: formData.tin_tins_cellared ? Number(formData.tin_tins_cellared) : null,
      tin_cellared_date: formData.tin_cellared_date || null,
      bulk_total_quantity_oz: formData.bulk_total_quantity_oz ? Number(formData.bulk_total_quantity_oz) : null,
      bulk_open: formData.bulk_open ? Number(formData.bulk_open) : null,
      bulk_cellared: formData.bulk_cellared ? Number(formData.bulk_cellared) : null,
      bulk_cellared_date: formData.bulk_cellared_date || null,
      pouch_size_oz: formData.pouch_size_oz ? Number(formData.pouch_size_oz) : null,
      pouch_total_pouches: formData.pouch_total_pouches ? Number(formData.pouch_total_pouches) : null,
      pouch_total_quantity_oz: formData.pouch_total_quantity_oz ? Number(formData.pouch_total_quantity_oz) : null,
      pouch_pouches_open: formData.pouch_pouches_open ? Number(formData.pouch_pouches_open) : null,
      pouch_pouches_cellared: formData.pouch_pouches_cellared ? Number(formData.pouch_pouches_cellared) : null,
      pouch_cellared_date: formData.pouch_cellared_date || null,
    };
    onUpdate(cleanedData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-stone-800">Inventory & Status</h3>
        </div>
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={isUpdating}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <p className="text-sm text-stone-500">Track your tobacco across tins, bulk, and pouches</p>

      <Tabs defaultValue="tins" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tins">Tins</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
          <TabsTrigger value="pouches">Pouches</TabsTrigger>
        </TabsList>

        {/* Tins Tab */}
        <TabsContent value="tins" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tin Size (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_size_oz}
                onChange={(e) => handleChange('tin_size_oz', e.target.value)}
                placeholder="e.g., 1.75"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Tins</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_total_tins}
                onChange={(e) => handleChange('tin_total_tins', e.target.value)}
                placeholder="e.g., 5"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.tin_total_quantity_oz}
                placeholder="Auto-calculated"
                className="border-stone-200 bg-stone-50"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Tins Open</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_tins_open}
                onChange={(e) => handleChange('tin_tins_open', e.target.value)}
                placeholder="e.g., 1"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Tins Cellared</Label>
              <Input
                type="number"
                min="0"
                value={formData.tin_tins_cellared}
                onChange={(e) => handleChange('tin_tins_cellared', e.target.value)}
                placeholder="e.g., 4"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Cellared</Label>
              <Input
                type="date"
                value={formData.tin_cellared_date}
                onChange={(e) => handleChange('tin_cellared_date', e.target.value)}
                className="border-stone-200"
              />
            </div>
          </div>
        </TabsContent>

        {/* Bulk Tab */}
        <TabsContent value="bulk" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Bulk Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_total_quantity_oz}
                onChange={(e) => handleChange('bulk_total_quantity_oz', e.target.value)}
                placeholder="e.g., 16"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Bulk Open (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_open}
                onChange={(e) => handleChange('bulk_open', e.target.value)}
                placeholder="e.g., 2"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Bulk Cellared (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.bulk_cellared}
                onChange={(e) => handleChange('bulk_cellared', e.target.value)}
                placeholder="e.g., 14"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Cellared</Label>
              <Input
                type="date"
                value={formData.bulk_cellared_date}
                onChange={(e) => handleChange('bulk_cellared_date', e.target.value)}
                className="border-stone-200"
              />
            </div>
          </div>
        </TabsContent>

        {/* Pouches Tab */}
        <TabsContent value="pouches" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pouch Size (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_size_oz}
                onChange={(e) => handleChange('pouch_size_oz', e.target.value)}
                placeholder="e.g., 1.5"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Pouches</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_total_pouches}
                onChange={(e) => handleChange('pouch_total_pouches', e.target.value)}
                placeholder="e.g., 3"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Quantity (oz)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pouch_total_quantity_oz}
                placeholder="Auto-calculated"
                className="border-stone-200 bg-stone-50"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Pouches Open</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_pouches_open}
                onChange={(e) => handleChange('pouch_pouches_open', e.target.value)}
                placeholder="e.g., 1"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Pouches Cellared</Label>
              <Input
                type="number"
                min="0"
                value={formData.pouch_pouches_cellared}
                onChange={(e) => handleChange('pouch_pouches_cellared', e.target.value)}
                placeholder="e.g., 2"
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Cellared</Label>
              <Input
                type="date"
                value={formData.pouch_cellared_date}
                onChange={(e) => handleChange('pouch_cellared_date', e.target.value)}
                className="border-stone-200"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}