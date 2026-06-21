import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function TastingLogForm({ bottle, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    bottle_id: bottle?.id || '',
    bottle_name: bottle?.name || '',
    tasting_date: new Date().toISOString().split('T')[0],
    notes: '',
    rating: '',
    pairing: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tasting_date: formData.tasting_date
        ? new Date(`${formData.tasting_date}T00:00:00`).toISOString()
        : null,
    });
  };

  return (
    <div
      className="w-full max-w-xl rounded-2xl p-6 space-y-6"
      style={{
        background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.95), rgba(31, 21, 16, 0.98))',
        border: '1px solid rgba(180, 140, 75, 0.25)',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 style={{ color: '#F5F1E7' }} className="text-2xl font-bold">
          {t("auto.components_whiskey_TastingLog.log_tasting_1njc2o")}
        </h2>
        <button onClick={onCancel} className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]">
          <X className="w-5 h-5" />
        </button>
      </div>

      {bottle && (
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'rgba(180, 140, 75, 0.1)',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
        >
          <p className="text-sm text-[#D8C7A6]">{t("auto.components_whiskey_TastingLog.logging_tasting_for_1xkevb")}</p>
          <p style={{ color: '#F5F1E7' }} className="font-semibold">
            {bottle.name}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">{t("auto.components_whiskey_TastingLog.tasting_date_1f4hpj")}</label>
          <Input
            type="date"
            value={formData.tasting_date}
            onChange={(e) => handleChange('tasting_date', e.target.value)}
            required
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
          />
        </div>

        {/* Rating */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">{t("auto.components_whiskey_TastingLog.rating_1_5_1w0652")}</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="5"
            value={formData.rating}
            onChange={(e) => handleChange('rating', e.target.value)}
            placeholder="3.5"
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
          />
        </div>

        {/* Pairing */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">{t("auto.components_whiskey_TastingLog.pairing_1xw1g5")}</label>
          <Input
            value={formData.pairing}
            onChange={(e) => handleChange('pairing', e.target.value)}
            placeholder="e.g., cigars, dark chocolate, steak"
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">{t("auto.components_whiskey_TastingLog.notes_3te9gu")}</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder={t("auto.components_whiskey_TastingLog.describe_your_tasting_experience_1qbbpl")}
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-32"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onCancel}>
            {t("auto.components_whiskey_TastingLog.cancel_1bin7k")}
          </Button>
          <Button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
              color: '#F5F1E7',
            }}
          >
            {t("auto.components_whiskey_TastingLog.log_tasting_1njc2o")}
          </Button>
        </div>
      </form>
    </div>
  );
}