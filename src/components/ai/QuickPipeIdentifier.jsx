import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, Loader2, CheckCircle2, Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { invalidatePipeQueries } from "@/components/utils/cacheInvalidation";
import FeatureGate from "@/components/subscription/FeatureGate";
import { waitForAssistantMessage } from "@/components/utils/agentWait";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";

export default function QuickPipeIdentifier({ pipes, blends }) {
  const { t } = useTranslation();
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
  const [clarificationNeeded, setClarificationNeeded] = useState(null);
  const [clarificationResponses, setClarificationResponses] = useState({});
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

      // First pass: Deep analysis and clarification check
      const clarificationPrompt = `You are an expert pipe identifier. Analyze these pipe photos carefully, paying special attention to:
- Stampings, hallmarks, and maker's marks
- Shape characteristics and proportions
- Material quality and finish type
- Any distinctive features or craftsmanship details

${additionalContext ? `User provided context:\n${additionalContext}\n\n` : ''}
Examine the photos thoroughly. If you can make a confident identification, provide it. If you need more information to give an accurate identification, ask specific clarifying questions.

Return a JSON object:
{
  "needs_clarification": true/false,
  "clarification_questions": ["Question 1?", "Question 2?"] (if needs_clarification is true),
  "initial_observations": "What you can determine from the photos",
  "confidence_without_clarification": "high/medium/low"
}`;

      const clarificationCheck = await base44.integrations.Core.InvokeLLM({
        prompt: clarificationPrompt,
        file_urls: photos,
        response_json_schema: {
          type: "object",
          properties: {
            needs_clarification: { type: "boolean" },
            clarification_questions: { type: "array", items: { type: "string" } },
            initial_observations: { type: "string" },
            confidence_without_clarification: { type: "string" }
          }
        }
      });

      // If clarification needed and confidence is not high, show questions
      if (clarificationCheck.needs_clarification && clarificationCheck.confidence_without_clarification !== 'high') {
        setClarificationNeeded(clarificationCheck);
        setLoading(false);
        return;
      }

      // Otherwise proceed with identification
      await performFinalIdentification(additionalContext);
    } catch (error) {
      console.error('Identification failed:', error);
      alert('Failed to identify pipe. Please try again.');
      setLoading(false);
    }
  };

  const performFinalIdentification = async (additionalContext) => {
    try {
      console.log('[IDENTIFY] Using expert_tobacconist agent for final identification');
      
      // Route to expert_tobacconist agent
      const conversation = await base44.agents.createConversation({
        agent_name: 'expert_tobacconist',
        metadata: { source: 'pipe_identifier_final' }
      });
      
      const clarificationContext = Object.entries(clarificationResponses)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n');

      const identificationPrompt = `Please identify this pipe from the photos and provide detailed information.

${additionalContext ? `User provided context:\n${additionalContext}\n\n` : ''}${clarificationContext ? `Additional clarifications:\n${clarificationContext}\n\n` : ''}I need:
- Name/description
- Maker/brand
- Shape
- Bowl material
- Finish type
- Stem material
- Estimated market value
- Year/era made
- Any visible stampings/markings
- Additional observations
- Your confidence level (high/medium/low)`;

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: identificationPrompt,
        file_urls: photos
      });
      
      console.log('[IDENTIFY] Waiting for final identification...');
      
      // Wait for assistant response asynchronously
      let responseText = "";
      try {
        responseText = await waitForAssistantMessage(conversation.id);
      } catch (err) {
        console.error('[IDENTIFY] Response wait failed:', err);
        responseText = "Failed to receive identification. Please try again.";
      }
      
      // Parse agent response
      const parsePrompt = `Extract pipe details from this expert response into structured data:

${responseText}

Return JSON:
{
  "name": "Brief name",
  "maker": "Brand/maker",
  "shape": "Shape",
  "bowl_material": "Bowl material",
  "finish": "Finish",
  "stem_material": "Stem material",
  "estimated_value": 150,
  "year_made": "Year/era",
  "stamping": "Markings",
  "notes": "Observations",
  "confidence": "high/medium/low"
}`;

      const parsed = await base44.integrations.Core.InvokeLLM({
        prompt: parsePrompt,
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

      setIdentified({ ...parsed, agent_response: responseText });
      setClarificationNeeded(null);
      setClarificationResponses({});
    } catch (error) {
      console.error('Identification failed:', error);
      alert('Failed to identify pipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationSubmit = async () => {
    setLoading(true);
    try {
      console.log('[IDENTIFY] Submitting clarification responses to expert_tobacconist agent');
      
      // If we have a conversation ID from clarification, continue it
      if (clarificationNeeded?.agent_conversation_id) {
        const clarificationText = Object.entries(clarificationResponses)
          .map(([q, a]) => `${q}\nAnswer: ${a}`)
          .join('\n\n');
        
        await base44.agents.addMessage(
          { id: clarificationNeeded.agent_conversation_id },
          {
            role: 'user',
            content: `Here are the answers to your clarification questions:\n\n${clarificationText}\n\nPlease provide the full pipe identification now.`
          }
        );
        
        // Wait for assistant response asynchronously
        let responseText = "";
        try {
          responseText = await waitForAssistantMessage(clarificationNeeded.agent_conversation_id);
        } catch (err) {
          console.error('[IDENTIFY] Clarification response wait failed:', err);
          responseText = "Failed to receive clarification response.";
        }
        
        // Parse the response
        const parsePrompt = `Extract pipe identification details from this expert response:

${responseText}

Return JSON with these exact fields:
{
  "name": "Brief descriptive name",
  "maker": "Brand/maker",
  "shape": "Pipe shape",
  "bowl_material": "Bowl material",
  "finish": "Finish type",
  "stem_material": "Stem material",
  "estimated_value": 150,
  "year_made": "Era/year",
  "stamping": "Visible marks",
  "notes": "Additional observations",
  "confidence": "high/medium/low"
}`;

        const parsed = await base44.integrations.Core.InvokeLLM({
          prompt: parsePrompt,
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

        setIdentified({ ...parsed, agent_response: responseText });
        setClarificationNeeded(null);
        setClarificationResponses({});
      } else {
        // Fallback to original logic if no conversation ID
        const additionalContext = [
          hints.name && `Name/Description: ${hints.name}`,
          hints.maker && `Brand/Maker: ${hints.maker}`,
          hints.shape && `Shape: ${hints.shape}`,
          hints.stamping && `Stampings/Markings: ${hints.stamping}`
        ].filter(Boolean).join('\n');
        
        await performFinalIdentification(additionalContext);
      }
    } catch (error) {
      console.error('Clarification failed:', error);
      toast.error(t("quickPipeIdentifier.clarificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeImpact = async () => {
    if (!identified) return;

    setAnalyzing(true);
    try {
      console.log('[IMPACT] Routing impact analysis to expert_tobacconist agent');
      
      // Route to expert_tobacconist agent for impact analysis
      const conversation = await base44.agents.createConversation({
        agent_name: 'expert_tobacconist',
        metadata: { source: 'pipe_impact_analysis' }
      });
      
      const impactPrompt = `I'm considering adding this pipe to my collection:

Pipe Details:
- Name: ${identified.name}
- Maker: ${identified.maker || 'Unknown'}
- Shape: ${identified.shape || 'Unknown'}
- Material: ${identified.bowl_material || 'Unknown'}
- Estimated Value: $${identified.estimated_value || 'Unknown'}

Please analyze the impact of adding this pipe:
1. What gap does it fill in my current collection?
2. Is there any redundancy with my existing pipes?
3. Which of my tobacco blends would pair best with it?
4. What's the overall value proposition?
5. Would you recommend adding it: Strong addition / Good addition / Consider alternatives?`;

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: impactPrompt
      });
      
      console.log('[IMPACT] Waiting for impact analysis response...');
      
      // Wait for assistant response asynchronously
      let responseText = "";
      try {
        responseText = await waitForAssistantMessage(conversation.id);
      } catch (err) {
        console.error('[IMPACT] Response wait failed:', err);
        responseText = "Failed to receive impact analysis.";
      }
      
      // Parse the agent's response to extract structured data
      const parsePrompt = `Extract impact analysis from this expert response:

${responseText}

Return JSON:
{
  "fills_gap": "What gap this fills",
  "redundancy": "Redundancy notes",
  "recommended_for": ["Blend names"],
  "value_proposition": "Overall value",
  "recommendation": "Strong addition / Good addition / Consider alternatives"
}`;

      const parsed = await base44.integrations.Core.InvokeLLM({
        prompt: parsePrompt,
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

      setImpactAnalysis({ ...parsed, agent_response: responseText });
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
      invalidatePipeQueries(queryClient);
      
      // Navigate to the new pipe detail page
      navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(newPipe.id)}`));
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
    setClarificationNeeded(null);
    setClarificationResponses({});
  };

  return (
    <FeatureGate 
      feature="AI_IDENTIFY"
      featureName="Quick Pipe Identifier"
      description="Identify and add pipes to your collection instantly using AI photo analysis. Available in Pro tier or for grandfathered Premium users."
    >
    <Card className="bg-[#223447] border-[#E0D8C8]/15">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#A35C5C]/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#A35C5C]" />
          </div>
          <div>
            <p className="font-semibold text-[#E0D8C8] text-lg">AI Pipe Identifier</p>
            <p className="text-sm text-[#E0D8C8]/70">Upload photos to identify and add pipes instantly</p>
          </div>
        </div>

        {clarificationNeeded && !identified ? (
           <div className="space-y-4">
             {/* Initial Observations */}
             <div className="bg-[#1E2F43] rounded-lg p-4 border border-[#E0D8C8]/15">
               <p className="text-xs text-[#E0D8C8]/60 font-semibold mb-2">{t("aiIdentifier.initialAnalysis")}</p>
               <p className="text-sm text-[#E0D8C8]">{clarificationNeeded.initial_observations}</p>
             </div>

             {/* Clarification Questions */}
             <div className="bg-[#1E2F43] border border-[#E0D8C8]/15 rounded-lg p-4">
               <p className="text-sm font-semibold text-[#E0D8C8] mb-3">{t("aiIdentifier.additionalInfoNeeded")}</p>
               <div className="space-y-3">
                 {clarificationNeeded.clarification_questions?.map((question, idx) => (
                   <div key={idx}>
                     <Label className="text-sm text-[#E0D8C8] mb-1.5 block font-medium">{question}</Label>
                     <Input
                       placeholder={t("aiIdentifier.yourAnswer")}
                       value={clarificationResponses[question] || ''}
                       onChange={(e) => setClarificationResponses({
                         ...clarificationResponses,
                         [question]: e.target.value
                       })}
                     />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleClarificationSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("aiIdentifier.analyzing")}
                  </>
                ) : (
                  t("aiIdentifier.continueIdentification")
                )}
              </Button>
              <Button
                onClick={() => {
                  setClarificationNeeded(null);
                  setClarificationResponses({});
                }}
                variant="outline"
                className="border-[#e8d5b7]/30"
              >
                {t("aiIdentifier.skipIdentifyNow")}
              </Button>
            </div>
          </div>
        ) : !identified ? (
          <div className="space-y-4">
          {/* Photo Upload Section */}
          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer">
              <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[#E0D8C8]/20 rounded-lg hover:border-[#A35C5C]/50 transition-colors bg-[#1E2F43]">
                <Upload className="w-5 h-5 text-[#E0D8C8]/60 mb-1" />
                <span className="text-xs text-[#E0D8C8]/60 font-medium">{t("aiIdentifier.uploadPhotos")}</span>
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
              <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[#E0D8C8]/20 rounded-lg hover:border-[#A35C5C]/50 transition-colors bg-[#1E2F43]">
                <Camera className="w-5 h-5 text-[#E0D8C8]/60 mb-1" />
                <span className="text-xs text-[#E0D8C8]/60 font-medium">{t("aiIdentifier.takePhoto")}</span>
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
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E0D8C8]/15">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Optional Hint Fields */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm text-[#E0D8C8] font-medium">
                {t("aiIdentifier.optionalHints")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t("aiIdentifier.nameDesc")}
                  value={hints.name}
                  onChange={(e) => setHints({...hints, name: e.target.value})}
                />
                <Input
                  placeholder={t("aiIdentifier.brandMaker")}
                  value={hints.maker}
                  onChange={(e) => setHints({...hints, maker: e.target.value})}
                />
                <Input
                  placeholder={t("aiIdentifier.shape")}
                  value={hints.shape}
                  onChange={(e) => setHints({...hints, shape: e.target.value})}
                />
                <Input
                  placeholder={t("aiIdentifier.stampings")}
                  value={hints.stamping}
                  onChange={(e) => setHints({...hints, stamping: e.target.value})}
                />
              </div>
            </div>

            {/* Identify Button */}
            <Button
              onClick={handleIdentify}
              disabled={photos.length === 0 || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("aiIdentifier.identifying")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("aiIdentifier.identifyPipe")}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Identification Results */}
            <div className="bg-[#1E2F43] rounded-lg p-4 space-y-2 border border-[#E0D8C8]/15">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[#E0D8C8] text-lg">{identified.name}</p>
                  <p className="text-sm text-[#E0D8C8]/70">{identified.maker || t("aiIdentifier.unknownMaker")}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#2EAF6F]/20 border border-[#2EAF6F]/30">
                  <CheckCircle2 className="w-3 h-3 text-[#2EAF6F]" />
                  <span className="text-xs text-[#2EAF6F] font-medium">{identified.confidence}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {identified.shape && (
                  <span className="text-xs px-2 py-1 bg-[#A35C5C]/20 text-[#E0D8C8] border border-[#A35C5C]/30 rounded font-medium">
                    {identified.shape}
                  </span>
                )}
                {identified.bowl_material && (
                  <span className="text-xs px-2 py-1 bg-[#A35C5C]/20 text-[#E0D8C8] border border-[#A35C5C]/30 rounded font-medium">
                    {identified.bowl_material}
                  </span>
                )}
                {identified.estimated_value && (
                  <span className="text-xs px-2 py-1 bg-[#2EAF6F]/20 text-[#2EAF6F] border border-[#2EAF6F]/30 rounded font-medium">
                    ${identified.estimated_value}
                  </span>
                )}
              </div>

              {identified.notes && (
                <p className="text-xs text-[#E0D8C8]/70 mt-2 pt-2 border-t border-[#E0D8C8]/15">
                  {identified.notes}
                </p>
              )}
            </div>

            {/* Impact Analysis */}
            {impactAnalysis && (
              <div className="bg-[#1E2F43] rounded-lg p-4 border border-[#E0D8C8]/15 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#A35C5C]" />
                  <span className="font-semibold text-[#E0D8C8] text-sm">Collection Impact</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[#E0D8C8]/70 font-medium">Fills Gap:</span>
                    <p className="text-[#E0D8C8] mt-1">{impactAnalysis.fills_gap}</p>
                  </div>

                  {impactAnalysis.redundancy && (
                    <div>
                      <span className="text-[#E0D8C8]/70 font-medium">Redundancy Check:</span>
                      <p className="text-[#E0D8C8] mt-1">{impactAnalysis.redundancy}</p>
                    </div>
                  )}

                  {impactAnalysis.recommended_for?.length > 0 && (
                    <div>
                      <span className="text-[#E0D8C8]/70 font-medium">Best For:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {impactAnalysis.recommended_for.map((blend, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#A35C5C]/20 text-[#E0D8C8] border border-[#A35C5C]/30 rounded text-xs font-medium">
                            {blend}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[#E0D8C8]/70 font-medium">Overall:</span>
                    <p className="text-[#E0D8C8] mt-1 font-semibold">{impactAnalysis.recommendation}</p>
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
                    className="col-span-2"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("aiIdentifier.analyzing")}
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {t("optimizer.analyzeImpact")}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-[#e8d5b7]/30"
                  >
                    {t("forms.cancel")}
                  </Button>
                </>
                ) : (
                <>
                  <Button
                    onClick={handleAddToCollection}
                    disabled={adding}
                  >
                    {adding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("aiIdentifier.adding")}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {t("aiIdentifier.add")}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-[#e8d5b7]/30"
                  >
                    {t("forms.cancel")}
                  </Button>
                  <Button
                    onClick={() => {
                      setIdentified(null);
                      setImpactAnalysis(null);
                    }}
                    variant="outline"
                    className="border-[#e8d5b7]/30"
                  >
                    {t("aiIdentifier.tryAnother")}
                  </Button>
                </>
                )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </FeatureGate>
  );
}