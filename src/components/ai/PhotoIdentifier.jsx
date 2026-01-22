import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/subscription/FeatureGate";

export default function PhotoIdentifier({ onIdentify }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setUploadedPhotos(prev => [...prev, ...urls]);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (uploadedPhotos.length === 0) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these pipe images to identify and extract all possible details.

Look for:
1. Maker stamps, hallmarks, or brand markings
2. Pipe shape and style
3. Materials (briar, meerschaum, etc.)
4. Finish type (smooth, sandblast, rusticated)
5. Stem material
6. Overall condition
7. Any visible dimensions or size indicators
8. Era/age indicators
9. Country of origin clues
10. Model numbers or series names

Search the web for information about any stamps or hallmarks you can identify.

Provide detailed identification results that can be used to fill out a pipe inventory form.`,
        add_context_from_internet: true,
        file_urls: uploadedPhotos,
        response_json_schema: {
          type: "object",
          properties: {
            identified_maker: { type: "string" },
            model_or_series: { type: "string" },
            country_of_origin: { type: "string" },
            shape: { type: "string" },
            bowl_material: { type: "string" },
            stem_material: { type: "string" },
            finish: { type: "string" },
            stamping_text: { type: "string" },
            estimated_era: { type: "string" },
            condition: { type: "string" },
            confidence: { type: "string" },
            estimated_value_range: { type: "string" },
            identification_notes: { type: "string" },
            chamber_volume: { type: "string" }
          }
        }
      });

      // Convert to form data format
      const formData = {
        maker: result.identified_maker || '',
        name: result.model_or_series ? `${result.identified_maker || ''} ${result.model_or_series}`.trim() : '',
        country_of_origin: result.country_of_origin || '',
        shape: result.shape || '',
        bowl_material: result.bowl_material || '',
        stem_material: result.stem_material || '',
        finish: result.finish || '',
        stamping: result.stamping_text || '',
        year_made: result.estimated_era || '',
        condition: result.condition || '',
        chamber_volume: result.chamber_volume || '',
        notes: result.identification_notes || '',
        photos: uploadedPhotos
      };

      onIdentify(formData);
      setUploadedPhotos([]);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <FeatureGate 
      feature="AI_IDENTIFY"
      featureName="AI Photo Identification"
      description="Upload photos of your pipe's stampings to instantly identify the maker, model, and approximate value using advanced AI. Available in Pro tier or for grandfathered Premium users."
    >
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-violet-800">
          <Camera className="w-5 h-5" />
          Identify from Photos
        </CardTitle>
        <p className="text-sm text-stone-600">
          Upload photos of your pipe (including stamps) to auto-fill details
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {uploadedPhotos.map((photo, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-stone-200">
              <img src={photo} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          <label className="aspect-square rounded-lg border-2 border-dashed border-violet-300 hover:border-violet-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-violet-400 hover:text-violet-600">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Camera className="w-6 h-6" />
                <span className="text-xs">Add</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {uploadedPhotos.length > 0 && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Photos...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Identify & Fill Details
              </>
            )}
          </Button>
        )}

        {uploadedPhotos.length === 0 && (
          <p className="text-xs text-stone-500 text-center">
            Upload clear photos of the pipe and any visible stamps or markings
          </p>
        )}
      </CardContent>
    </Card>
    </FeatureGate>
  );
}