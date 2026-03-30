import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FIELD_CONFIG = {
  pipe: [
    { key: "maker", label: "Maker", placeholder: "e.g. Missouri Meerschaum" },
    { key: "name", label: "Model / Name", placeholder: "e.g. Country Gentleman" },
    { key: "shape", label: "Shape (optional)", placeholder: "e.g. Billiard" },
  ],
  blend: [
    { key: "name", label: "Blend Name", placeholder: "e.g. Tombigbee" },
    { key: "manufacturer", label: "Manufacturer", placeholder: "e.g. Cornell & Diehl" },
    { key: "blend_type", label: "Blend Type (optional)", placeholder: "e.g. Burley" },
  ],
  bottle: [
    { key: "name", label: "Bottle Name / Expression", placeholder: "e.g. Eagle Rare 10" },
    { key: "distillery", label: "Distillery / Brand", placeholder: "e.g. Buffalo Trace" },
    { key: "type", label: "Type / Category (optional)", placeholder: "e.g. Bourbon" },
  ],
};

export default function ExternalItemManualEntry({
  itemType,
  initialName = "",
  onCancel,
  onSave,
}) {
  const config = useMemo(() => FIELD_CONFIG[itemType] || [], [itemType]);
  const [values, setValues] = useState(() => {
    const seed = {};
    config.forEach((field) => {
      seed[field.key] = field.key === "name" ? initialName : "";
    });
    seed.notes = "";
    return seed;
  });

  const setField = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const payload = {
      item_type: itemType,
      id: `manual-${itemType}-${Date.now()}`,
      brand_or_maker:
        values.manufacturer || values.distillery || values.maker || "",
      ...values,
    };

    if (!payload.name && itemType === "pipe") {
      payload.name = values.name || values.model || "Unknown Pipe";
    }

    if (!payload.name) return;
    onSave?.(payload);
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        border: "1px solid rgba(180,140,75,0.18)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: "#F5F1E7" }}
      >
        Add Manually
      </p>

      {config.map((field) => (
        <div key={field.key} className="space-y-1">
          <label
            className="text-xs"
            style={{ color: "rgba(224,216,200,0.72)" }}
          >
            {field.label}
          </label>
          <Input
            value={values[field.key] || ""}
            onChange={(e) => setField(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      ))}

      <div className="space-y-1">
        <label
          className="text-xs"
          style={{ color: "rgba(224,216,200,0.72)" }}
        >
          Notes (optional)
        </label>
        <Textarea
          value={values.notes || ""}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Add anything useful to remember this item later..."
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handleSave}
          disabled={!values.name?.trim()}
          style={{ background: "rgba(163,92,92,0.95)", color: "#fff" }}
        >
          Use This Item
        </Button>
      </div>
    </div>
  );
}
