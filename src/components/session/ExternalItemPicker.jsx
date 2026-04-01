import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Barcode, Camera, Loader2, Check, ArrowLeft } from "lucide-react";
import ExternalItemSearch from "@/components/session/ExternalItemSearch";

const FIELD_CONFIG = {
  blend: [
    { key: "name", label: "Blend Name", placeholder: "e.g. Cowboy Coffee" },
    { key: "manufacturer", label: "Manufacturer", placeholder: "e.g. Cornell & Diehl" },
    { key: "blend_type", label: "Blend Type", placeholder: "e.g. Aromatic" },
  ],
  bottle: [
    { key: "name", label: "Bottle / Expression", placeholder: "e.g. Smoke Wagon Bourbon" },
    { key: "distillery", label: "Distillery / Brand", placeholder: "e.g. Smoke Wagon" },
    { key: "type", label: "Type", placeholder: "e.g. Bourbon" },
  ],
  pipe: [
    { key: "maker", label: "Maker", placeholder: "e.g. Boswell" },
    { key: "model", label: "Model / Name", placeholder: "e.g. Jumbo" },
    { key: "shape", label: "Shape", placeholder: "e.g. Billiard" },
  ],
};

const UPC_SCHEMA = {
  blend: {
    type: "object",
    properties: {
      name: { type: "string" },
      manufacturer: { type: "string" },
      blend_type: { type: "string" },
      description: { type: "string" },
    },
  },
  bottle: {
    type: "object",
    properties: {
      name: { type: "string" },
      distillery: { type: "string" },
      type: { type: "string" },
      description: { type: "string" },
    },
  },
};

const PHOTO_SCHEMA = {
  blend: {
    type: "object",
    properties: {
      name: { type: "string" },
      manufacturer: { type: "string" },
      blend_type: { type: "string" },
      description: { type: "string" },
    },
  },
  bottle: {
    type: "object",
    properties: {
      name: { type: "string" },
      distillery: { type: "string" },
      type: { type: "string" },
      description: { type: "string" },
    },
  },
  pipe: {
    type: "object",
    properties: {
      maker: { type: "string" },
      model: { type: "string" },
      shape: { type: "string" },
      description: { type: "string" },
    },
  },
};

function normalizeSearchResult(itemType, item) {
  if (itemType === "blend") return { name: item.name || "", manufacturer: item.manufacturer || "", blend_type: item.blend_type || "" };
  if (itemType === "bottle") return { name: item.name || "", distillery: item.distillery || "", type: item.type || "" };
  return { maker: item.maker || "", model: item.model || item.name || "", shape: item.shape || "" };
}

function getDisplayName(itemType, vals) {
  if (itemType === "blend") return vals.name || "";
  if (itemType === "bottle") return vals.name || "";
  return [vals.maker, vals.model].filter(Boolean).join(" ") || vals.name || "";
}

/**
 * ExternalItemPicker
 * Unified out-of-collection picker with Search, UPC, and Photo tabs.
 * Props:
 *   itemType: "blend" | "bottle" | "pipe"
 *   initialValues: existing external item state (for Back/Next preservation)
 *   onSelect(itemData): called when user confirms an item
 */
export default function ExternalItemPicker({ itemType, initialValues, onSelect }) {
  const fields = FIELD_CONFIG[itemType] || FIELD_CONFIG.blend;
  const hasUPC = itemType === "blend" || itemType === "bottle";
  const hasPhoto = true; // all types support photo identify

  // If initial values already have content, start in edit mode
  const hasInitial = initialValues && Object.values(initialValues).some((v) => v);
  const [tab, setTab] = useState("search");
  const [editValues, setEditValues] = useState(() => initialValues || {});
  const [editing, setEditing] = useState(hasInitial);

  // UPC state
  const [upcCode, setUpcCode] = useState("");
  const [upcLoading, setUpcLoading] = useState(false);
  const [upcError, setUpcError] = useState("");

  // Photo state
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (initialValues && Object.values(initialValues).some((v) => v)) {
      setEditValues(initialValues);
      setEditing(true);
    }
  }, []);

  function handleSearchSelect(item) {
    const normalized = normalizeSearchResult(itemType, item);
    setEditValues(normalized);
    setEditing(true);
  }

  async function handleUPCLookup() {
    const code = upcCode.trim();
    if (!code) return;
    setUpcLoading(true);
    setUpcError("");
    try {
      const productType = itemType === "blend" ? "pipe tobacco blend" : "whiskey or spirits bottle";
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Look up UPC/EAN barcode "${code}" for a ${productType}. Return the product name and details if found, or your best guess based on known products with this code.`,
        add_context_from_internet: true,
        response_json_schema: UPC_SCHEMA[itemType],
        model: "gemini_3_flash",
      });

      if (result?.name) {
        const vals = normalizeSearchResult(itemType, result);
        setEditValues(vals);
        setEditing(true);
      } else {
        setUpcError("No product found for this code. Try searching by name, or add manually below.");
      }
    } catch {
      setUpcError("UPC lookup failed. Try searching by name instead.");
    } finally {
      setUpcLoading(false);
    }
  }

  async function handlePhotoIdentify(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    setPhotoError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const productType =
        itemType === "blend" ? "pipe tobacco blend (tin or pouch label)" :
        itemType === "bottle" ? "whiskey or spirits bottle label" :
        "pipe (maker, model, and shape)";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Identify this ${productType} from the photo. Return the product details you can see or infer.`,
        file_urls: [file_url],
        response_json_schema: PHOTO_SCHEMA[itemType],
      });

      if (result && (result.name || result.maker || result.model)) {
        const vals = normalizeSearchResult(itemType, result);
        setEditValues(vals);
        setEditing(true);
      } else {
        setPhotoError("Could not identify from photo. Please try another image or add manually.");
      }
    } catch {
      setPhotoError("Photo identify failed. Try another image or add manually.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function handleConfirm() {
    const primary = itemType === "pipe" ? (editValues.model || editValues.maker) : editValues.name;
    if (!primary?.trim()) return;
    // Reset editing state so picker doesn't re-show on back/next
    setEditing(false);
    onSelect(editValues);
  }

  const primaryKey = itemType === "pipe" ? "model" : "name";
  const canConfirm = Boolean(editValues[primaryKey]?.trim() || (itemType === "pipe" && editValues.maker?.trim()));

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[rgba(180,140,75,0.22)] bg-[rgba(180,140,75,0.06)] px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wider">Selected Item</p>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs text-[#D4A574]/70 hover:text-[#D4A574] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Change
            </button>
          </div>
          <p className="text-sm font-semibold text-[#F5F1E7]">{getDisplayName(itemType, editValues) || "—"}</p>
        </div>

        <div className="space-y-2 rounded-xl border border-[rgba(180,140,75,0.16)] bg-[rgba(255,255,255,0.03)] p-4">
          <p className="text-xs text-[#D8C7A6]/60 mb-2">Edit before continuing</p>
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs font-medium text-[#E0D8C8]/70">{f.label}</label>
              <input
                value={editValues[f.key] || ""}
                onChange={(e) => setEditValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-lg px-3 py-2 text-sm bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.28)] text-[#F5F1E7] outline-none focus:ring-1 focus:ring-[#A35C5C]"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,rgba(163,92,92,1),rgba(143,72,72,1))" }}
        >
          <Check className="w-4 h-4" /> Use This Item
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === "search" ? "bg-[rgba(180,140,75,0.28)] text-[#F5F1E7] border border-[rgba(180,140,75,0.4)]" : "bg-[rgba(255,255,255,0.04)] text-[#E0D8C8]/60 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)]"}`}
        >
          <Search className="w-3.5 h-3.5" /> Search
        </button>
        {hasUPC && (
          <button
            type="button"
            onClick={() => setTab("upc")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === "upc" ? "bg-[rgba(180,140,75,0.28)] text-[#F5F1E7] border border-[rgba(180,140,75,0.4)]" : "bg-[rgba(255,255,255,0.04)] text-[#E0D8C8]/60 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)]"}`}
          >
            <Barcode className="w-3.5 h-3.5" /> UPC
          </button>
        )}
        {hasPhoto && (
          <button
            type="button"
            onClick={() => setTab("photo")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === "photo" ? "bg-[rgba(180,140,75,0.28)] text-[#F5F1E7] border border-[rgba(180,140,75,0.4)]" : "bg-[rgba(255,255,255,0.04)] text-[#E0D8C8]/60 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)]"}`}
          >
            <Camera className="w-3.5 h-3.5" /> Photo
          </button>
        )}
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <ExternalItemSearch itemType={itemType} onSelect={handleSearchSelect} />
      )}

      {/* UPC tab */}
      {tab === "upc" && hasUPC && (
        <div className="space-y-3">
          <p className="text-xs text-[#D8C7A6]/60">
            Enter or paste a UPC/EAN barcode to identify the {itemType === "blend" ? "tobacco blend" : "whiskey bottle"}.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={upcCode}
              onChange={(e) => setUpcCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUPCLookup()}
              placeholder="e.g. 012345678901"
              className="flex-1 h-9 px-3 rounded-lg bg-[rgba(28,21,16,0.8)] border border-[rgba(140,105,65,0.28)] text-[#F5F1E7] text-sm placeholder:text-[#D8C7A6]/40 focus:outline-none focus:ring-1 focus:ring-[#A35C5C]"
            />
            <button
              type="button"
              onClick={handleUPCLookup}
              disabled={upcLoading || !upcCode.trim()}
              className="px-3 h-9 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center gap-1.5"
              style={{ background: "linear-gradient(135deg,#a35c5c,#8f4e4e)" }}
            >
              {upcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Barcode className="w-4 h-4" /> Look Up</>}
            </button>
          </div>
          {upcError && (
            <p className="text-xs text-[#E07070]">{upcError}</p>
          )}
          <button
            type="button"
            onClick={() => setTab("search")}
            className="text-xs text-[#D4A574]/70 hover:text-[#D4A574] transition-colors"
          >
            → Try searching by name instead
          </button>
        </div>
      )}

      {/* Photo tab */}
      {tab === "photo" && (
        <div className="space-y-3">
          <p className="text-xs text-[#D8C7A6]/60">
            Upload a photo of the {itemType === "blend" ? "tin or pouch label" : itemType === "bottle" ? "bottle or label" : "pipe"} to identify it.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(180,140,75,0.3)] bg-[rgba(255,255,255,0.03)] p-6 cursor-pointer hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            {photoLoading ? (
              <><Loader2 className="w-6 h-6 text-[#D4A574] animate-spin" /><span className="text-xs text-[#E0D8C8]/60">Identifying…</span></>
            ) : (
              <><Camera className="w-6 h-6 text-[#D4A574]/60" /><span className="text-sm text-[#E0D8C8]/70">Tap to upload photo</span><span className="text-xs text-[#E0D8C8]/40">JPG, PNG, HEIC</span></>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoIdentify} disabled={photoLoading} />
          </label>
          {photoError && (
            <p className="text-xs text-[#E07070]">{photoError}</p>
          )}
          <button
            type="button"
            onClick={() => setTab("search")}
            className="text-xs text-[#D4A574]/70 hover:text-[#D4A574] transition-colors"
          >
            → Try searching by name instead
          </button>
        </div>
      )}
    </div>
  );
}