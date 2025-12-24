import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, Loader2, CheckCircle2, Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function QuickPipeIdentifier({ pipes, blends }) {
  const [photos, setPhotos] = useState([]);
  const [hints, setHints] = useState({
    name: '',
    maker: '',
    shape: '',
    stamping: ''
  });
  const [loading, setLoading] = useState(false);
  const [identified, setIdentified] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [impactAnalysis, setImpactAnalysis] = useState(null);
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    const uploadedUrls = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setPhotos([...photos, ...uploadedUrls]);
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos([...photos, file_url]);
    } catch (error) {
      console.error('Camera capture failed:', error);
    }
  };

  const handleIdentify = async () => {
    if (photos.length === 0) return;

    setLoading(true);
    try {
      const additionalContext = [
        hints.name && `Name/Description: ${hints.name}`,
        hints.maker && `Brand/Maker: ${hints.maker}`,
        hints.shape && `Shape: ${hints.shape}`,
        hints.stamping && `Stampings/Markings: ${hints.stamping}`
      ].filter(Boolean).join('\n');

      const prompt = `Analyze these pipe photos and provide detailed identification information.

${additionalContext ? `Additional context provided by user:\n${additionalContext}\n\n` : ''}Return a JSON object with this exact structure:
{
  "name": "Brief descriptive name for the pipe",
  "maker": "Pipe maker/brand if identifiable",
  "shape": "One of: Billiard, Bulldog, Dublin, Apple, Author, Bent, Canadian, Churchwarden, Freehand, Liverpool, Lovat, Poker, Prince, Rhodesian, Zulu, Calabash, Cavalier, Chimney, Devil Anse, Egg, Hawkbill, Horn, Hungarian, Nautilus, Oom Paul, Panel, Pot, Sitter, Tomato, Volcano, Woodstock, Other",
  "bowl_material": "One of: Briar, Meerschaum, Corn Cob, Clay, Olive Wood, Cherry Wood, Morta, Other",
  "finish": "One of: Smooth, Sandblast, Rusticated, Partially Rusticated, Carved, Natural, Other",
  "stem_material": "One of: Vulcanite, Acrylic, Lucite, Cumberland, Amber, Horn, Bone, Other",
  "estimated_value": 150,
  "year_made": "Estimated era/year",
  "stamping": "Any visible stampings or markings",
  "notes": "Additional observations about the pipe",
  "confidence": "high/medium/low"
}

Be as specific as possible based on visible features. Do NOT include any source URLs, links, or references in your response.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: photos,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            maker: { type: "string" },
            shape: { type: "string" },
            bowl_material: { type: "string" },
            finish: { type: "string" },
            stem_material: { type: "string" },
            estimated_value: { type: "number" },
            year_made: { type: "string" },
            stamping: { type: "string" },
            notes: { type: "string" },
            confidence: { type: "string" }
          }
        }
      });

      setIdentified(result);
    } catch (error) {
      console.error('Identification failed:', error);
      alert('Failed to identify pipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeImpact = async () => {
    if (!identified) return;

    setAnalyzing(true);
    try {
      const pipeContext = pipes.map(p => `${p.name} - ${p.maker || 'Unknown'} ${p.shape || ''} (${p.chamber_volume || 'Unknown size'})`).join('\n');
      const blendContext = blends.map(b => `${b.name} - ${b.manufacturer || 'Unknown'} ${b.blend_type || ''}`).join('\n');

      const prompt = `Analyze the impact of adding this new pipe to the collection:

NEW PIPE:
${identified.name} - ${identified.maker || 'Unknown'} ${identified.shape || ''} ${identified.bowl_material || ''}

CURRENT PIPES:
${pipeContext || 'No pipes in collection yet'}

TOBACCO BLENDS:
${blendContext || 'No tobacco blends yet'}

Provide analysis as JSON:
{
  "fills_gap": "What gap this pipe fills in the collection",
  "redundancy": "Any redundancy with existing pipes",
  "recommended_for": ["Blend 1", "Blend 2"],
  "value_proposition": "Overall value this adds",
  "recommendation": "Strong addition / Good addition / Consider alternatives"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            fills_gap: { type: "string" },
            redundancy: { type: "string" },
            recommended_for: { type: "array", items: { type: "string" } },
            value_proposition: { type: "string" },
            recommendation: { type: "string" }
          }
        }
      });

      setImpactAnalysis(result);
    } catch (error) {
      console.error('Impact analysis failed:', error);
      alert('Failed to analyze impact. You can still add the pipe directly.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToCollection = async () => {
    if (!identified) return;

    setAdding(true);
    try {
      const pipeData = {
        name: identified.name,
        maker: identified.maker,
        shape: identified.shape,
        bowl_material: identified.bowl_material,
        finish: identified.finish,
        stem_material: identified.stem_material,
        estimated_value: identified.estimated_value,
        year_made: identified.year_made,
        stamping: identified.stamping,
        notes: identified.notes,
        photos: photos
      };

      const newPipe = await base44.entities.Pipe.create(pipeData);
      await queryClient.invalidateQueries({ queryKey: ['pipes'] });
      
      // Navigate to the new pipe detail page
      navigate(createPageUrl(`PipeDetail?id=${newPipe.id}`));
    } catch (error) {
      console.error('Failed to add pipe:', error);
      alert('Failed to add pipe to collection. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleReset = () => {
    setPhotos([]);
    setHints({ name: '', maker: '', shape: '', stamping: '' });
    setIdentified(null);
    setImpactAnalysis(null);
  };

  return (
    <Card className="border-[#e8d5b7]/30 bg-gradient-to-br from-purple-900/20 to-purple-800/10">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-[#e8d5b7]">AI Pipe Identifier</p>
              <p className="text-xs text-[#e8d5b7]/70">Upload photos to identify and add pipes instantly</p>
            </div>
          </div>
        </div>

        {!identified ? (
          <div className="space-y-4">
            {/* Photo Upload Section */}
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[#e8d5b7]/30 rounded-lg hover:border-purple-400/50 transition-colors bg-[#243548]/50">
                  <Upload className="w-5 h-5 text-[#e8d5b7]/60 mb-1" />
                  <span className="text-xs text-[#e8d5b7]/70">Upload Photos</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={loading}
                />
              </label>

              <label className="cursor-pointer">
                <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[#e8d5b7]/30 rounded-lg hover:border-purple-400/50 transition-colors bg-[#243548]/50">
                  <Camera className="w-5 h-5 text-[#e8d5b7]/60 mb-1" />
                  <span className="text-xs text-[#e8d5b7]/70">Take Photo</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  disabled={loading}
                />
              </label>
            </div>

            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#e8d5b7]/30">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Optional Hint Fields */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs text-[#e8d5b7]/70">
                Optional: Provide hints to improve identification
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Name/Description"
                  value={hints.name}
                  onChange={(e) => setHints({...hints, name: e.target.value})}
                  className="bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7] placeholder:text-[#e8d5b7]/40 text-sm h-9"
                />
                <Input
                  placeholder="Brand/Maker"
                  value={hints.maker}
                  onChange={(e) => setHints({...hints, maker: e.target.value})}
                  className="bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7] placeholder:text-[#e8d5b7]/40 text-sm h-9"
                />
                <Input
                  placeholder="Shape"
                  value={hints.shape}
                  onChange={(e) => setHints({...hints, shape: e.target.value})}
                  className="bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7] placeholder:text-[#e8d5b7]/40 text-sm h-9"
                />
                <Input
                  placeholder="Stampings"
                  value={hints.stamping}
                  onChange={(e) => setHints({...hints, stamping: e.target.value})}
                  className="bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7] placeholder:text-[#e8d5b7]/40 text-sm h-9"
                />
              </div>
            </div>

            {/* Identify Button */}
            <Button
              onClick={handleIdentify}
              disabled={photos.length === 0 || loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Identifying...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Identify Pipe
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Identification Results */}
            <div className="bg-[#243548]/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[#e8d5b7] text-lg">{identified.name}</p>
                  <p className="text-sm text-[#e8d5b7]/70">{identified.maker || 'Unknown Maker'}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-900/30 border border-green-600/30">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">{identified.confidence}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {identified.shape && (
                  <span className="text-xs px-2 py-1 bg-[#8b3a3a]/30 text-[#e8d5b7] rounded">
                    {identified.shape}
                  </span>
                )}
                {identified.bowl_material && (
                  <span className="text-xs px-2 py-1 bg-[#8b3a3a]/30 text-[#e8d5b7] rounded">
                    {identified.bowl_material}
                  </span>
                )}
                {identified.estimated_value && (
                  <span className="text-xs px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded">
                    ${identified.estimated_value}
                  </span>
                )}
              </div>

              {identified.notes && (
                <p className="text-xs text-[#e8d5b7]/60 mt-2 pt-2 border-t border-[#e8d5b7]/20">
                  {identified.notes}
                </p>
              )}
            </div>

            {/* Impact Analysis */}
            {impactAnalysis && (
              <div className="bg-[#1a2c42]/50 rounded-lg p-4 border border-[#e8d5b7]/20 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-[#e8d5b7] text-sm">Collection Impact</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[#e8d5b7]/60">Fills Gap:</span>
                    <p className="text-[#e8d5b7] mt-1">{impactAnalysis.fills_gap}</p>
                  </div>
                  
                  {impactAnalysis.redundancy && (
                    <div>
                      <span className="text-[#e8d5b7]/60">Redundancy Check:</span>
                      <p className="text-[#e8d5b7] mt-1">{impactAnalysis.redundancy}</p>
                    </div>
                  )}
                  
                  {impactAnalysis.recommended_for?.length > 0 && (
                    <div>
                      <span className="text-[#e8d5b7]/60">Best For:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {impactAnalysis.recommended_for.map((blend, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-amber-900/30 text-amber-300 rounded text-xs">
                            {blend}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-[#e8d5b7]/60">Overall:</span>
                    <p className="text-[#e8d5b7] mt-1 font-medium">{impactAnalysis.recommendation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {!impactAnalysis ? (
                <>
                  <Button
                    onClick={handleAnalyzeImpact}
                    disabled={analyzing}
                    className="bg-blue-600 hover:bg-blue-700 col-span-2"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Analyze Impact
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-[#e8d5b7]/30"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleAddToCollection}
                    disabled={adding}
                    className="bg-[#8b3a3a] hover:bg-[#6d2e2e]"
                  >
                    {adding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Add
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-[#e8d5b7]/30"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setIdentified(null);
                      setImpactAnalysis(null);
                    }}
                    variant="outline"
                    className="border-[#e8d5b7]/30"
                  >
                    Try Another
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}