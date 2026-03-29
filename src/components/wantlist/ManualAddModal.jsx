import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ManualAddModal({ isOpen, onClose, onSuccess, initialQuery }) {
  const [formData, setFormData] = useState({
    name: initialQuery || "",
    item_type: "blend",
    category: "wishlist",
    brand: "",
    blend_name: "",
    pipe_model: "",
    pipe_type: "unknown",
    desired_quantity: "",
    quantity_unit: "units",
    target_price: "",
    notes: "",
    source: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    setIsLoading(true);
    try {
      await base44.entities.AcquisitionItem.create({
        ...formData,
        is_manual: true,
        desired_quantity: formData.desired_quantity ? parseFloat(formData.desired_quantity) : null,
        target_price: formData.target_price ? parseFloat(formData.target_price) : null,
      });
      toast.success("Item added to Want List");
      onSuccess?.();
      setFormData({
        name: "",
        item_type: "blend",
        category: "wishlist",
        brand: "",
        blend_name: "",
        pipe_model: "",
        pipe_type: "unknown",
        desired_quantity: "",
        quantity_unit: "units",
        target_price: "",
        notes: "",
        source: "",
      });
    } catch (err) {
      toast.error("Failed to add item");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[rgba(22,17,13,0.96)] border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item Manually</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-[#E0D8C8]">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-2">Item Name *</label>
            <Input
              placeholder="e.g., Custom Estate Pipe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type *</label>
              <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blend">Tobacco Blend</SelectItem>
                  <SelectItem value="tobacco_bulk">Bulk Tobacco</SelectItem>
                  <SelectItem value="tobacco_tin">Tinned Tobacco</SelectItem>
                  <SelectItem value="pipe">Pipe</SelectItem>
                  <SelectItem value="accessory">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wishlist">Wish List</SelectItem>
                  <SelectItem value="shopping_list">Shopping List</SelectItem>
                  <SelectItem value="restock">Restock</SelectItem>
                  <SelectItem value="tried_not_owned">Tried (Not Owned)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand/Blend/Model */}
          <div>
            <label className="block text-sm font-medium mb-2">Brand / Manufacturer</label>
            <Input
              placeholder="e.g., Peterson, Danish Blend"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>

          {(formData.item_type === "blend" || formData.item_type === "tobacco_bulk" || formData.item_type === "tobacco_tin") && (
            <div>
              <label className="block text-sm font-medium mb-2">Blend Name</label>
              <Input
                placeholder="e.g., Coniston Cut Plug"
                value={formData.blend_name}
                onChange={(e) => setFormData({ ...formData, blend_name: e.target.value })}
              />
            </div>
          )}

          {formData.item_type === "pipe" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Pipe Model / Shape</label>
                <Input
                  placeholder="e.g., Billiard, Dublin"
                  value={formData.pipe_model}
                  onChange={(e) => setFormData({ ...formData, pipe_model: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Pipe Type</label>
                <Select value={formData.pipe_type} onValueChange={(v) => setFormData({ ...formData, pipe_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_production">New Production</SelectItem>
                    <SelectItem value="estate">Estate</SelectItem>
                    <SelectItem value="artisan_custom">Artisan / Custom</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Desired Qty</label>
              <Input
                type="number"
                placeholder="e.g., 2"
                value={formData.desired_quantity}
                onChange={(e) => setFormData({ ...formData, desired_quantity: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Unit</label>
              <Select value={formData.quantity_unit} onValueChange={(v) => setFormData({ ...formData, quantity_unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="oz">Ounces</SelectItem>
                  <SelectItem value="grams">Grams</SelectItem>
                  <SelectItem value="tins">Tins</SelectItem>
                  <SelectItem value="pouches">Pouches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Price ($)</label>
            <Input
              type="number"
              placeholder="e.g., 25.99"
              step="0.01"
              value={formData.target_price}
              onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
            />
          </div>

          {/* Additional Info */}
          <div>
            <label className="block text-sm font-medium mb-2">Source</label>
            <Input
              placeholder="e.g., Friend's recommendation, seen at tobacconist"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              placeholder="Any additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full p-2 border rounded bg-[rgba(255,255,255,0.05)] border-[#b48c4b]/30 text-[#E0D8C8] placeholder-[#E0D8C8]/40"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !formData.name.trim()}>
              {isLoading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}