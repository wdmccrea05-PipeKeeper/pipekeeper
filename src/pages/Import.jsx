import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invalidatePipeQueries, invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";

const PIPE_TEMPLATE_HEADERS = [
  'name', 'maker', 'country_of_origin', 'shape', 'length_mm', 'weight_grams',
  'bowl_height_mm', 'bowl_width_mm', 'bowl_diameter_mm', 'bowl_depth_mm',
  'chamber_volume', 'stem_material', 'bowl_material', 'finish', 'filter_type',
  'year_made', 'stamping', 'condition', 'purchase_price', 'estimated_value', 'notes'
];

const TOBACCO_TEMPLATE_HEADERS = [
  'name', 'manufacturer', 'blend_type', 'cut', 'strength', 'room_note',
  'tin_size_oz', 'tin_total_tins', 'tin_tins_open', 'tin_tins_cellared', 'tin_cellared_date',
  'bulk_total_quantity_oz', 'bulk_open', 'bulk_cellared', 'bulk_cellared_date',
  'pouch_size_oz', 'pouch_total_pouches', 'pouch_pouches_open', 'pouch_pouches_cellared', 'pouch_cellared_date',
  'production_status', 'aging_potential', 'rating', 'notes'
];

export default function ImportPage() {
  const { t } = useTranslation();
  const [uploadingPipes, setUploadingPipes] = useState(false);
  const [uploadingTobacco, setUploadingTobacco] = useState(false);
  const [pipeResults, setPipeResults] = useState(null);
  const [tobaccoResults, setTobaccoResults] = useState(null);
  
  const queryClient = useQueryClient();

  const { user, hasPaid: isPaidUser } = useCurrentUser();

  const downloadPipeTemplate = () => {
    const csvContent = PIPE_TEMPLATE_HEADERS.join(',') + '\n' +
      'Example Pipe,Peterson,Ireland,Billiard,140,45,40,35,18,35,Medium,Vulcanite,Briar,Smooth,None,2020,System Standard 314,Excellent,120,150,My favorite pipe\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipe_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTobaccoTemplate = () => {
    const csvContent = TOBACCO_TEMPLATE_HEADERS.join(',') + '\n' +
      'Example Blend,Cornell & Diehl,English,Ribbon,Medium,Pleasant,1.75,5,1,4,2025-01-15,16,2,14,2025-01-10,1.5,3,1,2,2025-01-12,Current Production,Excellent,4.5,Great everyday smoke\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tobacco_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // RFC-4180 compliant CSV line parser — handles quoted commas, escaped quotes, blank cells
  const parseCSVLine = (line) => {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const PIPE_NUMERIC = ['length_mm','weight_grams','bowl_height_mm','bowl_width_mm','bowl_diameter_mm','bowl_depth_mm','purchase_price','estimated_value'];
  const TOBACCO_NUMERIC = ['tin_size_oz','tin_total_tins','tin_tins_open','tin_tins_cellared','bulk_total_quantity_oz','bulk_open','bulk_cellared','pouch_size_oz','pouch_total_pouches','pouch_pouches_open','pouch_pouches_cellared','rating'];

  const parseCSV = (text, requiredHeaders, numericFields) => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['No data rows found in CSV.'] };
    const headers = parseCSVLine(lines[0]);
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) return { data: [], errors: [`Missing required columns: ${missing.join(', ')}`] };
    const data = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((header, idx) => {
        const val = values[idx] ?? '';
        if (val !== '') {
          if (numericFields.includes(header)) {
            const n = parseFloat(val);
            if (!isNaN(n)) obj[header] = n;
            else errors.push(`Row ${i}: "${header}" has non-numeric value "${val}"`);
          } else {
            obj[header] = val;
          }
        }
      });
      if (Object.keys(obj).length > 0) data.push(obj);
    }
    return { data, errors };
  };

  const handlePipeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPipes(true);
    setPipeResults(null);

    try {
      const text = await file.text();
      const { data: pipes, errors: parseErrors } = parseCSV(text, ['name'], PIPE_NUMERIC);
      
      if (parseErrors.length > 0 && pipes.length === 0) {
        setPipeResults({ success: 0, failed: 0, total: 0, errors: parseErrors });
        return;
      }

      let success = 0;
      let failed = 0;
      const rowErrors = [...parseErrors];

      for (const pipe of pipes) {
        try {
          await base44.entities.Pipe.create(pipe);
          success++;
        } catch (error) {
          failed++;
          rowErrors.push(`Failed to import pipe "${pipe.name || '(unknown)'}": ${error?.message || 'unknown error'}`);
        }
      }

      setPipeResults({ success, failed, total: pipes.length, errors: rowErrors });
      invalidatePipeQueries(queryClient, user?.email);
    } catch (error) {
      toast.error(t("import.csvParseFailed"));
    } finally {
      setUploadingPipes(false);
      e.target.value = '';
    }
  };

  const handleTobaccoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingTobacco(true);
    setTobaccoResults(null);

    try {
      const text = await file.text();
      const { data: blends, errors: parseErrors } = parseCSV(text, ['name'], TOBACCO_NUMERIC);

      if (parseErrors.length > 0 && blends.length === 0) {
        setTobaccoResults({ success: 0, failed: 0, total: 0, errors: parseErrors });
        return;
      }

      let success = 0;
      let failed = 0;
      const rowErrors = [...parseErrors];

      for (const blend of blends) {
        try {
          await base44.entities.TobaccoBlend.create(blend);
          success++;
        } catch (error) {
          failed++;
          rowErrors.push(`Failed to import blend "${blend.name || '(unknown)'}": ${error?.message || 'unknown error'}`);
        }
      }

      setTobaccoResults({ success, failed, total: blends.length, errors: rowErrors });
      invalidateBlendQueries(queryClient, user?.email);
    } catch (error) {
      toast.error(t("import.csvParseFailed"));
    } finally {
      setUploadingTobacco(false);
      e.target.value = '';
    }
  };

  if (!isPaidUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a href={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("supportFull.backToHome")}
            </Button>
          </a>
          <UpgradePrompt 
            featureName={t("import.bulkImport")}
            description={t("import.upgradeDesc")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.backToHome")}
          </Button>
        </a>

        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-3xl text-stone-100 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-[#8b3a3a]" />
              {t("import.bulkImport")}
            </CardTitle>
            <CardDescription className="text-stone-300">
              {t("import.bulkImportDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pipes" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pipes">{t("import.importPipes")}</TabsTrigger>
                <TabsTrigger value="tobacco">{t("import.importTobacco")}</TabsTrigger>
              </TabsList>

              <TabsContent value="pipes" className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">{t("import.howToImportPipes")}</h3>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-3">
                    <li>{t("import.step1Template")}</li>
                    <li>{t("import.step2OpenSpreadsheet")}</li>
                    <li>{t("import.step3FillPipes")}</li>
                    <li>{t("import.step4SaveCSV")}</li>
                    <li>{t("import.step5Upload")}</li>
                  </ol>
                  <div className="mt-3 pt-3 border-t border-amber-300">
                    <p className="text-sm font-semibold text-amber-900 mb-1">{t("import.requiredFields")}:</p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• <strong>{t("import.fieldName")}</strong> - {t("import.pipeNameDesc")}</li>
                      <li>• <strong>{t("import.fieldMaker")}</strong> - {t("import.pipeMakerDesc")}</li>
                    </ul>
                    <p className="text-xs text-amber-700 mt-2 italic">{t("import.pipeNoteCustom")}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={downloadPipeTemplate} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    {t("import.downloadPipeTemplate")}
                  </Button>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-2 text-sm text-yellow-800">
                  ⚠️ Review your CSV carefully. Quoted values with commas are supported. Use the template to avoid formatting issues.
                </div>

                <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-600 mb-4">{t("import.uploadCompletedCSV")}</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handlePipeUpload}
                    disabled={uploadingPipes}
                    className="max-w-xs mx-auto"
                  />
                  {uploadingPipes && <p className="text-sm text-stone-500 mt-2">{t("import.importingPipes")}</p>}
                </div>

                {pipeResults && (
                  <Card className={pipeResults.failed === 0 && !pipeResults.errors?.length ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        {pipeResults.failed === 0 && !pipeResults.errors?.length ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{t("import.importComplete")}</p>
                          <p className="text-sm">
                            {t("import.pipesImportedSuccess", { count: pipeResults.success })}
                            {pipeResults.failed > 0 && `, ${t("import.importFailed", { count: pipeResults.failed })}`}
                            {` (${pipeResults.total} rows detected)`}
                          </p>
                          {pipeResults.errors?.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-yellow-800 max-h-32 overflow-y-auto">
                              {pipeResults.errors.map((e, i) => <li key={i}>• {e}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="tobacco" className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">{t("import.howToImportTobacco")}</h3>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-3">
                    <li>{t("import.step1Template")}</li>
                    <li>{t("import.step2OpenSpreadsheet")}</li>
                    <li>{t("import.step3FillTobacco")}</li>
                    <li>{t("import.step4SaveCSV")}</li>
                    <li>{t("import.step5Upload")}</li>
                  </ol>
                  <div className="mt-3 pt-3 border-t border-amber-300">
                    <p className="text-sm font-semibold text-amber-900 mb-1">{t("import.requiredFields")}:</p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• <strong>{t("import.fieldName")}</strong> - {t("import.tobaccoNameDesc")}</li>
                    </ul>
                    <p className="text-sm font-semibold text-amber-900 mt-3 mb-1">{t("import.inventoryFields")}:</p>
                    <ul className="text-xs text-amber-800 space-y-1">
                      <li>• <strong>{t("import.tins")}:</strong> tin_size_oz, tin_total_tins, tin_tins_open, tin_tins_cellared, tin_cellared_date</li>
                      <li>• <strong>{t("import.bulk")}:</strong> bulk_total_quantity_oz, bulk_open, bulk_cellared, bulk_cellared_date</li>
                      <li>• <strong>{t("import.pouches")}:</strong> pouch_size_oz, pouch_total_pouches, pouch_pouches_open, pouch_pouches_cellared, pouch_cellared_date</li>
                    </ul>
                    <p className="text-xs text-amber-700 mt-2 italic">{t("import.inventoryFieldsNote")}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={downloadTobaccoTemplate} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    {t("import.downloadTobaccoTemplate")}
                  </Button>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-2 text-sm text-yellow-800">
                  ⚠️ Review your CSV carefully. Quoted values with commas are supported. Use the template to avoid formatting issues.
                </div>

                <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-600 mb-4">{t("import.uploadCompletedCSV")}</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleTobaccoUpload}
                    disabled={uploadingTobacco}
                    className="max-w-xs mx-auto"
                  />
                  {uploadingTobacco && <p className="text-sm text-stone-500 mt-2">{t("import.importingTobacco")}</p>}
                </div>

                {tobaccoResults && (
                  <Card className={tobaccoResults.failed === 0 && !tobaccoResults.errors?.length ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        {tobaccoResults.failed === 0 && !tobaccoResults.errors?.length ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{t("import.importComplete")}</p>
                          <p className="text-sm">
                            {t("import.blendsImportedSuccess", { count: tobaccoResults.success })}
                            {tobaccoResults.failed > 0 && `, ${t("import.importFailed", { count: tobaccoResults.failed })}`}
                            {` (${tobaccoResults.total} rows detected)`}
                          </p>
                          {tobaccoResults.errors?.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-yellow-800 max-h-32 overflow-y-auto">
                              {tobaccoResults.errors.map((e, i) => <li key={i}>• {e}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}