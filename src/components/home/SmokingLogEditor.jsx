import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Loader2, Save, Trash } from "lucide-react";

export default function SmokingLogEditor({ log, pipes, blends, onSave, onDelete, onCancel, isLoading }) {
  if (isAppleBuild) return null;

  const [formData, setFormData] = useState({
     pipe_id: log?.pipe_id || '',
     bowl_variant_id: log?.bowl_variant_id || '',
     blend_id: log?.blend_id || '',
     bowls_smoked: log?.bowls_smoked || 1,
     is_break_in: log?.is_break_in || false,
     date: log?.date ? (() => {
       try {
         const d = new Date(log.date);
         return Number.isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
       } catch {
         return new Date().toISOString().split('T')[0];
       }
     })() : new Date().toISOString().split('T')[0],
     notes: log?.notes || ''
   });

  const selectedPipe = pipes.find(p => p.id === formData.pipe_id);
  const hasMultipleBowls = selectedPipe?.interchangeable_bowls?.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const pipe = pipes.find(p => p.id === formData.pipe_id);
    const blend = blends.find(b => b.id === formData.blend_id);
    
    if (!pipe || !blend) return;

    let bowl_name = null;
    if (formData.bowl_variant_id && hasMultipleBowls) {
      const bowl = selectedPipe.interchangeable_bowls.find(
        b => (b.bowl_variant_id || `bowl_${selectedPipe.interchangeable_bowls.indexOf(b)}`) === formData.bowl_variant_id
      );
      bowl_name = bowl?.name || null;
    }

    onSave({
      ...formData,
      pipe_name: pipe.name,
      blend_name: blend.name,
      bowl_name: bowl_name,
      date: new Date(formData.date).toISOString(),
      bowls_smoked: parseInt(formData.bowls_smoked) || 1
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">Pipe</Label>
        <Select value={formData.pipe_id} onValueChange={(v) => setFormData({ ...formData, pipe_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select pipe" />
          </SelectTrigger>
          <SelectContent>
            {pipes.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasMultipleBowls && (
        <div className="space-y-2">
          <Label className="text-[#E0D8C8]">Bowl Used (Optional)</Label>
          <Select value={formData.bowl_variant_id} onValueChange={(v) => setFormData({ ...formData, bowl_variant_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select bowl variant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>No specific bowl selected</SelectItem>
              {selectedPipe.interchangeable_bowls.map((bowl, idx) => {
                const bowlId = bowl.bowl_variant_id || `bowl_${idx}`;
                return (
                  <SelectItem key={bowlId} value={bowlId}>
                    {bowl.name || `Bowl ${idx + 1}`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
         <Label className="text-[#E0D8C8]">Tobacco Blend</Label>
         <Select value={formData.blend_id} onValueChange={(v) => setFormData({ ...formData, blend_id: v })}>
           <SelectTrigger>
             <SelectValue placeholder="Select blend" />
           </SelectTrigger>
           <SelectContent>
             {blends.map(b => (
               <SelectItem key={b.id} value={b.id}>
                 {b.name}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>

      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">Number of Bowls</Label>
        <Input
          type="number"
          min="1"
          value={formData.bowls_smoked}
          onChange={(e) => setFormData({ ...formData, bowls_smoked: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_break_in}
          onCheckedChange={(v) => setFormData({ ...formData, is_break_in: v })}
        />
        <Label className="text-[#E0D8C8]">Part of break-in schedule</Label>
      </div>

      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">Notes (Optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="How was the smoke? Any observations..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4 border-t">
        {onDelete && (
          <Button 
            type="button" 
            variant="outline" 
            className="text-rose-600 hover:bg-rose-50"
            onClick={onDelete}
            disabled={isLoading}
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!formData.pipe_id || !formData.blend_id || isLoading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}