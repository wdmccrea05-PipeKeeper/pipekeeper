import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrency } from "@/lib/currency/useCurrency";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png";

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ color: "rgba(180,140,75,0.6)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#E0D8C8", fontWeight: 600, overflowWrap: "break-word", wordBreak: "normal" }}>{value}</p>
    </div>
  );
}

export const PipeShareCard = React.forwardRef(({ pipe }, ref) => {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const photo = pipe?.photos?.[0] || pipe?.primary_photo || pipe?.image;
  return (
    <div ref={ref} className="w-full max-w-sm mx-auto p-8" style={{ background: "linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)", borderRadius: 16, border: "1px solid rgba(180, 140, 75, 0.25)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}>
      <div className="flex items-center justify-between mb-6">
        <img src={LOGO} alt="PipeKeeper" className="h-6 object-contain" />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(180, 140, 75, 0.7)" }}>{t("share.collectorCard", { defaultValue: "Collector Card" })}</span>
      </div>
      {photo ? <div className="mb-6 -mx-8 -mt-2 -mb-4 relative h-64 overflow-hidden rounded-t-lg"><img src={photo} alt={pipe?.name} className="w-full h-full object-cover" /></div> : null}
      <div className="space-y-4">
        <div className="border-b border-[rgba(180,140,75,0.15)] pb-4">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#FFFFFF", overflowWrap: "break-word", wordBreak: "normal", hyphens: "none", lineHeight: 1.1 }}>{pipe?.name}</h2>
          {pipe?.maker ? <p className="text-sm font-semibold" style={{ color: "rgba(224,216,200,0.8)", overflowWrap: "break-word", wordBreak: "normal" }}>{pipe.maker}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Meta label={t("pipes.shape", { defaultValue: "Shape" })} value={pipe?.shape} />
          <Meta label={t("pipes.material", { defaultValue: "Material" })} value={pipe?.bowl_material} />
          <Meta label={t("pipes.bend", { defaultValue: "Bend" })} value={pipe?.bend} />
          <Meta label={t("pipes.size", { defaultValue: "Size" })} value={pipe?.sizeClass} />
          <Meta label={t("pipes.origin", { defaultValue: "Origin" })} value={pipe?.country_of_origin} />
          <Meta label={t("pipes.year", { defaultValue: "Year" })} value={pipe?.year_made} />
          <Meta label={t("pipes.condition", { defaultValue: "Condition" })} value={pipe?.condition} />
          {pipe?.estimated_value ? <Meta label={t("share.value", { defaultValue: "Value" })} value={formatFromBase(pipe.estimated_value)} /> : null}
        </div>
        {pipe?.notes ? <div className="border-t border-[rgba(180,140,75,0.15)] pt-4"><p style={{ color: "rgba(224,216,200,0.8)", fontSize: 13, lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "normal" }}>{String(pipe.notes).slice(0,150)}</p></div> : null}
      </div>
    </div>
  );
});

export const WhiskeyShareCard = React.forwardRef(({ bottle }, ref) => {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const photo = bottle?.photo || bottle?.image || bottle?.image_url;
  return (
    <div ref={ref} className="w-full max-w-sm mx-auto p-8" style={{ background: "linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)", borderRadius: 16, border: "1px solid rgba(180, 140, 75, 0.25)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}>
      <div className="flex items-center justify-between mb-6">
        <img src={LOGO} alt="CollectionKeeper" className="h-6 object-contain" />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(180, 140, 75, 0.7)" }}>{t("share.collectorCard", { defaultValue: "Collector Card" })}</span>
      </div>
      {photo ? <div className="mb-6 -mx-8 -mt-2 -mb-4 relative h-64 overflow-hidden rounded-t-lg bg-black/10"><img src={photo} alt={bottle?.name} className="w-full h-full object-contain p-4" /></div> : null}
      <div className="space-y-4">
        <div className="border-b border-[rgba(180,140,75,0.15)] pb-4">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#FFFFFF", overflowWrap: "break-word", wordBreak: "normal", hyphens: "none", lineHeight: 1.1 }}>{bottle?.name}</h2>
          {bottle?.distillery ? <p className="text-sm font-semibold" style={{ color: "rgba(224,216,200,0.8)", overflowWrap: "break-word", wordBreak: "normal" }}>{bottle.distillery}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Meta label={t("whiskey.type", { defaultValue: "Type" })} value={bottle?.type} />
          <Meta label={t("whiskey.region", { defaultValue: "Region" })} value={bottle?.region} />
          <Meta label={t("whiskey.age", { defaultValue: "Age" })} value={bottle?.age ? `${bottle.age} yr` : null} />
          <Meta label={t("whiskey.abv", { defaultValue: "ABV" })} value={bottle?.abv ? `${bottle.abv}%` : null} />
          <Meta label={t("whiskey.vintage", { defaultValue: "Vintage" })} value={bottle?.vintage} />
          <Meta label={t("whiskey.country", { defaultValue: "Country" })} value={bottle?.country} />
          {bottle?.estimated_value ? <Meta label={t("share.value", { defaultValue: "Value" })} value={formatFromBase(bottle.estimated_value)} /> : null}
          {bottle?.rating ? <Meta label={t("common.rating", { defaultValue: "Rating" })} value={`${bottle.rating}/5`} /> : null}
        </div>
        {bottle?.notes ? <div className="border-t border-[rgba(180,140,75,0.15)] pt-4"><p style={{ color: "rgba(224,216,200,0.8)", fontSize: 13, lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "normal" }}>{String(bottle.notes).slice(0, 150)}</p></div> : null}
      </div>
    </div>
  );
});

export const WineShareCard = React.forwardRef(({ wine }, ref) => {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const photo = wine?.photo || wine?.image || wine?.image_url || wine?.photos?.[0];
  return (
    <div ref={ref} className="w-full max-w-sm mx-auto p-8" style={{ background: "linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)", borderRadius: 16, border: "1px solid rgba(180, 140, 75, 0.25)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}>
      <div className="flex items-center justify-between mb-6">
        <img src={LOGO} alt="CollectionKeeper" className="h-6 object-contain" />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(180, 140, 75, 0.7)" }}>{t("share.collectorCard", { defaultValue: "Collector Card" })}</span>
      </div>
      {photo ? <div className="mb-6 -mx-8 -mt-2 -mb-4 relative h-64 overflow-hidden rounded-t-lg bg-black/10"><img src={photo} alt={wine?.name} className="w-full h-full object-contain p-4" /></div> : null}
      <div className="space-y-4">
        <div className="border-b border-[rgba(180,140,75,0.15)] pb-4">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#FFFFFF", overflowWrap: "break-word", wordBreak: "normal", hyphens: "none", lineHeight: 1.1 }}>{wine?.name}</h2>
          {wine?.producer ? <p className="text-sm font-semibold" style={{ color: "rgba(224,216,200,0.8)", overflowWrap: "break-word", wordBreak: "normal" }}>{wine.producer}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Meta label={t("wine.style", { defaultValue: "Style" })} value={wine?.style} />
          <Meta label={t("wine.region", { defaultValue: "Region" })} value={wine?.region || wine?.appellation} />
          <Meta label={t("wine.vintage", { defaultValue: "Vintage" })} value={wine?.vintage} />
          <Meta label={t("wine.varietal", { defaultValue: "Varietal" })} value={wine?.varietal} />
          <Meta label={t("wine.country", { defaultValue: "Country" })} value={wine?.country || wine?.country_of_origin} />
          {wine?.estimated_value ? <Meta label={t("share.value", { defaultValue: "Value" })} value={formatFromBase(wine.estimated_value)} /> : null}
          {wine?.rating ? <Meta label={t("common.rating", { defaultValue: "Rating" })} value={`${wine.rating}/5`} /> : null}
          {wine?.quantity ? <Meta label={t("share.inventory", { defaultValue: "Inventory" })} value={`${wine.quantity} bottle${wine.quantity === 1 ? '' : 's'}`} /> : null}
        </div>
        {wine?.notes ? <div className="border-t border-[rgba(180,140,75,0.15)] pt-4"><p style={{ color: "rgba(224,216,200,0.8)", fontSize: 13, lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "normal" }}>{String(wine.notes).slice(0, 150)}</p></div> : null}
      </div>
    </div>
  );
});

export const CigarShareCard = React.forwardRef(({ cigar }, ref) => {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const photo = cigar?.photo || cigar?.image || cigar?.image_url || cigar?.photos?.[0];
  return (
    <div ref={ref} className="w-full max-w-sm mx-auto p-8" style={{ background: "linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)", borderRadius: 16, border: "1px solid rgba(180, 140, 75, 0.25)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}>
      <div className="flex items-center justify-between mb-6">
        <img src={LOGO} alt="CollectionKeeper" className="h-6 object-contain" />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(180, 140, 75, 0.7)" }}>{t("share.collectorCard", { defaultValue: "Collector Card" })}</span>
      </div>
      {photo ? <div className="mb-6 -mx-8 -mt-2 -mb-4 relative h-64 overflow-hidden rounded-t-lg bg-black/10"><img src={photo} alt={cigar?.name} className="w-full h-full object-contain p-4" /></div> : null}
      <div className="space-y-4">
        <div className="border-b border-[rgba(180,140,75,0.15)] pb-4">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#FFFFFF", overflowWrap: "break-word", wordBreak: "normal", hyphens: "none", lineHeight: 1.1 }}>{cigar?.name}</h2>
          {cigar?.brand ? <p className="text-sm font-semibold" style={{ color: "rgba(224,216,200,0.8)", overflowWrap: "break-word", wordBreak: "normal" }}>{cigar.brand}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Meta label={t("cigars.line", { defaultValue: "Line" })} value={cigar?.line} />
          <Meta label={t("cigars.vitola", { defaultValue: "Vitola" })} value={cigar?.vitola} />
          <Meta label={t("cigars.wrapper", { defaultValue: "Wrapper" })} value={cigar?.wrapper} />
          <Meta label={t("cigars.origin", { defaultValue: "Origin" })} value={cigar?.country_of_origin} />
          {cigar?.estimated_value ? <Meta label={t("share.value", { defaultValue: "Value" })} value={formatFromBase(cigar.estimated_value)} /> : null}
          {cigar?.rating ? <Meta label={t("common.rating", { defaultValue: "Rating" })} value={`${cigar.rating}/5`} /> : null}
        </div>
        {cigar?.notes ? <div className="border-t border-[rgba(180,140,75,0.15)] pt-4"><p style={{ color: "rgba(224,216,200,0.8)", fontSize: 13, lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "normal" }}>{String(cigar.notes).slice(0, 150)}</p></div> : null}
      </div>
    </div>
  );
});

export const TobaccoShareCard = React.forwardRef(({ tobacco }, ref) => {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const photo = tobacco?.photo || tobacco?.logo || tobacco?.tin_image || tobacco?.brand_logo;
  return (
    <div ref={ref} className="w-full max-w-sm mx-auto p-8" style={{ background: "linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)", borderRadius: 16, border: "1px solid rgba(180, 140, 75, 0.25)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}>
      <div className="flex items-center justify-between mb-6">
        <img src={LOGO} alt="PipeKeeper" className="h-6 object-contain" />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(180, 140, 75, 0.7)" }}>{t("share.collectorCard", { defaultValue: "Collector Card" })}</span>
      </div>
      {photo ? <div className="mb-6 -mx-8 -mt-2 -mb-4 relative h-64 overflow-hidden rounded-t-lg bg-black/10"><img src={photo} alt={tobacco?.name} className="w-full h-full object-contain p-4" /></div> : null}
      <div className="space-y-4">
        <div className="border-b border-[rgba(180,140,75,0.15)] pb-4">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#FFFFFF", overflowWrap: "break-word", wordBreak: "normal", hyphens: "none", lineHeight: 1.1 }}>{tobacco?.name}</h2>
          {tobacco?.manufacturer ? <p className="text-sm font-semibold" style={{ color: "rgba(224,216,200,0.8)", overflowWrap: "break-word", wordBreak: "normal" }}>{tobacco.manufacturer}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Meta label={t("tobaccoExtended.blendType", { defaultValue: "Blend Type" })} value={tobacco?.blend_type} />
          <Meta label={t("tobaccoExtended.cut", { defaultValue: "Cut" })} value={tobacco?.cut} />
          <Meta label={t("tobaccoExtended.strength", { defaultValue: "Strength" })} value={tobacco?.strength} />
          <Meta label={t("tobaccoExtended.roomNote", { defaultValue: "Room Note" })} value={tobacco?.room_note} />
          {tobacco?.estimated_value ? <Meta label={t("share.value", { defaultValue: "Value" })} value={formatFromBase(tobacco.estimated_value)} /> : null}
          {typeof tobacco?.total_quantity_oz === 'number' && tobacco.total_quantity_oz > 0 ? <Meta label={t("share.inventory", { defaultValue: "Inventory" })} value={`${tobacco.total_quantity_oz.toFixed(1)} oz`} /> : null}
        </div>
        {Array.isArray(tobacco?.tobacco_components) && tobacco.tobacco_components.length > 0 ? <div><p style={{ color: "rgba(180,140,75,0.6)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{t("tobaccoExtended.tobaccoComponents", { defaultValue: "Components" })}</p><div className="flex flex-wrap gap-2">{tobacco.tobacco_components.slice(0,5).map((c)=><span key={c} className="px-2 py-1 rounded-full text-[11px]" style={{ background:"rgba(180,140,75,0.12)", border:"1px solid rgba(180,140,75,0.18)", color:"#E0D8C8", overflowWrap:"break-word", wordBreak:"normal" }}>{c}</span>)}</div></div> : null}
        {tobacco?.notes ? <div className="border-t border-[rgba(180,140,75,0.15)] pt-4"><p style={{ color: "rgba(224,216,200,0.8)", fontSize: 13, lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "normal" }}>{String(tobacco.notes).slice(0,150)}</p></div> : null}
      </div>
    </div>
  );
});