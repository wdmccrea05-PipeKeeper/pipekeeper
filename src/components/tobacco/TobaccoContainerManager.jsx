import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Trash2, Edit2, Archive, Package2 } from "lucide-react";
import { toast } from "sonner";

export default function TobaccoContainerManager({ blendId, blendName, user }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [containerName, setContainerName] = useState('');
  const [quantityGrams, setQuantityGrams] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: containers = [] } = useQuery({
    queryKey: ['tobacco-containers', blendId],
    queryFn: async () => {
      return await base44.entities.TobaccoContainer.filter({ 
        user_email: user?.email,
        blend_id: blendId 
      });
    },
    enabled: !!user?.email && !!blendId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TobaccoContainer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tobacco-containers'] });
      resetForm();
      toast.success('Container added');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TobaccoContainer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tobacco-containers'] });
      resetForm();
      toast.success('Container updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TobaccoContainer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tobacco-containers'] });
      toast.success('Container removed');
    },
  });

  const resetForm = () => {
    setContainerName('');
    setQuantityGrams('');
    setIsOpen(false);
    setEditingContainer(null);
    setShowDialog(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!containerName.trim() || !quantityGrams) return;

    const data = {
      user_email: user.email,
      blend_id: blendId,
      container_name: containerName.trim(),
      quantity_grams: parseFloat(quantityGrams),
      is_open: isOpen,
    };

    if (editingContainer) {
      updateMutation.mutate({ id: editingContainer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (container) => {
    setEditingContainer(container);
    setContainerName(container.container_name);
    setQuantityGrams(container.quantity_grams.toString());
    setIsOpen(container.is_open);
    setShowDialog(true);
  };

  const totalQuantity = containers.reduce((sum, c) => sum + (c.quantity_grams || 0), 0);
  const openContainers = containers.filter(c => c.is_open).length;
  const cellaringContainers = containers.filter(c => !c.is_open).length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-stone-800">Container Tracking</h3>
        </div>
        <Button 
          onClick={() => setShowDialog(true)}
          size="sm"
          className="bg-amber-700 hover:bg-amber-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Container
        </Button>
      </div>
      
      <div className="space-y-4">
        {containers.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <Package2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No containers tracked yet</p>
            <p className="text-xs mt-1">Track individual tins, jars, and bulk quantities</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 mb-1">Total</p>
                <p className="text-lg font-bold text-amber-900">{totalQuantity}g</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 mb-1">Open</p>
                <p className="text-lg font-bold text-emerald-900">{openContainers}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 mb-1">Cellared</p>
                <p className="text-lg font-bold text-blue-900">{cellaringContainers}</p>
              </div>
            </div>

            <div className="space-y-2">
              {containers.map((container) => (
                <div 
                  key={container.id}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200 hover:border-amber-400 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-stone-800">{container.container_name}</h4>
                      <Badge variant={container.is_open ? "default" : "secondary"} className="text-xs">
                        {container.is_open ? (
                          <>
                            <Package className="w-3 h-3 mr-1" />
                            Open
                          </>
                        ) : (
                          <>
                            <Archive className="w-3 h-3 mr-1" />
                            Cellared
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-600 mt-1">
                      {container.quantity_grams}g
                      {container.created_date && (
                        <span className="text-xs text-stone-400 ml-2">
                          Added {new Date(container.created_date).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(container)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm('Remove this container?')) {
                          deleteMutation.mutate(container.id);
                        }
                      }}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContainer ? 'Edit' : 'Add'} Container</DialogTitle>
            <DialogDescription>
              Track individual containers for {blendName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="containerName">Container Name</Label>
              <Input
                id="containerName"
                placeholder="e.g., Tin #1, Mason Jar A, Bulk Pouch"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (grams)</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g., 50"
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value)}
                required
              />
              <p className="text-xs text-stone-500">
                Tip: 1 oz ≈ 28.35g, 50g ≈ 1.76 oz
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={isOpen ? "open" : "cellared"}
                onValueChange={(value) => setIsOpen(value === "open")}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open (in rotation)</SelectItem>
                  <SelectItem value="cellared">Cellared (aging)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-amber-700 hover:bg-amber-800"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingContainer ? 'Update' : 'Add'} Container
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}