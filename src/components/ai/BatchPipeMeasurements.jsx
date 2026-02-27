import React, { useState } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Helper functions
const isBlank = (v) => v === null || v === undefined || v === "";
const isUnknown = (v) => typeof v === "string" && v.trim().toLowerCase() === "unknown";
const isMissingMeasurement = (v) => isBlank(v);
const isMissingGeometry = (v) => isBlank(v) || isUnknown(v);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAllPipes(userEmail) {
  const allPipes = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const batch = await base44.entities.Pipe.filter(
      { created_by: userEmail },
      "-updated_date",
      limit,
      offset
    );
    
    if (!batch || batch.length === 0) break;
    
    allPipes.push(...batch);
    
    if (batch.length < limit) break;
    offset += limit;
  }
  
  return allPipes;
}

export default function BatchPipeMeasurements({ user, onComplete }) {
  const [processing, setProcessing] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const { t } = useTranslation();

  const handleBatchProcess = async () => {
    setProcessing(true);
    setProgress({ current: 0, total: 0, currentPipe: "" });
    setResults(null);

    try {
      // Fetch all pipes with pagination
      const allPipes = await fetchAllPipes(user?.email);
      
      if (allPipes.length === 0) {
        toast.info(t('batchPipes.noPipes'));
        setProcessing(false);
        return;
      }

      // Determine eligible pipes (any geometry field missing/Unknown)
      const geometryFields = ["shape", "bowlStyle", "shankShape", "bend", "sizeClass"];
      const eligiblePipes = allPipes.filter((pipe) =>
        geometryFields.some((field) => isMissingGeometry(pipe[field]))
      );

      if (eligiblePipes.length === 0) {
        setResults({
          total: allPipes.length,
          eligible: 0,
          updated: 0,
          skipped: allPipes.length,
          failed: 0,
          details: [],
        });
        setProcessing(false);
        toast.info(t('batchPipes.alreadyComplete'));
        return;
      }

      setProgress({ current: 0, total: eligiblePipes.length, currentPipe: "" });

      const batchResults = [];
      let updateCount = 0;
      let failCount = 0;

      // Process each eligible pipe sequentially
      for (let i = 0; i < eligiblePipes.length; i++) {
        const pipe = eligiblePipes[i];
        
        setProgress({ current: i + 1, total: eligiblePipes.length, currentPipe: pipe.name });

        try {
          const hasPhotos = (pipe.photos || []).length > 0;
          const hasDimensions =
            pipe.length_mm ||
            pipe.bowl_height_mm ||
            pipe.bowl_width_mm ||
            pipe.bowl_diameter_mm ||
            pipe.weight_grams;

          if (!hasPhotos && !hasDimensions) {
            batchResults.push({
              pipeId: pipe.id,
              pipeName: pipe.name,
              status: "skipped",
              message: "No photos or dimensions available",
            });
            continue;
          }

          // Build analysis prompt
          const prompt = `Analyze this pipe and propose geometry classifications for ONLY the missing/unknown fields.

**Pipe:** ${pipe.name} ${pipe.maker ? `(${pipe.maker})` : ""}
**Dimensions:** ${[
            pipe.length_mm && `Length ${pipe.length_mm}mm`,
            pipe.bowl_height_mm && `Bowl Height ${pipe.bowl_height_mm}mm`,
            pipe.bowl_width_mm && `Bowl Width ${pipe.bowl_width_mm}mm`,
            pipe.bowl_diameter_mm && `Chamber Ø ${pipe.bowl_diameter_mm}mm`,
            pipe.weight_grams && `Weight ${pipe.weight_grams}g`,
          ]
            .filter(Boolean)
            .join(", ") || "None"}

**Current Geometry:**
${geometryFields.map((f) => `- ${f}: ${pipe[f] || "Unknown"} ${isMissingGeometry(pipe[f]) ? "← NEEDS UPDATE" : ""}`).join("\n")}

Only propose values for fields marked "NEEDS UPDATE". Use strict enums. Return minimal confident suggestions.`;

          const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            file_urls: pipe.photos || [],
            response_json_schema: {
              type: "object",
              properties: {
                proposed: {
                  type: "object",
                  properties: {
                    shape: { type: "string" },
                    bowlStyle: { type: "string" },
                    shankShape: { type: "string" },
                    bend: { type: "string" },
                    sizeClass: { type: "string" },
                  },
                },
                confidence: {
                  type: "object",
                  properties: {
                    shape: { type: "string" },
                    bowlStyle: { type: "string" },
                    shankShape: { type: "string" },
                    bend: { type: "string" },
                    sizeClass: { type: "string" },
                  },
                },
              },
            },
          });

          // Build updates object (only fields that are missing AND proposed with Medium+ confidence)
          const updates = {};
          geometryFields.forEach((field) => {
            const currentValue = pipe[field];
            const proposedValue = result?.proposed?.[field];
            const confidence = result?.confidence?.[field];

            if (
              isMissingGeometry(currentValue) &&
              proposedValue &&
              proposedValue !== "Unknown" &&
              (confidence === "High" || confidence === "Medium")
            ) {
              updates[field] = proposedValue;
            }
          });

          if (Object.keys(updates).length === 0) {
            batchResults.push({
              pipeId: pipe.id,
              pipeName: pipe.name,
              status: "skipped",
              message: "No confident suggestions available",
            });
          } else if (dryRun) {
            batchResults.push({
              pipeId: pipe.id,
              pipeName: pipe.name,
              status: "preview",
              fieldsChanged: Object.keys(updates),
              updates,
            });
          } else {
            // Apply updates with retry logic
            let retries = 0;
            let success = false;

            while (retries < 3 && !success) {
              try {
                await safeUpdate("Pipe", pipe.id, updates, user?.email);
                success = true;
                updateCount++;
                batchResults.push({
                  pipeId: pipe.id,
                  pipeName: pipe.name,
                  status: "updated",
                  fieldsChanged: Object.keys(updates),
                  updates,
                });
              } catch (err) {
                retries++;
                if (retries < 3) {
                  await sleep(retries === 1 ? 500 : 1500);
                } else {
                  throw err;
                }
              }
            }
          }

          // Rate limiting
          await sleep(Math.random() * 500 + 300);
        } catch (err) {
          console.error(`Failed to process pipe ${pipe.id}:`, err);
          failCount++;
          batchResults.push({
            pipeId: pipe.id,
            pipeName: pipe.name,
            status: "failed",
            errorMessage: err.message || "Unknown error",
          });
        }
      }

      setResults({
        total: allPipes.length,
        eligible: eligiblePipes.length,
        updated: updateCount,
        skipped: eligiblePipes.length - updateCount - failCount,
        failed: failCount,
        details: batchResults,
      });

      if (!dryRun && updateCount > 0) {
        toast.success(t('batchPipes.updatedPipes', { count: updateCount }));
        onComplete?.();
      } else if (dryRun) {
        toast.info(t('batchPipes.previewWouldUpdate', { count: batchResults.filter((r) => r.status === "preview").length }));
      }
    } catch (err) {
      console.error("Batch processing error:", err);
      toast.error(t('batchPipes.batchFailed'));
      setResults({
        total: 0,
        eligible: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        details: [{ status: "failed", errorMessage: err.message }],
      });
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  return (
    <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
      <CardHeader>
        <CardTitle className="text-[#e8d5b7]">{t('batchPipes.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[#e8d5b7]/80">
          {t('batchPipes.desc')}
        </p>

        <div className="flex items-center gap-2">
          <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} disabled={processing} />
          <Label htmlFor="dry-run" className="text-sm text-[#e8d5b7]/80 cursor-pointer">
            {t('batchPipes.dryRunLabel')}
          </Label>
        </div>

        <Button
          onClick={handleBatchProcess}
          disabled={processing}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('batchPipes.processing')}
            </>
          ) : (
            <>{t('batchPipes.processBtn')}</>
          )}
        </Button>

        {/* Progress Indicator */}
        {progress && (
          <div className="border border-[#e8d5b7]/20 rounded-lg p-4 bg-[#1a2c42]/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#e8d5b7]">
                {t('batchPipes.processingProgress', { current: progress.current, total: progress.total })}
              </span>
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            </div>
            <p className="text-xs text-[#e8d5b7]/70">Current: {progress.currentPipe}</p>
          </div>
        )}

        {/* Results Summary */}
        {results && (
          <div className="border border-[#e8d5b7]/20 rounded-lg p-4 bg-[#1a2c42]/50 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[#e8d5b7]/70">Total Pipes:</span>
                <span className="ml-2 font-semibold text-[#e8d5b7]">{results.total}</span>
              </div>
              <div>
                <span className="text-[#e8d5b7]/70">Eligible:</span>
                <span className="ml-2 font-semibold text-[#e8d5b7]">{results.eligible}</span>
              </div>
              <div>
                <span className="text-[#e8d5b7]/70">Updated:</span>
                <span className="ml-2 font-semibold text-green-400">{results.updated}</span>
              </div>
              <div>
                <span className="text-[#e8d5b7]/70">Skipped:</span>
                <span className="ml-2 font-semibold text-[#e8d5b7]/60">{results.skipped}</span>
              </div>
              {results.failed > 0 && (
                <div>
                  <span className="text-[#e8d5b7]/70">Failed:</span>
                  <span className="ml-2 font-semibold text-red-400">{results.failed}</span>
                </div>
              )}
            </div>

            {/* Detailed Results */}
            {results.details && results.details.length > 0 && (
              <div className="border-t border-[#e8d5b7]/10 pt-3 max-h-96 overflow-y-auto space-y-2">
                <h4 className="text-sm font-semibold text-[#e8d5b7] mb-2">Details:</h4>
                {results.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className="text-xs border border-[#e8d5b7]/10 rounded p-2 bg-[#0f1a28]/30"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {detail.status === "updated" && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                      {detail.status === "preview" && <Info className="w-3 h-3 text-blue-400" />}
                      {detail.status === "skipped" && <AlertCircle className="w-3 h-3 text-[#e8d5b7]/50" />}
                      {detail.status === "failed" && <XCircle className="w-3 h-3 text-red-400" />}
                      <span className="font-semibold text-[#e8d5b7]">
                        {detail.pipeName || "Unknown pipe"}
                      </span>
                      <Badge
                        variant={
                          detail.status === "updated" || detail.status === "preview"
                            ? "success"
                            : detail.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="ml-auto"
                      >
                        {detail.status}
                      </Badge>
                    </div>
                    {detail.fieldsChanged && (
                      <p className="text-[#e8d5b7]/70 mt-1">
                        Fields: {detail.fieldsChanged.join(", ")}
                      </p>
                    )}
                    {detail.updates && (
                      <div className="mt-1 text-[#e8d5b7]/60">
                        {Object.entries(detail.updates).map(([key, value]) => (
                          <div key={key}>
                            • {key}: <span className="text-teal-400">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {detail.message && <p className="text-[#e8d5b7]/60 mt-1">{detail.message}</p>}
                    {detail.errorMessage && <p className="text-red-400 mt-1">Error: {detail.errorMessage}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}