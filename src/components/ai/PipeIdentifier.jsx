import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScanSearch, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function PipeIdentifier({ pipe, onUpdatePipe }) {
  const [loading, setLoading] = useState(false);
  const [identification, setIdentification] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const identifyPipe = async () => {
    if (!pipe.stamping_photos?.length && !pipe.photos?.length) {
      return;
    }

    setLoading(true);
    try {
      const photos = [...(pipe.stamping_photos || []), ...(pipe.photos || [])];
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe identifier with extensive knowledge of pipe makers, stamps, and hallmarks. Analyze these images to identify this pipe.

Known information:
- Name: ${pipe.name || 'Not specified'}
- Claimed Maker: ${pipe.maker || 'Unknown'}
- Stamping Text: ${pipe.stamping || 'Not specified'}
- Shape: ${pipe.shape || 'Unknown'}
- Material: ${pipe.bowl_material || 'Unknown'}

Based on the images (especially any stamping/hallmarks visible), identify:
1. The actual maker/brand
2. The production era/date range
3. The specific model or line if identifiable
4. Country of origin
5. Any notable features or authenticity indicators

Search for information about pipe stamps, hallmarks, and maker marks to accurately identify this pipe.

Provide the identification in JSON format with:
- identified_maker: the maker/brand name
- confidence: "high", "medium", or "low"
- model_line: specific model or line if known
- estimated_era: when it was likely made
- country: country of manufacture
- identification_basis: what led to this identification
- authenticity_notes: any concerns or confirmations about authenticity
- additional_info: interesting facts about this maker or model
- suggested_updates: object with any fields that should be updated on the pipe record`,
        add_context_from_internet: true,
        file_urls: photos,
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
                country_of_origin: { type: "string" }
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

  const hasPhotos = pipe.stamping_photos?.length > 0 || pipe.photos?.length > 0;

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
          <h3 className="text-lg font-semibold text-stone-800 mb-2">AI Pipe Identification</h3>
          <p className="text-stone-500 mb-6 max-w-md mx-auto">
            {hasPhotos 
              ? "Analyze photos and stamps to identify maker, era, and authenticity"
              : "Add photos of your pipe and its stamping for AI identification"
            }
          </p>
          <Button
            onClick={identifyPipe}
            disabled={loading || !hasPhotos}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <ScanSearch className="w-4 h-4 mr-2" />
                Identify Pipe
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
              <h3 className="font-semibold text-stone-800">Results</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? 'Show' : 'Hide'}
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
                    Identification Result
                  </CardTitle>
                  <Badge className={confidenceColors[identification.confidence]}>
                    {identification.confidence} confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-stone-500">Maker</p>
                    <p className="font-semibold text-stone-800">{identification.identified_maker || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Model/Line</p>
                    <p className="font-semibold text-stone-800">{identification.model_line || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Era</p>
                    <p className="font-semibold text-stone-800">{identification.estimated_era || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Country</p>
                    <p className="font-semibold text-stone-800">{identification.country || 'Unknown'}</p>
                  </div>
                </div>

                {identification.suggested_updates && Object.keys(identification.suggested_updates).length > 0 && (
                  <Button 
                    onClick={handleApplyUpdates}
                    className="w-full bg-violet-600 hover:bg-violet-700"
                  >
                    Apply Suggested Updates
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Identification Basis */}
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">How We Identified It</CardTitle>
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
                    Authenticity Notes
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
                  <CardTitle className="text-lg">About This Pipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-stone-600">{identification.additional_info}</p>
                </CardContent>
              </Card>
            )}

              <div className="text-center">
                <Button variant="outline" onClick={() => setIdentification(null)}>
                  Identify Again
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