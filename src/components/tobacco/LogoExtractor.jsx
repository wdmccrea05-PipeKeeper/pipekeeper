import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function LogoExtractor({ blends }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const updateBlendMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TobaccoBlend.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blends'] });
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setProcessing(false);
    setResults(null);

    try {
      // Upload PDFs
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const uploadResults = await Promise.all(uploadPromises);
      const pdfUrls = uploadResults.map(r => r.file_url);

      setUploading(false);
      setProcessing(true);

      // Extract images from PDFs and match to blends
      const blendList = blends.map(b => ({
        id: b.id,
        name: b.name,
        manufacturer: b.manufacturer
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing PDF files containing tobacco blend logos and labels. Extract all images from the PDFs and match them to the tobacco blends in the collection.

Tobacco Blends in Collection:
${JSON.stringify(blendList, null, 2)}

TASK:
1. Extract ALL images from the provided PDFs
2. For each image, determine which tobacco blend it represents by analyzing:
   - Brand/manufacturer names visible in the image
   - Product names on labels
   - Visual design elements
3. Match each extracted image to a blend in the collection by name/manufacturer
4. Return the matches with image data URLs

IMPORTANT:
- Each match should include the blend ID and a data URL of the logo/label image
- If an image cannot be matched to any blend, skip it
- If multiple images match the same blend, use the clearest/highest quality one
- Convert extracted images to base64 data URLs in JPEG format

Return a structured list of matches.`,
        file_urls: pdfUrls,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  blend_id: { type: "string" },
                  blend_name: { type: "string" },
                  image_data_url: { type: "string" },
                  confidence: { type: "string" }
                }
              }
            },
            unmatched_count: { type: "number" },
            processing_notes: { type: "string" }
          }
        }
      });

      setResults(result);
      setProcessing(false);

      // Auto-apply matches with high confidence
      if (result.matches && result.matches.length > 0) {
        const highConfidenceMatches = result.matches.filter(m => 
          m.confidence?.toLowerCase().includes('high') || 
          m.confidence?.toLowerCase().includes('certain')
        );

        // Upload images and update blends
        for (const match of highConfidenceMatches) {
          try {
            // Convert data URL to blob
            const response = await fetch(match.image_data_url);
            const blob = await response.blob();
            const file = new File([blob], `${match.blend_name}_logo.jpg`, { type: 'image/jpeg' });
            
            // Upload to storage
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            
            // Update blend with logo
            await updateBlendMutation.mutateAsync({
              id: match.blend_id,
              data: { logo: uploadResult.file_url }
            });
          } catch (err) {
            console.error(`Error updating blend ${match.blend_name}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Error processing PDFs:', err);
      setResults({ error: err.message || 'Failed to process PDFs' });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-violet-800">
          <FileText className="w-5 h-5" />
          Extract Logos from PDFs
        </CardTitle>
        <p className="text-sm text-stone-600 mt-2">
          Upload PDF files containing tobacco blend logos. The AI will extract images and match them to your blends.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-violet-300 rounded-lg p-8 bg-violet-50/50">
          {uploading || processing ? (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-3" />
              <p className="text-sm text-stone-600">
                {uploading ? 'Uploading PDFs...' : 'Extracting and matching logos...'}
              </p>
              <p className="text-xs text-stone-500 mt-1">This may take a minute</p>
            </div>
          ) : (
            <label className="cursor-pointer text-center">
              <Upload className="w-8 h-8 text-violet-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-stone-700 mb-1">
                Upload PDF Files
              </p>
              <p className="text-xs text-stone-500">
                Click to select PDF files containing blend logos
              </p>
              <input
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading || processing}
              />
            </label>
          )}
        </div>

        {results && !results.error && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    {results.matches?.length || 0} logos matched and updated
                  </p>
                  {results.unmatched_count > 0 && (
                    <p className="text-xs text-stone-600">
                      {results.unmatched_count} images could not be matched
                    </p>
                  )}
                </div>
              </div>
            </div>

            {results.processing_notes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-stone-600">{results.processing_notes}</p>
              </div>
            )}

            {results.matches && results.matches.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-stone-700">Updated Blends:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {results.matches.map((match, idx) => (
                    <div key={idx} className="p-2 bg-white border border-stone-200 rounded-lg">
                      <div className="aspect-square rounded-md overflow-hidden mb-2 bg-stone-100">
                        <img 
                          src={match.image_data_url} 
                          alt={match.blend_name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-xs font-medium text-stone-800 truncate">
                        {match.blend_name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {match.confidence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {results?.error && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-800">Error processing PDFs</p>
              <p className="text-xs text-rose-600 mt-1">{results.error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}