import React, { useState } from "react";
import { Sparkles, Camera, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const COLLECTOR_CARD_STYLE = {
  background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
  border: "1px solid rgba(140,105,65,0.35)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
};

export default function PipeIdentifier({ pipe, onUpdatePipe }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState([]);
  const [nameHint, setNameHint] = useState("");
  const [makerHint, setMakerHint] = useState("");
  const [shapeHint, setShapeHint] = useState("");
  const [stampingHint, setStampingHint] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotos(files);
  };

  const handleIdentify = async () => {
    if (!photos.length) {
      toast.error(t("pipeIdentifier.uploadPhotosFirst", "Upload photos first"));
      return;
    }

    setLoading(true);
    try {
      toast.success(t("pipeIdentifier.identifyStarted", "Identification started"));
    } catch (err) {
      console.error(err);
      toast.error(t("pipeIdentifier.identifyFailed", "Failed to identify pipe"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={COLLECTOR_CARD_STYLE}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-[#F5F1E7]">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(126,72,58,0.55), rgba(95,52,42,0.60))",
              border: "1px solid rgba(160,110,90,0.26)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            }}
          >
            <Sparkles className="w-5 h-5 text-[#F0C58A]" />
          </div>

          <div className="min-w-0">
            <div className="text-xl font-semibold">
              {t("pipeIdentifier.aiPipeIdentification", "AI Pipe Identification")}
            </div>
            <div className="text-sm text-[#D7C9B2]/70">
              {t("pipeIdentifier.uploadPhotosToIdentify", "Upload photos to identify a pipe")}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label
            className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center"
            style={{
              background: "linear-gradient(145deg, rgba(34,25,18,0.95), rgba(26,20,16,0.95))",
              border: "1px dashed rgba(140,105,65,0.38)",
              minHeight: "132px",
            }}
          >
            <Upload className="w-7 h-7 text-[#D7C9B2]/80" />
            <span className="font-medium text-[#F5F1E7]">
              {t("pipeIdentifier.uploadPhotos", "Upload Photos")}
            </span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>

          <label
            className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center"
            style={{
              background: "linear-gradient(145deg, rgba(34,25,18,0.95), rgba(26,20,16,0.95))",
              border: "1px dashed rgba(140,105,65,0.38)",
              minHeight: "132px",
            }}
          >
            <Camera className="w-7 h-7 text-[#D7C9B2]/80" />
            <span className="font-medium text-[#F5F1E7]">
              {t("common.takePhoto", "Take Photo")}
            </span>
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {photos.length > 0 && (
          <div className="text-sm text-[#D7C9B2]/80">
            {photos.length} {t("pipeIdentifier.photosSelected", "photo(s) selected")}
          </div>
        )}

        <div className="space-y-4">
          <div className="text-sm font-semibold text-[#F5F1E7]">
            {t("pipeIdentifier.optionalHints", "Optional Hints")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              value={nameHint}
              onChange={(e) => setNameHint(e.target.value)}
              placeholder={t("pipeIdentifier.nameDescription", "Name / Description")}
            />
            <Input
              value={makerHint}
              onChange={(e) => setMakerHint(e.target.value)}
              placeholder={t("pipeIdentifier.brandMaker", "Brand / Maker")}
            />
            <Input
              value={shapeHint}
              onChange={(e) => setShapeHint(e.target.value)}
              placeholder={t("pipeIdentifier.shape", "Shape")}
            />
            <Input
              value={stampingHint}
              onChange={(e) => setStampingHint(e.target.value)}
              placeholder={t("pipeIdentifier.stampings", "Stampings")}
            />
          </div>
        </div>

        <Button
          onClick={handleIdentify}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#A35C5C] to-[#8C4B4B] hover:from-[#B26666] hover:to-[#995454] text-[#F8EBDD] border border-[rgba(255,255,255,0.06)]"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {t("pipeIdentifier.identifyPipe", "Identify Pipe")}
        </Button>
      </CardContent>
    </Card>
  );
}
