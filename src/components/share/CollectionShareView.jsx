import React from "react";
import { Printer, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

function FieldGrid({ fields }) {
  if (!fields || fields.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {fields.map((field) => (
        <div key={field.key} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(224,216,200,0.55)" }}>
            {field.label}
          </dt>
          <dd className="break-words" style={{ color: "#F5F1E7" }}>
            {Array.isArray(field.value) ? field.value.join(", ") : String(field.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ShareItem({ item }) {
  return (
    <article
      className="rounded-2xl overflow-hidden break-words"
      style={{ background: "rgba(42,31,24,0.9)", border: "1px solid rgba(180,140,75,0.25)" }}
    >
      {item.photos?.length > 0 && (
        <div className="grid grid-cols-2 gap-[1px]" style={{ background: "rgba(180,140,75,0.15)" }}>
          {item.photos.slice(0, 2).map((photo) => (
            <img
              key={photo}
              src={photo}
              alt={item.title}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold" style={{ color: "#F5F1E7" }}>{item.title}</h3>
          {typeof item.rating === "number" && (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#D4A574" }}>
              <Star className="w-3.5 h-3.5" /> {item.rating}/5
            </span>
          )}
        </div>
        <FieldGrid fields={item.fields} />
        {item.notes && (
          <p className="text-sm italic" style={{ color: "rgba(224,216,200,0.75)" }}>{item.notes}</p>
        )}
        {typeof item.value === "number" && (
          <p className="text-xs" style={{ color: "rgba(224,216,200,0.6)" }}>
            Owner's estimate: {item.value}
          </p>
        )}
        {typeof item.quantity === "number" && (
          <p className="text-xs" style={{ color: "rgba(224,216,200,0.6)" }}>Quantity: {item.quantity}</p>
        )}
      </div>
    </article>
  );
}

export default function CollectionShareView({ payload, showPrint = true }) {
  if (!payload) return null;
  const generated = payload.generated_at ? new Date(payload.generated_at).toLocaleString() : "";

  return (
    <div className="space-y-5">
      <style>{`@media print { .share-no-print { display: none !important; } body { background: #fff !important; } .share-print-surface { background: #fff !important; } }`}</style>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold break-words" style={{ color: "#F5F1E7" }}>{payload.title}</h2>
          <p className="text-sm mt-1" style={{ color: "rgba(224,216,200,0.7)" }}>
            {payload.module_label} · shared by {payload.shared_by}
            {payload.count ? ` · ${payload.count} item${payload.count === 1 ? "" : "s"}` : ""}
          </p>
          {payload.description && (
            <p className="text-sm mt-2 max-w-2xl" style={{ color: "rgba(224,216,200,0.8)" }}>{payload.description}</p>
          )}
        </div>
        {showPrint && (
          <Button
            variant="outline"
            size="sm"
            className="share-no-print"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        )}
      </header>

      {payload.items?.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-sm"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(180,140,75,0.3)", color: "rgba(224,216,200,0.75)" }}
        >
          Nothing is visible in this share yet. The owner may have removed the items or restricted every field.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(payload.items || []).map((item) => <ShareItem key={item.id} item={item} />)}
        </div>
      )}

      <footer className="space-y-2 pt-2 border-t" style={{ borderColor: "rgba(180,140,75,0.2)" }}>
        {(payload.disclosures || []).map((line) => (
          <p key={line} className="text-[11px] leading-relaxed" style={{ color: "rgba(224,216,200,0.55)" }}>
            {line}
          </p>
        ))}
        <p className="text-[11px]" style={{ color: "rgba(224,216,200,0.45)" }}>
          View only · generated {generated}
          {payload.expires_at ? ` · link expires ${new Date(payload.expires_at).toLocaleDateString()}` : ""}
        </p>
      </footer>
    </div>
  );
}