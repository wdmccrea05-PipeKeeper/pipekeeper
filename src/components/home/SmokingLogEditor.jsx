import React, { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Loader2, Save, Trash } from "lucide-react";

import { prepareLogData, getBowlsUsed, toLocalDateYmd } from "@/components/utils/schemaCompatibility";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SmokingLogEditor({ log, pipes, blends, onSave, onDelete, onCancel, isLoading }) {
  const { t } = useTranslation();
  if (isAppleBuild) return null;

  const [formData, setFormData] = useState({
     pipe_id: log?.pipe_id || '',
     bowl_variant_id: log?.bowl_variant_id || '',
     blend_id: log?.blend_id || '',
     bowls_smoked: getBowlsUsed(log) || 1,
     is_break_in: log?.is_break_in || false,
     date: log?.date ? toLocalDateYmd(log.date) : toLocalDateYmd(),
     notes: log?.notes || ''
   });

  const selectedPipe = pipes.find(p => p.id === formData.pipe_id);
  const hasMultipleBowls = selectedPipe?.interchangeable_bowls?.length > 0;
  const sortedBlends = useMemo(() => {
    return [...(blends || [])].sort((a, b) => {
      const aName = String(a?.name || '');
      const bName = String(b?.name || '');
      return aName.localeCompare(bName, undefined, { sensitivity: 'base', numeric: true });
    });
  }, [blends]);

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

    const logData = prepareLogData({
      ...formData,
      pipe_name: pipe.name,
      blend_name: blend.name,
      bowl_name: bowl_name,
      date: toLocalDateYmd(formData.date),
      bowls_used: parseInt(formData.bowls_smoked) || 1
    });
    onSave(logData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">{t("smokingLog.pipe")}</Label>
        <Select value={formData.pipe_id} onValueChange={(v) => setFormData({ ...formData, pipe_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder={t("smokingLog.selectPipe")} />
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
          <Label className="text-[#E0D8C8]">{t("smokingLog.bowlUsed")}</Label>
          <Select value={formData.bowl_variant_id} onValueChange={(v) => setFormData({ ...formData, bowl_variant_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder={t("smokingLog.selectBowl")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>{t("smokingLog.noSpecificBowl")}</SelectItem>
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
         <Label className="text-[#E0D8C8]">{t("smokingLog.tobaccoBlend")}</Label>
         <Select value={formData.blend_id} onValueChange={(v) => setFormData({ ...formData, blend_id: v })}>
           <SelectTrigger>
           <SelectValue placeholder={t("smokingLog.selectBlend")} />
           </SelectTrigger>
           <SelectContent>
             {sortedBlends.map(b => (
               <SelectItem key={b.id} value={b.id}>
                 {b.name}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>

      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">{t("smokingLog.numberOfBowls")}</Label>
        <Input
          type="number"
          min="1"
          value={formData.bowls_smoked}
          onChange={(e) => setFormData({ ...formData, bowls_smoked: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">{t("smokingLog.date")}</Label>
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
        <Label className="text-[#E0D8C8]">{t("smokingLog.partOfBreakIn")}</Label>
      </div>

      <div className="space-y-2">
        <Label className="text-[#E0D8C8]">{t("smokingLog.notes")}</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t("smokingLog.notesPlaceholder")}
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
            {t("common.delete")}
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t("common.cancel")}
        </Button>
        <Button 
          type="submit" 
          disabled={!formData.pipe_id || !formData.blend_id || isLoading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {t("smokingLog.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
