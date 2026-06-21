import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all ${
              selected
                ? 'bg-[rgba(180,140,75,0.25)] border-[rgba(180,140,75,0.5)] text-[#F5F1E7]'
                : 'bg-transparent border-[rgba(255,255,255,0.12)] text-[#E0D8C8]/70 hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const CAKE_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'Thin', value: 25 },
  { label: 'Building', value: 50 },
  { label: 'Good', value: 75 },
  { label: 'Heavy', value: 100 },
];

const OXIDATION_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'Light', value: 25 },
  { label: 'Moderate', value: 50 },
  { label: 'Heavy', value: 100 },
];

const WEAR_OPTIONS = [
  { label: 'New', value: 0 },
  { label: 'Light', value: 25 },
  { label: 'Moderate', value: 50 },
  { label: 'Heavy', value: 100 },
];

function snapToNearest(value, options) {
  if (!options || options.length === 0) return value;
  return options.reduce((prev, curr) =>
    (Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev),
    options[0]
  ).value;
}

export default function PipeConditionTracker({ pipe, onUpdate }) {
  const { t } = useTranslation();
  const condition = pipe.condition_tracking || {
    overall_condition: pipe.condition || 'Good',
    cake_level: 50,
    stem_oxidation: 0,
    wear_level: 20,
    last_cleaned: null,
    last_maintenance: null,
  };

  const handleUpdate = (field, value) => {
    onUpdate({
      condition_tracking: {
        ...condition,
        [field]: value,
      }
    });
  };

  const getCakeStatus = () => {
    if (condition.cake_level < 30) return { label: t("conditionTracker.thin"), color: 'text-yellow-600', icon: AlertCircle };
    if (condition.cake_level > 70) return { label: t("conditionTracker.thick"), color: 'text-orange-600', icon: AlertCircle };
    return { label: t("conditionTracker.good"), color: 'text-green-600', icon: CheckCircle };
  };

  const getStemStatus = () => {
    if (condition.stem_oxidation > 60) return { label: t("conditionTracker.heavyOxidation"), color: 'text-red-600', icon: AlertCircle };
    if (condition.stem_oxidation > 30) return { label: t("conditionTracker.moderateOxidation"), color: 'text-yellow-600', icon: AlertCircle };
    return { label: t("conditionTracker.good"), color: 'text-green-600', icon: CheckCircle };
  };

  const cakeStatus = getCakeStatus();
  const stemStatus = getStemStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {t("conditionTracker.conditionTracking")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>{t("conditionTracker.overallCondition")}</Label>
          <Select
            value={condition.overall_condition}
            onValueChange={(value) => handleUpdate('overall_condition', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("conditionTracker.selectCondition")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mint">{t("conditionTracker.conditionMint")}</SelectItem>
              <SelectItem value="Excellent">{t("conditionTracker.conditionExcellent")}</SelectItem>
              <SelectItem value="Very Good">{t("conditionTracker.conditionVeryGood")}</SelectItem>
              <SelectItem value="Good">{t("conditionTracker.conditionGood")}</SelectItem>
              <SelectItem value="Fair">{t("conditionTracker.conditionFair")}</SelectItem>
              <SelectItem value="Poor">{t("conditionTracker.conditionPoor")}</SelectItem>
              <SelectItem value="Estate - Unrestored">{t("conditionTracker.conditionEstateUnrestored")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>{t("conditionTracker.cakeLevel")}</Label>
            <div className="flex items-center gap-2">
              <cakeStatus.icon className={`w-4 h-4 ${cakeStatus.color}`} />
              <Badge variant="outline" className={cakeStatus.color}>
                {cakeStatus.label}
              </Badge>
            </div>
          </div>
          <SegmentedControl
            options={CAKE_OPTIONS}
            value={snapToNearest(condition.cake_level, CAKE_OPTIONS)}
            onChange={(value) => handleUpdate('cake_level', value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>{t("conditionTracker.stemOxidation")}</Label>
            <div className="flex items-center gap-2">
              <stemStatus.icon className={`w-4 h-4 ${stemStatus.color}`} />
              <Badge variant="outline" className={stemStatus.color}>
                {stemStatus.label}
              </Badge>
            </div>
          </div>
          <SegmentedControl
            options={OXIDATION_OPTIONS}
            value={snapToNearest(condition.stem_oxidation, OXIDATION_OPTIONS)}
            onChange={(value) => handleUpdate('stem_oxidation', value)}
          />
        </div>

        <div>
          <Label className="mb-3 block">{t("conditionTracker.generalWear")}</Label>
          <SegmentedControl
            options={WEAR_OPTIONS}
            value={snapToNearest(condition.wear_level, WEAR_OPTIONS)}
            onChange={(value) => handleUpdate('wear_level', value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}