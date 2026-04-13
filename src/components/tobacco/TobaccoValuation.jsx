import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, DollarSign, Info, Sparkles, Loader2, ShieldCheck } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isLegacyPremium } from "@/components/utils/premiumAccess";
import ProUpgradeModal from "@/components/subscription/ProUpgradeModal";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrency } from "@/lib/currency/useCurrency";
import {
  computeBlendReplacementDifficulty,
  computeBlendStrategy,
  BLEND_DIFFICULTY_LABELS,
} from "@/lib/collection/tobaccoSelectors";

const INTERNAL_SOURCE_RE = /^turn\d+(search|fetch|open|view|click)\d+$/i;
const URL_RE = /(https?:\/\/[^\s)]+)/i;
const DOMAIN_RE = /(?:^|\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i;

const CARD_STYLE = {
  background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
  border: "1px solid rgba(140,105,65,0.35)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
};

const INNER_PANEL_STYLE = {
  background: "linear-gradient(145deg, rgba(30,22,17,0.92), rgba(22,17,13,0.92))",
  border: "1px solid rgba(140,105,65,0.24)",
  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
};

function normalizeEvidenceSources(rawSources) {
  if (!Array.isArray(rawSources)) return [];

  const seen = new Set();
  const normalized = [];

  rawSources.forEach((source) => {
    const text = String(source || "").trim();
    if (!text || INTERNAL_SOURCE_RE.test(text)) return;

    const urlMatch = text.match(URL_RE);
    if (urlMatch?.[1]) {
      const href = urlMatch[1].replace(/[),.;]+$/, "");
      if (!seen.has(href)) {
        seen.add(href);
        normalized.push({
          href,
          label: href.match(DOMAIN_RE)?.[1] || href,
        });
      }
      return;
    }

    const domainMatch = text.match(DOMAIN_RE);
    if (domainMatch?.[1]) {
      const domain = domainMatch[1].toLowerCase();
      const href = `https://${domain}`;
      if (!seen.has(href)) {
        seen.add(href);
        normalized.push({ href, label: domain });
      }
    }
  });

  return normalized.slice(0, 6);
}

const DIFFICULTY_COLORS = {
  very_easy: '#4ade80',
  easy:      '#86efac',
  moderate:  '#fbbf24',
  hard:      '#fb923c',
  very_hard: '#f87171',
};

const DIFFICULTY_LEVELS_ORDER = ['very_easy', 'easy', 'moderate', 'hard', 'very_hard'];

function ReplacementDifficultyPanel({ blend }) {
  const difficulty = computeBlendReplacementDifficulty(blend);
  const strategy   = computeBlendStrategy(blend);
  const label      = BLEND_DIFFICULTY_LABELS[difficulty] || difficulty;
  const color      = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.easy;
  const activeIdx  = DIFFICULTY_LEVELS_ORDER.indexOf(difficulty);
  const filledCount = activeIdx === -1 ? 1 : activeIdx + 1;

  return (
    <Card style={{
      background: 'linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))',
      border: '1px solid rgba(140,105,65,0.35)',
      boxShadow: '0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)',
    }}>
      <CardHeader>
        <CardTitle className="text-[#e8d5b7] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          Replacement Difficulty
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 5-segment bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            {DIFFICULTY_LEVELS_ORDER.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-full transition-all"
                style={{
                  background: i < filledCount ? color : 'rgba(255,255,255,0.08)',
                  boxShadow: i < filledCount ? `0 0 6px ${color}55` : 'none',
                }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        </div>

        {/* Strategy block */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.18)' }}
        >
          <p className="text-xs uppercase tracking-widest text-[#e8d5b7]/50 font-semibold">Strategy</p>
          <p className="text-base font-bold" style={{ color: '#e8d5b7' }}>{strategy.label}</p>
          <p className="text-xs text-[#e8d5b7]/60">{strategy.reason}</p>
          <p className="text-sm text-[#e8d5b7]/80">{strategy.guidance}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export { ReplacementDifficultyPanel };

export default function TobaccoValuation({ blend, onUpdate, isUpdating }) {
  const { t } = useTranslation();
  const { subscription, hasPro, hasPremium } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const [showProModal, setShowProModal] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const normalizedSources = normalizeEvidenceSources(blend?.ai_evidence_sources);

  const hasProAccess = hasPro || isLegacyPremium(subscription);

  const handleManualValueChange = (field, value) => {
    if (!hasPremium) {
      setShowProModal(true);
      return;
    }
    onUpdate({ [field]: value });
  };

  const handleAIEstimate = async () => {
    if (!hasProAccess) {
      setShowProModal(true);
      return;
    }

    setEstimating(true);
    try {
      const response = await base44.functions.invoke("estimateTobaccoValues", {
        blend_ids: [blend.id],
      });

      const data = response.data;

      if (data.success && data.results?.length > 0) {
        toast.success(t("tobaccoValuation.aiValuationComplete"));
        onUpdate({ ai_last_updated: new Date().toISOString() });
      } else {
        throw new Error(data.error || "Estimation failed");
      }
    } catch (err) {
      console.error("AI estimation failed:", err);
      toast.error(t("tobaccoValuation.failedToEstimate"));
    } finally {
      setEstimating(false);
    }
  };

  return (
    <>
      <Card style={CARD_STYLE}>
        <CardHeader>
          <CardTitle className="text-[#e8d5b7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              {t("tobaccoValuation.tobaccoValuation")}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-[#e8d5b7] font-medium flex items-center gap-2">
                {t("tobaccoValuation.manualMarketValue")}
                {!hasPremium ? <Lock className="w-3 h-3 text-amber-400" /> : null}
              </Label>

              {!hasPremium ? (
                <Badge variant="outline" className="text-xs bg-amber-900/20 text-amber-200 border-amber-500/30 font-semibold">
                  {t("subscription.premium")}
                </Badge>
              ) : null}
            </div>

            <div className="relative">
              <Input
                type="number"
                step="0.01"
                value={blend?.manual_market_value || ""}
                onChange={(e) => handleManualValueChange("manual_market_value", parseFloat(e.target.value) || null)}
                placeholder={hasPremium ? t("tobaccoValuation.enterValue") : t("tobaccoValuation.upgradeToPremium")}
                disabled={!hasPremium || isUpdating}
              />
              {!hasPremium ? <div className="absolute inset-0 cursor-pointer" onClick={() => setShowProModal(true)} /> : null}
            </div>

            <p className="text-xs text-[#e8d5b7]/50">{t("tobaccoValuation.yourAssessment")}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-[#e8d5b7] font-medium flex items-center gap-2">
                {t("tobaccoValuation.costBasis")}
                {!hasPremium ? <Lock className="w-3 h-3 text-amber-400" /> : null}
              </Label>

              {!hasPremium ? (
                <Badge variant="outline" className="text-xs bg-amber-900/20 text-amber-200 border-amber-500/30 font-semibold">
                  {t("subscription.premium")}
                </Badge>
              ) : null}
            </div>

            <div className="relative">
              <Input
                type="number"
                step="0.01"
                value={blend?.cost_basis || ""}
                onChange={(e) => handleManualValueChange("cost_basis", parseFloat(e.target.value) || null)}
                placeholder={hasPremium ? t("tobaccoValuation.enterCost") : t("tobaccoValuation.upgradeToPremium")}
                disabled={!hasPremium || isUpdating}
              />
              {!hasPremium ? <div className="absolute inset-0 cursor-pointer" onClick={() => setShowProModal(true)} /> : null}
            </div>

            <p className="text-xs text-[#e8d5b7]/50">{t("tobaccoValuation.whatYouPaid")}</p>
          </div>

          <div className="border-t border-[#e8d5b7]/10 pt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <Label className="text-[#e8d5b7] font-medium flex items-center gap-2">
                  {t("tobaccoValuation.aiAssistedValuation")}
                  {!hasProAccess ? <Lock className="w-3 h-3 text-amber-400" /> : null}
                </Label>
              </div>

              {!hasProAccess ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">
                  {t("subscription.pro")}
                </Badge>
              ) : null}
            </div>

            <Button
              onClick={handleAIEstimate}
              disabled={!hasProAccess || estimating || isUpdating}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50"
            >
              {!hasProAccess ? <Lock className="w-4 h-4 mr-2" /> : null}
              {estimating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {estimating
                ? t("tobaccoValuation.estimating")
                : hasProAccess
                ? t("tobaccoValuation.runAIValuation")
                : t("tobaccoValuation.upgradeToPro")}
            </Button>

            {blend?.ai_estimated_value ? (
              <div className="space-y-4 rounded-lg p-4" style={INNER_PANEL_STYLE}>
                <div>
                  <p className="text-xs text-[#e8d5b7]/50 mb-1">{t("tobaccoValuation.estimatedValuePerOz")}</p>
                  <p className="text-2xl font-bold text-[#e8d5b7]">{formatFromBase(blend.ai_estimated_value)}</p>
                  <p className="text-xs text-[#e8d5b7]/40 mt-1">{t("tobaccoValuation.aiAssistedEstimate")}</p>
                </div>

                {blend.ai_value_range_low && blend.ai_value_range_high && hasProAccess ? (
                  <div>
                    <p className="text-xs text-[#e8d5b7]/50 mb-1">{t("tobaccoValuation.estimatedRange")}</p>
                    <p className="text-lg text-[#e8d5b7]">
                      {formatFromBase(blend.ai_value_range_low)} - {formatFromBase(blend.ai_value_range_high)}
                    </p>
                  </div>
                ) : null}

                {blend.ai_confidence && hasProAccess ? (
                  <div>
                    <p className="text-xs text-[#e8d5b7]/50 mb-1">{t("tobaccoValuation.confidence")}</p>
                    <Badge
                      className={
                        blend.ai_confidence === "High"
                          ? "bg-emerald-600/20 text-emerald-400"
                          : blend.ai_confidence === "Medium"
                          ? "bg-yellow-600/20 text-yellow-400"
                          : "bg-rose-600/20 text-rose-400"
                      }
                    >
                      {blend.ai_confidence}
                    </Badge>
                  </div>
                ) : null}

                {normalizedSources.length > 0 && hasProAccess ? (
                  <div>
                    <p className="text-xs text-white mb-2">{t("tobaccoValuation.evidenceSources")}</p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {normalizedSources.map((source, idx) => (
                        <a
                          key={`${source.href}-${idx}`}
                          href={source.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex"
                          title={source.href}
                        >
                          <Badge
                            variant="outline"
                            className="text-xs border-[#e8d5b7]/30 text-white bg-black/15 cursor-pointer whitespace-nowrap hover:bg-white/5"
                          >
                            {source.label}
                          </Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {blend.ai_projection_12m || blend.ai_projection_36m ? (
                  hasProAccess ? (
                    <div className="border-t border-[#e8d5b7]/10 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <p className="text-sm font-semibold text-[#e8d5b7]">
                          {t("tobaccoValuation.predictiveValueProjections")}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {blend.ai_projection_12m ? (
                          <div className="rounded-lg p-3 bg-black/15 border border-[rgba(140,105,65,0.22)]">
                            <p className="text-xs text-[#e8d5b7]/50 mb-1">12 {t("tobaccoValuation.months")}</p>
                            <p className="text-lg font-bold text-emerald-400">{formatFromBase(blend.ai_projection_12m)}</p>
                            <p className="text-xs text-[#e8d5b7]/30 mt-1">{t("tobaccoValuation.notGuaranteed")}</p>
                          </div>
                        ) : null}

                        {blend.ai_projection_36m ? (
                          <div className="rounded-lg p-3 bg-black/15 border border-[rgba(140,105,65,0.22)]">
                            <p className="text-xs text-[#e8d5b7]/50 mb-1">36 {t("tobaccoValuation.months")}</p>
                            <p className="text-lg font-bold text-emerald-400">{formatFromBase(blend.ai_projection_36m)}</p>
                            <p className="text-xs text-[#e8d5b7]/30 mt-1">{t("tobaccoValuation.notGuaranteed")}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null
                ) : null}

                {blend.ai_last_updated && hasProAccess ? (
                  <p className="text-xs text-[#e8d5b7]/40 pt-2 border-t border-[#e8d5b7]/10">
                    {t("tobaccoValuation.lastUpdated")} {new Date(blend.ai_last_updated).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!hasProAccess && !blend?.ai_estimated_value ? (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 text-center">
                <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm text-[#e8d5b7]/70">{t("tobaccoValuation.upgradeToUnlockValuation")}</p>
              </div>
            ) : null}

            {!hasProAccess && blend?.ai_estimated_value ? (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#e8d5b7]/70">{t("tobaccoValuation.valuedWithProAccess")}</p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        featureName={t("tobaccoValuation.aiValuationFeatureName")}
      />
    </>
  );
}