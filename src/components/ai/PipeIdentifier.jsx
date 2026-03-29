import React, { useState } from "react";
import { Sparkles, Camera, Upload, Loader2, X } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const COLLECTOR_CARD_STYLE = {
  background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
  border: "1px solid rgba(140,105,65,0.35)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
};

export default function PipeIdentifier({ pipe, onUpdatePipe }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [nameHint, setNameHint] = useState("");
  const [makerHint, setMakerHint] = useState("");
  const [shapeHint, setShapeHint] = useState("");
  const [stampingHint, setStampingHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotos(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleIdentify = async () => {
    if (!photos.length) {
      toast.error(t("pipeIdentifier.uploadPhotosFirst", "Please upload at least one photo first"));
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      // Upload photos
      const uploadPromises = photos.map(file => base44.integrations.Core.UploadFile({ file }));
      const uploaded = await Promise.all(uploadPromises);
      const fileUrls = uploaded.map(r => r.file_url).filter(Boolean);

      if (!fileUrls.length) {
        throw new Error("Photo upload failed");
      }

      const hints = [
        nameHint && `Name/Description: ${nameHint}`,
        makerHint && `Brand/Maker: ${makerHint}`,
        shapeHint && `Shape: ${shapeHint}`,
        stampingHint && `Stampings: ${stampingHint}`,
      ].filter(Boolean).join("\n");

      const prompt = `You are an expert pipe appraiser and tobacco pipe historian. Analyze the provided pipe photo(s) and identify the pipe in detail.

${hints ? `User-provided hints:\n${hints}\n` : ""}

Please identify and provide:
1. Pipe maker / brand (if identifiable)
2. Shape name and classification
3. Bowl material (briar, meerschaum, corncob, clay, etc.)
4. Stem material
5. Finish type (smooth, sandblast, rusticated, etc.)
6. Approximate era or year made
7. Country of origin
8. Notable features or stampings visible
9. Estimated condition
10. Any other notable observations

Be specific and detailed. If uncertain about something, say so.`;

      const identification = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        model: "claude_sonnet_4_6",
      });

      setResult(identification);
      toast.success("Pipe identified successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Identification failed: " + (err.message || "Unknown error"));
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
        {/* Upload buttons */}
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
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {/* Photo previews */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={src} alt={`Photo ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-[rgba(140,105,65,0.3)]" />
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

        {/* Optional hints */}
        <div className="space-y-4">
          <div className="text-sm font-semibold text-[#F5F1E7]">
            {t("pipeIdentifier.optionalHints", "Optional Hints")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input value={nameHint} onChange={(e) => setNameHint(e.target.value)} placeholder={t("pipeIdentifier.nameDescription", "Name / Description")} />
            <Input value={makerHint} onChange={(e) => setMakerHint(e.target.value)} placeholder={t("pipeIdentifier.brandMaker", "Brand / Maker")} />
            <Input value={shapeHint} onChange={(e) => setShapeHint(e.target.value)} placeholder={t("pipeIdentifier.shape", "Shape")} />
            <Input value={stampingHint} onChange={(e) => setStampingHint(e.target.value)} placeholder={t("pipeIdentifier.stampings", "Stampings")} />
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
              Uploading & Identifying...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {t("pipeIdentifier.identifyPipe", "Identify Pipe")}
            </>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "rgba(20,15,10,0.7)",
              border: "1px solid rgba(140,105,65,0.3)",
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F0C58A]" />
              <span className="text-sm font-semibold text-[#D4A574]">AI Identification Result</span>
            </div>
            <div className="text-sm text-[#E0D8C8] whitespace-pre-wrap leading-relaxed">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </div>
            <Button
              onClick={() => {
                const itemName = typeof result === 'string' ? 'Identified Pipe' : 'Identified Pipe';
                base44.entities.AcquisitionItem.create({
                  name: itemName,
                  item_type: 'pipe',
                  status: 'wishlist',
                  priority: 'medium',
                  notes: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                }).then(() => {
                  toast.success('Added to Want List!');
                  setResult(null);
                  setPhotos([]);
                  setPreviews([]);
                }).catch(err => {
                  toast.error('Failed to add to Want List');
                  console.error(err);
                });
              }}
              className="w-full bg-gradient-to-r from-[#7E4A3A] to-[#5F342A] hover:from-[#8C5242] hover:to-[#6B3C30] text-[#F8EBDD]"
            >
              Add to Want List
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}