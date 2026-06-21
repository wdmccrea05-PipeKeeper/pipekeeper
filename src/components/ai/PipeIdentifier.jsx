import React, { useMemo, useState } from "react";
import {
  Sparkles,
  Camera,
  Upload,
  Loader2,
  X,
  Heart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

const COLLECTOR_CARD_STYLE = {
  background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
  border: "1px solid rgba(140,105,65,0.35)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
};

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    make: { type: "string" },
    model: { type: "string" },
    shape: { type: "string" },
    material: { type: "string" },
    estimated_value: { type: "string" },
    confidence: { type: "string" },
    era: { type: "string" },
    country_of_origin: { type: "string" },
    stem_material: { type: "string" },
    finish: { type: "string" },
    condition: { type: "string" },
    visible_stampings: { type: "string" },
    notable_features: { type: "string" },
    notes: { type: "string" },
  },
};

function InfoRow({ label, value }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(140,105,65,0.22)",
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9B2]/58 mb-1">
        {label}
      </div>
      <div className="text-sm font-medium text-[#F5F1E7] break-words">
        {value || "Unknown"}
      </div>
    </div>
  );
}

export default function PipeIdentifier() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const userEmail = user?.email || null;

  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [nameHint, setNameHint] = useState("");
  const [makerHint, setMakerHint] = useState("");
  const [shapeHint, setShapeHint] = useState("");
  const [stampingHint, setStampingHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setPhotos((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetState = () => {
    previews.forEach((src) => URL.revokeObjectURL(src));
    setResult(null);
    setPhotos([]);
    setPreviews([]);
    setNameHint("");
    setMakerHint("");
    setShapeHint("");
    setStampingHint("");
    setShowMoreDetails(false);
  };

  const parsedResult = useMemo(() => {
    if (!result) return null;
    if (typeof result === "object") return result;

    try {
      return JSON.parse(result);
    } catch {
      return {
        make: "Unknown",
        model: "Unknown",
        shape: "Unknown",
        material: "Unknown",
        estimated_value: "Unknown",
        notes: String(result),
      };
    }
  }, [result]);

  const handleIdentify = async () => {
    if (!photos.length) {
      toast.error(
        t("pipeIdentifier.uploadPhotosFirst")
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const uploadPromises = photos.map((file) =>
        base44.integrations.Core.UploadFile({ file })
      );
      const uploaded = await Promise.all(uploadPromises);
      const fileUrls = uploaded.map((r) => r.file_url).filter(Boolean);

      if (!fileUrls.length) {
        throw new Error("Photo upload failed");
      }

      const hints = [
        nameHint && `Name/Description: ${nameHint}`,
        makerHint && `Brand/Maker: ${makerHint}`,
        shapeHint && `Shape: ${shapeHint}`,
        stampingHint && `Stampings: ${stampingHint}`,
      ]
        .filter(Boolean)
        .join("\n");

      const prompt = `You are an expert pipe appraiser and tobacco pipe historian.

Analyze the provided pipe photo(s) and return a concise collector-facing identification.

${hints ? `User-provided hints:\n${hints}\n` : ""}

Return JSON only using the schema provided.

Rules:
- Focus the main identification on:
  1. make
  2. model
  3. shape
  4. material
  5. estimated_value
- estimated_value should be a readable market estimate or range in USD such as "$75-$125" or "$250+", based on visible condition, maker, likely era, and identifiable features.
- If uncertain, say "Unknown" or use cautious wording like "Possibly Peterson".
- material should primarily describe the bowl/body material.
- notes should be brief and useful.
- visible_stampings should summarize any markings you can make out.
- notable_features should summarize things like finish, military mount, silver band, unusual stem, etc.
- condition should be brief, such as "Good used condition" or "Fair with visible wear".`;

      const identification = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        response_json_schema: RESULT_SCHEMA,
        model: "claude_sonnet_4_6",
      });

      setResult(identification);
      setShowMoreDetails(false);
      toast.success(t("auto.components_ai_PipeIdentifier.pipe_identified_successfully_1idibu"));
    } catch (err) {
      console.error(err);
      toast.error(t("auto.components_ai_PipeIdentifier.identification_failed_toast") + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWantList = async () => {
    if (!parsedResult) return;
    if (!userEmail) {
      toast.error(t("auto.components_ai_PipeIdentifier.unable_to_identify_the_current_user_1ivtij"));
      return;
    }

    try {
      const make = parsedResult.make && parsedResult.make !== "Unknown" ? parsedResult.make : "";
      const model =
        parsedResult.model && parsedResult.model !== "Unknown"
          ? parsedResult.model
          : "Identified Pipe";

      await base44.entities.AcquisitionItem.create({
        name: [make, model].filter(Boolean).join(" ") || model,
        item_type: "pipe",
        category: "wishlist",
        status: "active",
        priority: "medium",
        created_by: userEmail,
        is_manual: false,
        brand: make,
        pipe_model: model,
        notes: JSON.stringify(parsedResult, null, 2),
      });

      toast.success(t("auto.components_ai_PipeIdentifier.added_to_want_list_13jl3g"));
      resetState();
    } catch (err) {
      toast.error(t("auto.components_ai_PipeIdentifier.failed_to_add_to_want_list_8icqrz"));
      console.error(err);
    }
  };

  return (
    <Card style={COLLECTOR_CARD_STYLE}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-[#F5F1E7]">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(126,72,58,0.55), rgba(95,52,42,0.60))",
              border: "1px solid rgba(160,110,90,0.26)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            }}
          >
            <Sparkles className="w-5 h-5 text-[#F0C58A]" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold">
              {t("pipeIdentifier.aiPipeIdentification")}
            </div>
            <div className="text-sm text-[#D7C9B2]/70">
              {t(
                "pipeIdentifier.uploadPhotosToIdentify"
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center"
            style={{
              background:
                "linear-gradient(145deg, rgba(34,25,18,0.95), rgba(26,20,16,0.95))",
              border: "1px dashed rgba(140,105,65,0.38)",
              minHeight: "132px",
            }}
          >
            <Upload className="w-7 h-7 text-[#D7C9B2]/80" />
            <span className="font-medium text-[#F5F1E7]">
              {t("pipeIdentifier.uploadPhotos")}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </label>

          <label
            className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center"
            style={{
              background:
                "linear-gradient(145deg, rgba(34,25,18,0.95), rgba(26,20,16,0.95))",
              border: "1px dashed rgba(140,105,65,0.38)",
              minHeight: "132px",
            }}
          >
            <Camera className="w-7 h-7 text-[#D7C9B2]/80" />
            <span className="font-medium text-[#F5F1E7]">
              {t("common.takePhoto")}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </div>

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20">
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-xl border border-[rgba(140,105,65,0.3)]"
                />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-[#A35C5C] rounded-full flex items-center justify-center text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="text-sm font-semibold text-[#F5F1E7]">
            {t("pipeIdentifier.optionalHints")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              value={nameHint}
              onChange={(e) => setNameHint(e.target.value)}
              placeholder={t("pipeIdentifier.nameDescription")}
            />
            <Input
              value={makerHint}
              onChange={(e) => setMakerHint(e.target.value)}
              placeholder={t("pipeIdentifier.brandMaker")}
            />
            <Input
              value={shapeHint}
              onChange={(e) => setShapeHint(e.target.value)}
              placeholder={t("pipeIdentifier.shape")}
            />
            <Input
              value={stampingHint}
              onChange={(e) => setStampingHint(e.target.value)}
              placeholder={t("pipeIdentifier.stampings")}
            />
          </div>
        </div>

        <Button
          onClick={handleIdentify}
          disabled={loading || photos.length === 0}
          className="w-full bg-gradient-to-r from-[#A35C5C] to-[#8C4B4B] hover:from-[#B26666] hover:to-[#995454] text-[#F8EBDD] border border-[rgba(255,255,255,0.06)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("auto.components_ai_PipeIdentifier.uploading_and_identifying_duys0i")}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {t("pipeIdentifier.identifyPipe")}
            </>
          )}
        </Button>

        {parsedResult && (
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "rgba(20,15,10,0.7)",
              border: "1px solid rgba(140,105,65,0.3)",
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F0C58A]" />
              <span className="text-sm font-semibold text-[#D4A574]">
                {t("auto.components_ai_PipeIdentifier.ai_identification_result_1swdox")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Make" value={parsedResult.make} />
              <InfoRow label="Model" value={parsedResult.model} />
              <InfoRow label="Shape" value={parsedResult.shape} />
              <InfoRow label="Material" value={parsedResult.material} />
              <div className="sm:col-span-2">
                <InfoRow label="Estimated Value" value={parsedResult.estimated_value} />
              </div>
            </div>

            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid rgba(140,105,65,0.22)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <button
                type="button"
                onClick={() => setShowMoreDetails((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-[#F5F1E7]">{t("auto.components_ai_PipeIdentifier.more_details_15hrhn")}</div>
                  <div className="text-xs text-[#D7C9B2]/58">
                    {t("auto.components_ai_PipeIdentifier.confidence_era_origin_condition_stampings_and_1phii8")}
                  </div>
                </div>
                {showMoreDetails ? (
                  <ChevronUp className="w-4 h-4 text-[#D4A574]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#D4A574]" />
                )}
              </button>

              {showMoreDetails && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow label="Confidence" value={parsedResult.confidence} />
                    <InfoRow label="Era" value={parsedResult.era} />
                    <InfoRow
                      label="Country of Origin"
                      value={parsedResult.country_of_origin}
                    />
                    <InfoRow label="Stem Material" value={parsedResult.stem_material} />
                    <InfoRow label="Finish" value={parsedResult.finish} />
                    <InfoRow label="Condition" value={parsedResult.condition} />
                  </div>

                  {(parsedResult.visible_stampings ||
                    parsedResult.notable_features ||
                    parsedResult.notes) && (
                    <div className="space-y-3">
                      {parsedResult.visible_stampings ? (
                        <div
                          className="rounded-xl px-4 py-3"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(140,105,65,0.22)",
                          }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9B2]/58 mb-1">
                            {t("auto.components_ai_PipeIdentifier.visible_stampings_18e8ij")}
                          </div>
                          <div className="text-sm text-[#E0D8C8] whitespace-pre-wrap">
                            {parsedResult.visible_stampings}
                          </div>
                        </div>
                      ) : null}

                      {parsedResult.notable_features ? (
                        <div
                          className="rounded-xl px-4 py-3"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(140,105,65,0.22)",
                          }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9B2]/58 mb-1">
                            {t("auto.components_ai_PipeIdentifier.notable_features_fykomh")}
                          </div>
                          <div className="text-sm text-[#E0D8C8] whitespace-pre-wrap">
                            {parsedResult.notable_features}
                          </div>
                        </div>
                      ) : null}

                      {parsedResult.notes ? (
                        <div
                          className="rounded-xl px-4 py-3"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(140,105,65,0.22)",
                          }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9B2]/58 mb-1">
                            {t("auto.components_ai_PipeIdentifier.notes_3te9gu")}
                          </div>
                          <div className="text-sm text-[#E0D8C8] whitespace-pre-wrap">
                            {parsedResult.notes}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleAddToWantList}
              disabled={!userEmail}
              className="w-full bg-gradient-to-r from-[#7E4A3A] to-[#5F342A] hover:from-[#8C5242] hover:to-[#6B3C30] text-[#F8EBDD]"
            >
              <Heart className="w-4 h-4 mr-2" />
              {t("auto.components_ai_PipeIdentifier.add_to_want_list_vu06cn")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}