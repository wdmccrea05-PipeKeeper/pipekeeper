import React, { useState } from "react";
import { Sparkles, Camera, Upload, Loader2, Heart } from "lucide-react";
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

export default function BottleIdentifier({ onBottleIdentified }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [nameHint, setNameHint] = useState("");
  const [distilleryHint, setDistilleryHint] = useState("");
  const [typeHint, setTypeHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    setPhotos(files);
    setUploading(true);
    
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setPhotoUrls(uploadedUrls);
      toast.success(t("bottleIdentifier.photosUploaded"));
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t("bottleIdentifier.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleIdentify = async () => {
    if (!photoUrls.length) {
      toast.error(t("bottleIdentifier.uploadPhotosFirst"));
      return;
    }

    setLoading(true);
    try {
      const hints = [];
      if (nameHint) hints.push(`Name/Label: ${nameHint}`);
      if (distilleryHint) hints.push(`Distillery: ${distilleryHint}`);
      if (typeHint) hints.push(`Type: ${typeHint}`);

      const apiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Identify this whiskey bottle from the provided images. 

${hints.length > 0 ? `User provided hints:\n${hints.join('\n')}\n\n` : ''}

Analyze the bottle label, shape, and any visible text to identify:
- Exact product name
- Distillery name
- Region and country of origin
- Type of whiskey (Bourbon, Scotch, Rye, Irish, etc.)
- Age statement if visible
- ABV (alcohol by volume) if visible
- Bottle size if visible
- Any special edition or batch information

Provide detailed, accurate information based on what you can see in the images.`,
        file_urls: photoUrls,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            distillery: { type: "string" },
            region: { type: "string" },
            country: { type: "string" },
            type: { type: "string" },
            age: { type: "number" },
            abv: { type: "number" },
            bottle_size: { type: "string" },
            special_edition: { type: "string" },
            tasting_notes: { type: "string" },
            estimated_price: { type: "number" },
            confidence: { type: "string" }
          }
        }
      });

      const bottleData = {
        name: apiResult.name || '',
        distillery: apiResult.distillery || '',
        region: apiResult.region || '',
        country: apiResult.country || '',
        type: apiResult.type || 'Other',
        age: apiResult.age || null,
        abv: apiResult.abv || null,
        bottle_size: apiResult.bottle_size || '750ml',
        notes: apiResult.tasting_notes || '',
        purchase_price: apiResult.estimated_price || null,
        photo: photoUrls[0] || '',
        fill_level: 'Full',
        bottle_count: 1,
        favorite: false
      };

      setResult(bottleData);
      onBottleIdentified(bottleData);
      toast.success(t("bottleIdentifier.identifySuccess"));
    } catch (err) {
      console.error('Identify error:', err);
      toast.error(t("bottleIdentifier.identifyFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWantList = async () => {
    if (!result) return;
    try {
      await base44.entities.AcquisitionItem.create({
        name: result.name || 'Identified Whiskey',
        item_type: 'bottle',
        status: 'wishlist',
        priority: 'medium',
        notes: `Distillery: ${result.distillery}\nType: ${result.type}\nAge: ${result.age || 'Unknown'}\nABV: ${result.abv || 'Unknown'}`,
        estimated_price: result.purchase_price,
      });
      toast.success(t("auto.components_whiskey_BottleIdentifier.added_to_want_list_13jl3g"));
      setResult(null);
      setPhotos([]);
      setPhotoUrls([]);
      setNameHint('');
      setDistilleryHint('');
      setTypeHint('');
    } catch (err) {
      toast.error(t("auto.components_whiskey_BottleIdentifier.failed_to_add_to_want_list_8icqrz"));
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
              background: "linear-gradient(135deg, rgba(126,72,58,0.55), rgba(95,52,42,0.60))",
              border: "1px solid rgba(160,110,90,0.26)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            }}
          >
            <Sparkles className="w-5 h-5 text-[#F0C58A]" />
          </div>

          <div className="min-w-0">
            <div className="text-xl font-semibold">
              {t("bottleIdentifier.aiBottleIdentification")}
            </div>
            <div className="text-sm text-[#D7C9B2]/70">
              {t("bottleIdentifier.uploadPhotosToIdentify")}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
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
              <span className="text-sm font-semibold text-[#D4A574]">{t("auto.components_whiskey_BottleIdentifier.bottle_identified_1veyev")}</span>
            </div>
            <div className="text-sm text-[#E0D8C8] space-y-2">
              <p><strong>{t("auto.components_whiskey_BottleIdentifier.name_3t3bc0")}</strong> {result.name}</p>
              <p><strong>{t("auto.components_whiskey_BottleIdentifier.distillery_1wyg3v")}</strong> {result.distillery}</p>
              <p><strong>{t("auto.components_whiskey_BottleIdentifier.type_3xudq9")}</strong> {result.type}</p>
              {result.age && <p><strong>{t("auto.components_whiskey_BottleIdentifier.age_yjowwc")}</strong> {result.age} years</p>}
              {result.abv && <p><strong>{t("auto.components_whiskey_BottleIdentifier.abv_yjo1fc")}</strong> {result.abv}%</p>}
            </div>
            <Button
              onClick={handleAddToWantList}
              className="w-full bg-gradient-to-r from-[#7E4A3A] to-[#5F342A] hover:from-[#8C5242] hover:to-[#6B3C30] text-[#F8EBDD]"
            >
              <Heart className="w-4 h-4 mr-2" />
              {t("auto.components_whiskey_BottleIdentifier.add_to_want_list_vu06cn")}
            </Button>
          </div>
        )}

        {!result && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center"
                style={{
                  background: "linear-gradient(145deg, rgba(34,25,18,0.95), rgba(26,20,16,0.95))",
                  border: "1px dashed rgba(140,105,65,0.38)",
                  minHeight: "132px",
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-7 h-7 text-[#D7C9B2]/80 animate-spin" />
                    <span className="font-medium text-[#F5F1E7]">
                      {t("common.uploading")}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-[#D7C9B2]/80" />
                    <span className="font-medium text-[#F5F1E7]">
                      {t("bottleIdentifier.uploadPhotos")}
                    </span>
                  </>
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>

              <label
                className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center"
                style={{
                  background: "linear-gradient(145deg, rgba(34,25,18,0.95), rgba(26,20,16,0.95))",
                  border: "1px dashed rgba(140,105,65,0.38)",
                  minHeight: "132px",
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-7 h-7 text-[#D7C9B2]/80 animate-spin" />
                    <span className="font-medium text-[#F5F1E7]">
                      {t("common.uploading")}
                    </span>
                  </>
                ) : (
                  <>
                    <Camera className="w-7 h-7 text-[#D7C9B2]/80" />
                    <span className="font-medium text-[#F5F1E7]">
                      {t("common.takePhoto")}
                    </span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="text-sm text-[#D7C9B2]/80">
                {photos.length} {t("bottleIdentifier.photosSelected")}
              </div>
            )}

            <div className="space-y-4">
              <div className="text-sm font-semibold text-[#F5F1E7]">
                {t("bottleIdentifier.optionalHints")}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  value={nameHint}
                  onChange={(e) => setNameHint(e.target.value)}
                  placeholder={t("bottleIdentifier.nameLabel")}
                />
                <Input
                  value={distilleryHint}
                  onChange={(e) => setDistilleryHint(e.target.value)}
                  placeholder={t("bottleIdentifier.distillery")}
                />
                <Input
                  value={typeHint}
                  onChange={(e) => setTypeHint(e.target.value)}
                  placeholder={t("bottleIdentifier.type")}
                />
              </div>
            </div>

            <Button
              onClick={handleIdentify}
              disabled={loading || uploading || !photoUrls.length}
              className="w-full bg-gradient-to-r from-[#A35C5C] to-[#8C4B4B] hover:from-[#B26666] hover:to-[#995454] text-[#F8EBDD] border border-[rgba(255,255,255,0.06)]"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t("bottleIdentifier.identifyBottle")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}