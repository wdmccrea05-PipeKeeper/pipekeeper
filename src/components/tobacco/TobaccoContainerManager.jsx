import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Trash2, Edit2, Archive, Package2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatDate } from '@/components/utils/localeFormatters';

export default function TobaccoContainerManager({ blendId, blendName, user, showOnlyOpen = false }) {
  const { t } = useTranslation();
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
      toast.success(t("containerManager.containerAdded"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TobaccoContainer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tobacco-containers'] });
      resetForm();
      toast.success(t("containerManager.containerUpdated"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TobaccoContainer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tobacco-containers'] });
      toast.success(t("containerManager.containerRemoved"));
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

  const displayedContainers = showOnlyOpen 
    ? containers.filter(c => c.is_open)
    : containers;

  const totalQuantity = displayedContainers.reduce((sum, c) => sum + (c.quantity_grams || 0), 0);
  const totalQuantityOz = (totalQuantity / 28.35).toFixed(2);
  const openContainers = containers.filter(c => c.is_open);
  const openQuantityGrams = openContainers.reduce((sum, c) => sum + (c.quantity_grams || 0), 0);
  const openQuantityOz = (openQuantityGrams / 28.35).toFixed(2);
  const cellaringContainers = containers.filter(c => !c.is_open);
  const cellaringQuantityGrams = cellaringContainers.reduce((sum, c) => sum + (c.quantity_grams || 0), 0);
  const cellaringQuantityOz = (cellaringQuantityGrams / 28.35).toFixed(2);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-stone-800">{t("containerManager.containerTracking")}</h3>
        </div>
        <Button 
          onClick={() => setShowDialog(true)}
          size="sm"
          className="bg-amber-700 hover:bg-amber-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("containerManager.addContainer")}
        </Button>
      </div>
      
      <div className="space-y-4">
        {displayedContainers.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <Package2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {showOnlyOpen ? t("containerManager.noOpenContainers") : t("containerManager.noContainers")}
            </p>
            <p className="text-xs mt-1">
              {showOnlyOpen 
                ? t("containerManager.addOpenTip")
                : t("containerManager.trackTip")}
            </p>
          </div>
        ) : (
          <>
            {!showOnlyOpen && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 mb-1">{t("containerManager.total")}</p>
                  <p className="text-lg font-bold text-amber-900">{totalQuantityOz} {t("common.oz")}</p>
                  <p className="text-xs text-amber-600">{totalQuantity.toFixed(2)}{t("containerManager.g")}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-emerald-700 mb-1">{t("containerManager.open")}</p>
                  <p className="text-lg font-bold text-emerald-900">{openQuantityOz} {t("common.oz")}</p>
                  <p className="text-xs text-emerald-600">{openQuantityGrams.toFixed(2)}{t("containerManager.g")}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 mb-1">{t("containerManager.cellared")}</p>
                  <p className="text-lg font-bold text-blue-900">{cellaringQuantityOz} {t("common.oz")}</p>
                  <p className="text-xs text-blue-600">{cellaringQuantityGrams.toFixed(2)}{t("containerManager.g")}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {displayedContainers.map((container) => (
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
                            {t("containerManager.openBadge")}
                          </>
                        ) : (
                          <>
                            <Archive className="w-3 h-3 mr-1" />
                            {t("containerManager.cellaredBadge")}
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-600 mt-1">
                      {container.quantity_grams.toFixed(2)}{t("containerManager.g")} ({(container.quantity_grams / 28.35).toFixed(2)} {t("common.oz")})
                      {container.created_date && (
                        <span className="text-xs text-stone-400 ml-2">
                          {t("containerManager.added")} {formatDate(new Date(container.created_date), 'short')}
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
                        if (window.confirm(t("containerManager.removeConfirm"))) {
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
            <DialogTitle>{editingContainer ? t("containerManager.edit") : t("containerManager.add")} {t("containerManager.container")}</DialogTitle>
            <DialogDescription>
              {t("containerManager.trackIndividual")} {blendName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="containerName">{t("containerManager.containerName")}</Label>
              <Input
                id="containerName"
                placeholder={t("containerManager.namePlaceholder")}
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">{t("containerManager.quantityGrams")}</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0"
                placeholder={t("containerManager.gramsPlaceholder")}
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value)}
                required
              />
              <p className="text-xs text-stone-500">
                {t("containerManager.conversionTip")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t("containerManager.status")}</Label>
              <Select 
                value={isOpen ? "open" : "cellared"}
                onValueChange={(value) => setIsOpen(value === "open")}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t("containerManager.openRotation")}</SelectItem>
                  <SelectItem value="cellared">{t("containerManager.cellaredAging")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
              <Button 
                type="submit" 
                className="bg-amber-700 hover:bg-amber-800"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingContainer ? t("containerManager.update") : t("containerManager.add")} {t("containerManager.container")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}