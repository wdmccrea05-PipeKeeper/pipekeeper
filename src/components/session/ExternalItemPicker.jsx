import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Barcode, Camera, Loader2, ArrowLeft } from "lucide-react";
import ExternalItemSearch from "@/components/session/ExternalItemSearch";

const UPC_SCHEMA = {
  blend: {
    type: "object",
    properties: {
      name: { type: "string" },
      manufacturer: { type: "string" },
      blend_type: { type: "string" },
    },
  },
  bottle: {
    type: "object",
    properties: {
      name: { type: "string" },
      distillery: { type: "string" },
      type: { type: "string" },
    },
  },
  cigar: {
    type: "object",
    properties: {
      name: { type: "string" },
      brand: { type: "string" },
      line: { type: "string" },
      vitola: { type: "string" },
      wrapper: { type: "string" },
      country_of_origin: { type: "string" },
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
    },
  },
  bottle: {
    type: "object",
    properties: {
      name: { type: "string" },
      distillery: { type: "string" },
      type: { type: "string" },
    },
  },
  pipe: {
    type: "object",
    properties: {
      maker: { type: "string" },
      model: { type: "string" },
      shape: { type: "string" },
    },
  },
  cigar: {
    type: "object",
    properties: {
      brand: { type: "string" },
      name: { type: "string" },
      line: { type: "string" },
      vitola: { type: "string" },
      wrapper: { type: "string" },
      country_of_origin: { type: "string" },
    },
  },
};

/**
 * ExternalItemPicker
 * Unified out-of-collection item picker with Search, UPC, and Photo tabs.
 *
 * Props:
 *   itemType: "blend" | "bottle" | "pipe"
 *   selectedItem: normalized item object already chosen by parent (or null)
 *   onSelect(item): called when user identifies an item — parent normalizes and stores it
 *   manualFields: optional ReactNode rendered below the tabs for manual text entry
 */
export default function ExternalItemPicker({ itemType, selectedItem, onSelect, manualFields }) {
  const hasUPC = itemType === "blend" || itemType === "bottle" || itemType === "cigar";
  const [tab, setTab] = useState("search");

  // UPC state
  const [upcCode, setUpcCode] = useState("");
  const [upcLoading, setUpcLoading] = useState(false);
  const [upcError, setUpcError] = useState("");

  // Photo state
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function handleUPCLookup() {
    const code = upcCode.trim();
    if (!code) return;
    setUpcLoading(true);
    setUpcError("");
    try {
      const productType =
        itemType === "blend"
          ? "pipe tobacco blend"
          : itemType === "cigar"
          ? "premium cigar (brand, vitola, and line)"
          : "whiskey or spirits bottle";
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Look up UPC/EAN barcode "${code}" for a ${productType}. Return the product name and details if found.`,
        add_context_from_internet: true,
        response_json_schema: UPC_SCHEMA[itemType] || UPC_SCHEMA.bottle,
        model: "gemini_3_flash",
      });
      if (result?.name || result?.brand) {
        onSelect({ ...result, item_type: itemType });
      } else {
        setUpcError("No product found for this code. Try searching by name.");
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
        itemType === "blend"
          ? "pipe tobacco blend (tin or pouch label)"
          : itemType === "bottle"
          ? "whiskey or spirits bottle label"
          : itemType === "cigar"
          ? "premium cigar (band label, showing brand, line, and vitola)"
          : "pipe (maker, model, and shape)";
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Identify this ${productType} from the photo. Return the product details you can see or infer.`,
        file_urls: [file_url],
        response_json_schema: PHOTO_SCHEMA[itemType] || PHOTO_SCHEMA.bottle,
      });
      if (result && (result.name || result.maker || result.model || result.brand)) {
        onSelect({ ...result, item_type: itemType });
      } else {
        setPhotoError("Could not identify from photo. Try another image or add manually below.");
      }
    } catch {
      setPhotoError("Photo identify failed. Try another image or add manually below.");
    } finally {
      setPhotoLoading(false);
    }
  }

  // If a selected item is already confirmed by parent, show a chip with a "Change" option
  if (selectedItem) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[rgba(180,140,75,0.22)] bg-[rgba(180,140,75,0.06)] px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wider">
              Selected Item
            </p>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="flex items-center gap-1 text-xs text-[#D4A574]/70 hover:text-[#D4A574] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Change
            </button>
          </div>
          <p className="text-sm font-semibold text-[#F5F1E7]">
            {selectedItem.label || selectedItem.name || "—"}
          </p>
        </div>

        {/* Manual override fields always visible so user can refine */}
        {manualFields ?? null}
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "search"
              ? "bg-[rgba(180,140,75,0.28)] text-[#F5F1E7] border border-[rgba(180,140,75,0.4)]"
              : "bg-[rgba(255,255,255,0.04)] text-[#E0D8C8]/60 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)]"
          }`}
        >
          <Search className="w-3.5 h-3.5" /> Search
        </button>
        {hasUPC && (
          <button
            type="button"
            onClick={() => setTab("upc")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "upc"
                ? "bg-[rgba(180,140,75,0.28)] text-[#F5F1E7] border border-[rgba(180,140,75,0.4)]"
                : "bg-[rgba(255,255,255,0.04)] text-[#E0D8C8]/60 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)]"
            }`}
          >
            <Barcode className="w-3.5 h-3.5" /> UPC
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab("photo")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "photo"
              ? "bg-[rgba(180,140,75,0.28)] text-[#F5F1E7] border border-[rgba(180,140,75,0.4)]"
              : "bg-[rgba(255,255,255,0.04)] text-[#E0D8C8]/60 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)]"
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Photo
        </button>
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <ExternalItemSearch
          itemType={itemType}
          onSelect={(item) => onSelect({ ...item, item_type: itemType })}
        />
      )}

      {/* UPC tab */}
      {tab === "upc" && hasUPC && (
        <div className="space-y-3">
          <p className="text-xs text-[#D8C7A6]/60">
            Enter or paste a UPC/EAN barcode to identify the{" "}
            {itemType === "blend" ? "tobacco blend" : "whiskey bottle"}.
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
              {upcLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Barcode className="w-4 h-4" /> Look Up
                </>
              )}
            </button>
          </div>
          {upcError && <p className="text-xs text-[#E07070]">{upcError}</p>}
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
            Upload a photo of the{" "}
            {itemType === "blend"
              ? "tin or pouch label"
              : itemType === "bottle"
              ? "bottle or label"
              : "pipe"}{" "}
            to identify it.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(180,140,75,0.3)] bg-[rgba(255,255,255,0.03)] p-6 cursor-pointer hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            {photoLoading ? (
              <>
                <Loader2 className="w-6 h-6 text-[#D4A574] animate-spin" />
                <span className="text-xs text-[#E0D8C8]/60">Identifying…</span>
              </>
            ) : (
              <>
                <Camera className="w-6 h-6 text-[#D4A574]/60" />
                <span className="text-sm text-[#E0D8C8]/70">Tap to upload photo</span>
                <span className="text-xs text-[#E0D8C8]/40">JPG, PNG, HEIC</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoIdentify}
              disabled={photoLoading}
            />
          </label>
          {photoError && <p className="text-xs text-[#E07070]">{photoError}</p>}
          <button
            type="button"
            onClick={() => setTab("search")}
            className="text-xs text-[#D4A574]/70 hover:text-[#D4A574] transition-colors"
          >
            → Try searching by name instead
          </button>
        </div>
      )}

      {/* Manual entry fallback — always shown below tabs when no item selected */}
      {manualFields ? (
        <div className="mt-2">
          <p className="text-xs text-[#D8C7A6]/55 mb-2">Or add manually:</p>
          {manualFields}
        </div>
      ) : null}
    </div>
  );
}