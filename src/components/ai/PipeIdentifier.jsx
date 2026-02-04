import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScanSearch, Info, Camera, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useTranslation } from "react-i18next";

export default function PipeIdentifier({ pipe, onUpdatePipe }) {
  const { t } = useTranslation();
  const entitlements = useEntitlements();

  if (!entitlements.canUse("AI_IDENTIFY")) {
    return (
      <UpgradePrompt 
        featureName={t("tobacconist.aiPipeIdentifier")}
        description={t("tobacconist.identificationUpgradeDesc")}
      />
    );
  }
  const [loading, setLoading] = useState(false);
  const [identification, setIdentification] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of Array.from(files)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setCapturedPhotos([...capturedPhotos, ...uploadedUrls]);
    } catch (err) {
      console.error('Error uploading files:', err);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setCapturedPhotos(capturedPhotos.filter((_, i) => i !== index));
  };

  const identifyPipe = async () => {
    const allPhotos = [
      ...(pipe.stamping_photos || []),
      ...(pipe.photos || []),
      ...capturedPhotos
    ];

    if (allPhotos.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe identifier with extensive knowledge of pipe makers, stamps, and hallmarks. Analyze these images to identify this pipe and its geometry.

Known information:
- Name: ${pipe.name || 'Not specified'}
- Claimed Maker: ${pipe.maker || 'Unknown'}
- Stamping Text: ${pipe.stamping || 'Not specified'}
- Shape: ${pipe.shape || 'Unknown'}
- Bowl Style: ${pipe.bowlStyle || 'Unknown'}
- Shank Shape: ${pipe.shankShape || 'Unknown'}
- Bend: ${pipe.bend || 'Unknown'}
- Size Class: ${pipe.sizeClass || 'Unknown'}
- Material: ${pipe.bowl_material || 'Unknown'}

Based on the images (especially any stamping/hallmarks visible), identify:
1. The actual maker/brand
2. The production era/date range
3. The specific model or line if identifiable
4. Country of origin
5. Pipe geometry: shape, bowl style, shank shape, bend degree, size class
6. Any notable features or authenticity indicators

Search for information about pipe stamps, hallmarks, and maker marks to accurately identify this pipe.

CRITICAL: Do NOT include any URLs, links, sources, citations, or website names in your response. Provide only descriptions and analysis.

Provide the identification in JSON format with:
- identified_maker: the maker/brand name
- confidence: "high", "medium", or "low"
- model_line: specific model or line if known
- estimated_era: when it was likely made
- country: country of manufacture
- identification_basis: what led to this identification (no sources or links)
- authenticity_notes: any concerns or confirmations about authenticity (no sources or links)
- additional_info: interesting facts about this maker or model (no sources or links)
- suggested_updates: object with any fields that should be updated on the pipe record (including geometry fields)`,
        add_context_from_internet: true,
        file_urls: allPhotos,
        response_json_schema: {
          type: "object",
          properties: {
            identified_maker: { type: "string" },
            confidence: { type: "string" },
            model_line: { type: "string" },
            estimated_era: { type: "string" },
            country: { type: "string" },
            identification_basis: { type: "string" },
            authenticity_notes: { type: "string" },
            additional_info: { type: "string" },
            suggested_updates: { 
              type: "object",
              properties: {
                maker: { type: "string" },
                year_made: { type: "string" },
                country_of_origin: { type: "string" },
                shape: { type: "string" },
                bowlStyle: { type: "string" },
                shankShape: { type: "string" },
                bend: { type: "string" },
                sizeClass: { type: "string" }
              }
            }
          }
        }
      });

      setIdentification(result);
    } catch (err) {
      console.error('Error identifying pipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpdates = () => {
    if (identification?.suggested_updates) {
      onUpdatePipe(identification.suggested_updates);
    }
  };

  const hasPhotos = pipe.stamping_photos?.length > 0 || pipe.photos?.length > 0 || capturedPhotos.length > 0;

  const confidenceColors = {
    high: "bg-emerald-100 text-emerald-800 border-emerald-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-rose-100 text-rose-800 border-rose-200"
  };

  return (
    <div className="space-y-6">
      {!identification && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
            <ScanSearch className="w-8 h-8 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">{t("tobacconist.aiPipeIdentifier")}</h3>
          <p className="text-stone-500 mb-4 max-w-md mx-auto">
            {t("tobacconist.uploadPhotos")}
          </p>

          {/* Photo Upload Options */}
          <div className="flex gap-3 justify-center mb-6">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              {t("tobacconist.takePhoto")}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("tobacconist.uploadPhoto")}
            </Button>
          </div>

          {/* Captured Photos Preview */}
          {capturedPhotos.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-stone-500 mb-3">{t("tobacconist.photosForIdentification")}:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {capturedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={photo}
                      alt={t("tobacconist.capturedPhoto", { number: idx + 1 })}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-stone-200"
                    />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={identifyPipe}
            disabled={loading || !hasPhotos}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("tobacconist.analyzing")}
              </>
            ) : (
              <>
                <ScanSearch className="w-4 h-4 mr-2" />
                {t("tobacconist.identifyPipe")}
              </>
            )}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {identification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">{t("tobacconist.results")}</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? t("tobacconist.show") : t("tobacconist.hide")}
              </Button>
            </div>

            {!collapsed && (
              <div className="space-y-6">
            {/* Identification Result */}
            <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ScanSearch className="w-5 h-5 text-violet-600" />
                    {t("tobacconist.identificationResult")}
                  </CardTitle>
                  <Badge className={confidenceColors[identification.confidence]}>
                    {identification.confidence} {t("tobacconist.confidence")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-stone-500">{t("tobacconist.maker")}</p>
                    <p className="font-semibold text-stone-800">{identification.identified_maker || t("common.unknown")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{t("tobacconist.modelLine")}</p>
                    <p className="font-semibold text-stone-800">{identification.model_line || t("common.unknown")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{t("tobacconist.era")}</p>
                    <p className="font-semibold text-stone-800">{identification.estimated_era || t("common.unknown")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{t("tobacconist.country")}</p>
                    <p className="font-semibold text-stone-800">{identification.country || t("common.unknown")}</p>
                  </div>
                </div>

                {identification.suggested_updates && Object.keys(identification.suggested_updates).length > 0 && (
                  <Button 
                    onClick={handleApplyUpdates}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                  >
                    {t("tobacconist.applySuggested")}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Identification Basis */}
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t("tobacconist.howWeIdentified")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-stone-600">{identification.identification_basis}</p>
              </CardContent>
            </Card>

            {/* Authenticity */}
            {identification.authenticity_notes && (
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="w-5 h-5 text-amber-600" />
                    {t("tobacconist.authenticityNotes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-stone-600">{identification.authenticity_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            {identification.additional_info && (
              <Card className="border-stone-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t("tobacconist.aboutThisPipe")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-stone-600">{identification.additional_info}</p>
                </CardContent>
              </Card>
            )}

              <div className="text-center">
                <Button variant="outline" onClick={() => {
                  setIdentification(null);
                  setCapturedPhotos([]);
                }}>
                  {t("tobacconist.identifyAgain")}
                </Button>
              </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}