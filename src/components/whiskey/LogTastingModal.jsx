import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMPTY_FORM = {
  bottle_id: '',
  bottle_name: '',
  tasting_date: new Date().toISOString().split('T')[0],
  rating: '',
  pairing: '',
  notes: '',
};

export default function LogTastingModal({ isOpen, onClose, bottles = [], user, editLog = null }) {
  const queryClient = useQueryClient();
  const isEditing = !!editLog;

  const [formData, setFormData] = useState(EMPTY_FORM);

  // Hydrate form when editing
  useEffect(() => {
    if (editLog) {
      setFormData({
        bottle_id: editLog.bottle_id || '',
        bottle_name: editLog.bottle_name || '',
        tasting_date: editLog.tasting_date
          ? editLog.tasting_date.slice(0, 10)
          : new Date().toISOString().split('T')[0],
        rating: editLog.rating != null ? String(editLog.rating) : '',
        pairing: editLog.pairing || '',
        notes: editLog.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [editLog, isOpen]);

  const sortedBottles = [...bottles].sort((a, b) =>
    String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TastingLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs'] });
      queryClient.invalidateQueries({ queryKey: ['tasting-logs-summary'] });
      setFormData(EMPTY_FORM);
      onClose();
      toast.success('Tasting logged');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TastingLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasting-logs'] });
      queryClient.invalidateQueries({ queryKey: ['tasting-logs-summary'] });
      onClose();
      toast.success('Tasting updated');
    },
  });

  const handleBottleChange = (id) => {
    const bottle = bottles.find((b) => b.id === id);
    setFormData((prev) => ({ ...prev, bottle_id: id, bottle_name: bottle?.name || '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.bottle_id) {
      toast.error('Please select a bottle');
      return;
    }
    const payload = {
      bottle_id: formData.bottle_id,
      bottle_name: formData.bottle_name,
      tasting_date: new Date(`${formData.tasting_date}T00:00:00`).toISOString(),
      rating: formData.rating ? Number(formData.rating) : null,
      pairing: formData.pairing || null,
      notes: formData.notes || null,
    };

    if (isEditing) {
      updateMutation.mutate({ id: editLog.id, data: payload });
    } else {
      createMutation.mutate({ ...payload, created_by: user?.email });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditing ? 'Edit Tasting' : 'Log Tasting'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">Bottle *</Label>
            <Select value={formData.bottle_id} onValueChange={handleBottleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bottle" />
              </SelectTrigger>
              <SelectContent>
                {sortedBottles.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">Tasting Date *</Label>
            <Input
              type="date"
              value={formData.tasting_date}
              onChange={(e) => setFormData((p) => ({ ...p, tasting_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">Rating (1–5)</Label>
            <Input
              type="number"
              step="0.5"
              min="1"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData((p) => ({ ...p, rating: e.target.value }))}
              placeholder="e.g. 4.5"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">Pairing</Label>
            <Input
              value={formData.pairing}
              onChange={(e) => setFormData((p) => ({ ...p, pairing: e.target.value }))}
              placeholder="e.g. dark chocolate, cigars, cheese"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#E0D8C8]">Tasting Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Describe your tasting experience..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.bottle_id || isPending} className="flex-1">
              {isEditing ? 'Save Changes' : 'Log Tasting'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}