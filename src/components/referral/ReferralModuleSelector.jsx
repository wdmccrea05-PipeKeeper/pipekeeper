/**
 * ReferralModuleSelector
 * Shown to free users who have a pending referral-earned access record
 * that requires module selection before access becomes active.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

const MODULES = [
  { key: 'pipekeeper',     label: 'PipeKeeper',     emoji: '🪈', description: 'Pipes & tobacco collection' },
  { key: 'whiskeykeeper',  label: 'WhiskeyKeeper',  emoji: '🥃', description: 'Whiskey bottle collection' },
  { key: 'cigarkeeper',    label: 'CigarKeeper',    emoji: '🍃', description: 'Cigar & humidor management' },
  { key: 'winekeeper',     label: 'WineKeeper',     emoji: '🍷', description: 'Wine cellar management' },
];

export default function ReferralModuleSelector({ accessRecord, onActivated }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const activate = async () => {
    if (!selected || !accessRecord?.id) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('grantReferralEarnedAccess', {
        accessId: accessRecord.id,
        module: selected,
      });
      const data = res?.data;
      if (data?.ok) {
        toast.success(`${MODULES.find(m => m.key === selected)?.label} access activated!`);
        onActivated?.(selected);
      } else {
        toast.error(t("auto.components_referral_ReferralModuleSelector.failed_to_activate_access_1y3wx2"));
      }
    } catch {
      toast.error(t("auto.components_referral_ReferralModuleSelector.failed_to_activate_access_1y3wx2"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[#F5F1E7]">{t("auto.components_referral_ReferralModuleSelector.choose_your_free_module_uy43z1")}</p>
        <p className="text-xs text-[#E0D8C8]/60 mt-1">
          {t("auto.components_referral_ReferralModuleSelector.select_which_module_to_unlock_with_13mr5z")}{' '}
          {accessRecord?.reward_type === 'free_year' ? 'year' : 'month'} of access.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODULES.map(m => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selected === m.key
                ? 'border-[#D4A574] bg-[#D4A574]/10'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
            }`}
          >
            <span className="text-xl">{m.emoji}</span>
            <p className="text-sm font-semibold text-[#F5F1E7] mt-1">{m.label}</p>
            <p className="text-xs text-[#E0D8C8]/50">{m.description}</p>
            {selected === m.key && (
              <CheckCircle className="w-4 h-4 text-[#D4A574] mt-1" />
            )}
          </button>
        ))}
      </div>

      <Button
        onClick={activate}
        disabled={!selected || saving}
        className="w-full"
        style={{ background: '#A35C5C', color: '#fff' }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {saving ? 'Activating…' : `Activate ${selected ? MODULES.find(m => m.key === selected)?.label : 'Module'}`}
      </Button>
    </div>
  );
}