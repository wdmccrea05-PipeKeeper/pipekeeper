import React, { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { BLEND_TYPES } from "@/components/tobacco/tobaccoConstants";
import BlendQuickLookup from "./BlendQuickLookup";

const STRENGTH_OPTIONS = ["mild", "mild-medium", "medium", "medium-full", "full"];
const AROMATIC_INTENSITY_OPTIONS = ["light", "medium", "heavy"];
const CUT_OPTIONS = ["ribbon", "cube cut", "flake", "crumble cake", "plug", "rope", "shag", "broken flake", "other"];

/**
 * ClubBlendEntry — quick-entry form for a new/unowned tobacco blend at a club session.
 *
 * Attempts AI enrichment after name + manufacturer are entered.
 * Fields are populated from enrichment; user can adjust any field.
 * The result is a normalized tobacco snapshot — NOT added to owned inventory.
 *
 * Props:
 *   initialData  {object}   - prepopulated fields (from wishlist or prior entry)
 *   onChange     (snapshot) => void   - called whenever any field changes
 */
export default function ClubBlendEntry({ initialData = {}, onChange }) {
  const [form, setForm] = useState({
    name: initialData.name ?? "",
    manufacturer: initialData.manufacturer ?? "",
    blend_type: initialData.blend_type ?? "",
    blend_family: initialData.blend_family ?? "",
    is_aromatic: initialData.is_aromatic ?? null,
    aromatic_intensity: initialData.aromatic_intensity ?? "",
    tobacco_components: initialData.tobacco_components ?? [],
    cut: initialData.cut ?? "",
    strength: initialData.strength ?? "",
    casing: initialData.casing ?? "",
    topping: initialData.topping ?? "",
  });
  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);

  const update = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    onChange?.(next);
  };

  const handleQuickLookupSelect = (blend) => {
    const patch = {
      name: blend.name || form.name,
      manufacturer: blend.manufacturer || form.manufacturer,
      blend_type: blend.blend_type || form.blend_type,
      blend_family: blend.blend_family || form.blend_family,
      is_aromatic: blend.is_aromatic ?? form.is_aromatic,
      aromatic_intensity: blend.aromatic_intensity || form.aromatic_intensity,
      tobacco_components: blend.tobacco_components || form.tobacco_components,
      cut: blend.cut || form.cut,
      strength: blend.strength || form.strength,
      casing: blend.casing || form.casing,
      topping: blend.topping || form.topping,
    };
    update(patch);
    setEnriched(true);
  };

  const handleEnrich = async () => {
    if (!form.name || !form.manufacturer) return;
    setEnriching(true);
    try {
      const prompt = `Identify the tobacco blend "${form.name}" by ${form.manufacturer}.
Return ONLY a JSON object with these fields (use null if unknown):
{
  "blend_type": string or null,
  "blend_family": string or null,
  "is_aromatic": boolean or null,
  "aromatic_intensity": "light"|"medium"|"heavy"|null,
  "tobacco_components": string[] or null,
  "cut": string or null,
  "strength": "mild"|"mild-medium"|"medium"|"medium-full"|"full"|null,
  "casing": string or null,
  "topping": string or null
}
Be conservative — use null rather than guessing.`;

      const response = await base44.ai.generateJson({
        prompt,
        schema: {
          type: "object",
          properties: {
            blend_type: { type: ["string", "null"] },
            blend_family: { type: ["string", "null"] },
            is_aromatic: { type: ["boolean", "null"] },
            aromatic_intensity: { type: ["string", "null"] },
            tobacco_components: { type: ["array", "null"] },
            cut: { type: ["string", "null"] },
            strength: { type: ["string", "null"] },
            casing: { type: ["string", "null"] },
            topping: { type: ["string", "null"] },
          },
        },
      });

      if (response && typeof response === "object") {
        const patch = {};
        const FIELDS = ["blend_type", "blend_family", "is_aromatic", "aromatic_intensity", "tobacco_components", "cut", "strength", "casing", "topping"];
        for (const f of FIELDS) {
          if (response[f] !== undefined) patch[f] = response[f] ?? (f === "tobacco_components" ? [] : "");
        }
        update(patch);
        setEnriched(true);
      }
    } catch {
      // Enrichment failed silently — user can still enter fields manually
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Quick Lookup — search all known blends to pre-fill */}
      <BlendQuickLookup onSelect={handleQuickLookupSelect} />

      {/* Required quick-entry */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-[#D8C7A6]/70">Manufacturer *</label>
          <Input
            value={form.manufacturer}
            onChange={(e) => update({ manufacturer: e.target.value })}
            placeholder="e.g. Cornell & Diehl"
            className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#D8C7A6]/70">Blend Name *</label>
          <Input
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Autumn Evening"
            className="bg-[rgba(255,255,255,0.04)] border-[rgba(180,140,75,0.25)] text-[#F5F1E7] placeholder:text-[#D8C7A6]/40"
          />
        </div>
      </div>

      {/* Enrich button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleEnrich}
        disabled={!form.name || !form.manufacturer || enriching}
        className="w-full gap-2 text-[#D4A574] border-[rgba(180,140,75,0.3)] hover:bg-[rgba(180,140,75,0.1)]"
      >
        {enriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {enriched ? "Re-identify Blend" : "Identify Blend (AI)"}
      </Button>

      {/* Optional enriched fields */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-[#D8C7A6]/70">Blend Type</label>
          <select
            value={form.blend_type ?? ""}
            onChange={(e) => update({ blend_type: e.target.value || null })}
            className="w-full rounded-lg px-2.5 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
          >
            <option value="">Unknown</option>
            {BLEND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#D8C7A6]/70">Cut</label>
          <select
            value={form.cut ?? ""}
            onChange={(e) => update({ cut: e.target.value || null })}
            className="w-full rounded-lg px-2.5 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
          >
            <option value="">Unknown</option>
            {CUT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#D8C7A6]/70">Strength</label>
          <select
            value={form.strength ?? ""}
            onChange={(e) => update({ strength: e.target.value || null })}
            className="w-full rounded-lg px-2.5 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
          >
            <option value="">Unknown</option>
            {STRENGTH_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#D8C7A6]/70">Aromatic Intensity</label>
          <select
            value={form.aromatic_intensity ?? ""}
            onChange={(e) => update({ aromatic_intensity: e.target.value || null })}
            className="w-full rounded-lg px-2.5 py-2 text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(180,140,75,0.25)] text-[#F5F1E7]"
          >
            <option value="">Unknown</option>
            {AROMATIC_INTENSITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Aromatic toggle */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-[#D8C7A6]/70 flex-1">Is Aromatic?</label>
        {[{ label: "Yes", val: true }, { label: "No", val: false }, { label: "Unknown", val: null }].map(({ label, val }) => (
          <button
            key={label}
            type="button"
            onClick={() => update({ is_aromatic: val })}
            className="text-xs px-2.5 py-1 rounded-full transition-colors"
            style={{
              background: form.is_aromatic === val ? "rgba(180,140,75,0.25)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${form.is_aromatic === val ? "rgba(180,140,75,0.4)" : "rgba(180,140,75,0.15)"}`,
              color: form.is_aromatic === val ? "#D4A574" : "rgba(224,216,200,0.6)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}