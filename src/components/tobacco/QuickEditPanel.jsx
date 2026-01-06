import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

export default function QuickEditPanel({ selectedCount, onUpdate, onCancel, isLoading, selectedBlends }) {
  const [updateFields, setUpdateFields] = useState({
    quantity_owned: '',
    packaging_type: 'none',
    tin_status: 'none',
    is_favorite: 'none',
    rating: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const updateData = {};
    const packagingType = updateFields.packaging_type !== 'none' ? updateFields.packaging_type : null;
    
    if (updateFields.quantity_owned !== '') {
      const quantityToAdd = Number(updateFields.quantity_owned);
      
      if (packagingType) {
        // Update specific packaging type
        if (packagingType === 'tin') {
          updateData.tin_total_tins = quantityToAdd;
        } else if (packagingType === 'bulk') {
          updateData.bulk_total_quantity_oz = quantityToAdd;
        } else if (packagingType === 'pouch') {
          updateData.pouch_total_pouches = quantityToAdd;
        }
      }
    }
    
    if (updateFields.tin_status && updateFields.tin_status !== 'none') {
      updateData.tin_status = updateFields.tin_status;
    }
    if (updateFields.is_favorite !== 'none') {
      updateData.is_favorite = updateFields.is_favorite === 'true';
    }
    if (updateFields.rating !== '') {
      updateData.rating = Math.round(Number(updateFields.rating));
    }

    onUpdate(selectedBlends, updateData);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-4 border-amber-600 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-stone-800">
              Quick Edit {selectedCount} Blend{selectedCount !== 1 ? 's' : ''}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-xs">Add to Quantity</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={updateFields.quantity_owned}
                onChange={(e) => setUpdateFields(prev => ({ ...prev, quantity_owned: e.target.value }))}
                placeholder="e.g., 3"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Packaging Type</Label>
              <Select 
                value={updateFields.packaging_type} 
                onValueChange={(v) => setUpdateFields(prev => ({ ...prev, packaging_type: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Don't update" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't update</SelectItem>
                  <SelectItem value="tin">Tin</SelectItem>
                  <SelectItem value="bulk">Bulk</SelectItem>
                  <SelectItem value="pouch">Pouch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Tin Status</Label>
              <Select 
                value={updateFields.tin_status} 
                onValueChange={(v) => setUpdateFields(prev => ({ ...prev, tin_status: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Don't update" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't update</SelectItem>
                  <SelectItem value="Sealed/Cellared">Sealed/Cellared</SelectItem>
                  <SelectItem value="Opened">Opened</SelectItem>
                  <SelectItem value="Empty">Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Mark as Favorite</Label>
              <Select 
                value={updateFields.is_favorite} 
                onValueChange={(v) => setUpdateFields(prev => ({ ...prev, is_favorite: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Don't update" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't update</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Rating (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                step="1"
                value={updateFields.rating}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 1 && Number(val) <= 5)) {
                    setUpdateFields(prev => ({ ...prev, rating: val }));
                  }
                }}
                placeholder="Optional"
                className="h-9"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} size="sm">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-amber-700 hover:bg-amber-800"
              size="sm"
            >
              Update {selectedCount} Blend{selectedCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}