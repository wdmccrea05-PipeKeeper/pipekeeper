import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";

const PIPE_TEMPLATE_HEADERS = [
  'name', 'maker', 'country_of_origin', 'shape', 'length_mm', 'weight_grams',
  'bowl_height_mm', 'bowl_width_mm', 'bowl_diameter_mm', 'bowl_depth_mm',
  'chamber_volume', 'stem_material', 'bowl_material', 'finish', 'filter_type',
  'year_made', 'stamping', 'condition', 'purchase_price', 'estimated_value', 'notes'
];

const TOBACCO_TEMPLATE_HEADERS = [
  'name', 'manufacturer', 'blend_type', 'cut', 'strength', 'room_note',
  'tin_size_oz', 'quantity_owned', 'tin_status', 'cellared_date', 'cellared_amount', 
  'production_status', 'aging_potential', 'rating', 'notes'
];

export default function ImportPage() {
  const [uploadingPipes, setUploadingPipes] = useState(false);
  const [uploadingTobacco, setUploadingTobacco] = useState(false);
  const [pipeResults, setPipeResults] = useState(null);
  const [tobaccoResults, setTobaccoResults] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  const EXTENDED_TRIAL_END = new Date('2026-01-15T23:59:59');
  const now = new Date();
  const isBeforeExtendedTrialEnd = now < EXTENDED_TRIAL_END;
  const isWithinSevenDayTrial = user?.created_date ? 
    now.getTime() - new Date(user.created_date).getTime() < 7 * 24 * 60 * 60 * 1000 : false;
  const isWithinTrial = isBeforeExtendedTrialEnd || isWithinSevenDayTrial;
  const isPaidUser = user?.subscription_level === 'paid' || isWithinTrial;

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
      'Example Blend,Cornell & Diehl,English,Ribbon,Medium,Pleasant,2,3,Sealed/Cellared,2025-01-15,10.5,Current Production,Excellent,4.5,Great everyday smoke\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tobacco_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (value && value !== '') {
          // Convert numeric fields
          if (['length_mm', 'weight_grams', 'bowl_height_mm', 'bowl_width_mm', 
               'bowl_diameter_mm', 'bowl_depth_mm', 'purchase_price', 'estimated_value',
               'tin_size_oz', 'quantity_owned', 'cellared_amount', 'rating'].includes(header)) {
            obj[header] = parseFloat(value);
          } else {
            obj[header] = value;
          }
        }
      });
      if (Object.keys(obj).length > 0) {
        data.push(obj);
      }
    }
    return data;
  };

  const handlePipeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPipes(true);
    setPipeResults(null);

    try {
      const text = await file.text();
      const pipes = parseCSV(text);
      
      let success = 0;
      let failed = 0;

      for (const pipe of pipes) {
        try {
          await base44.entities.Pipe.create(pipe);
          success++;
        } catch (error) {
          failed++;
        }
      }

      setPipeResults({ success, failed, total: pipes.length });
      queryClient.invalidateQueries({ queryKey: ['pipes'] });
    } catch (error) {
      alert('Failed to parse CSV file. Please check the format.');
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
      const blends = parseCSV(text);
      
      let success = 0;
      let failed = 0;

      for (const blend of blends) {
        try {
          await base44.entities.TobaccoBlend.create(blend);
          success++;
        } catch (error) {
          failed++;
        }
      }

      setTobaccoResults({ success, failed, total: blends.length });
      queryClient.invalidateQueries({ queryKey: ['blends'] });
    } catch (error) {
      alert('Failed to parse CSV file. Please check the format.');
    } finally {
      setUploadingTobacco(false);
      e.target.value = '';
    }
  };

  if (!isPaidUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a href={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </a>
          <UpgradePrompt 
            featureName="Bulk Import"
            description="Import multiple pipes and tobacco blends at once using CSV templates. Perfect for quickly building your collection from spreadsheets or other databases."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </a>

        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-3xl text-stone-900 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-[#8b3a3a]" />
              Bulk Import
            </CardTitle>
            <CardDescription className="text-stone-600">
              Import multiple pipes and tobacco blends at once using CSV templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pipes" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pipes">Import Pipes</TabsTrigger>
                <TabsTrigger value="tobacco">Import Tobacco</TabsTrigger>
              </TabsList>

              <TabsContent value="pipes" className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">How to Import Pipes</h3>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-3">
                    <li>Download the CSV template below</li>
                    <li>Open it in Excel, Google Sheets, or any spreadsheet app</li>
                    <li>Fill in your pipe data (one pipe per row)</li>
                    <li>Save as CSV format</li>
                    <li>Upload the completed file</li>
                  </ol>
                  <div className="mt-3 pt-3 border-t border-amber-300">
                    <p className="text-sm font-semibold text-amber-900 mb-1">Required Fields:</p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• <strong>name</strong> - Name or identifier for the pipe (required)</li>
                      <li>• <strong>maker</strong> - Pipe brand (e.g., Peterson, Savinelli, Custom)</li>
                    </ul>
                    <p className="text-xs text-amber-700 mt-2 italic">Note: 'Custom' is a valid maker for handmade or unbranded pipes. All other fields are optional.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={downloadPipeTemplate} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Pipe Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-600 mb-4">Upload your completed CSV file</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handlePipeUpload}
                    disabled={uploadingPipes}
                    className="max-w-xs mx-auto"
                  />
                  {uploadingPipes && <p className="text-sm text-stone-500 mt-2">Importing pipes...</p>}
                </div>

                {pipeResults && (
                  <Card className={pipeResults.failed === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {pipeResults.failed === 0 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                        )}
                        <div>
                          <p className="font-semibold">Import Complete</p>
                          <p className="text-sm">
                            {pipeResults.success} pipes imported successfully
                            {pipeResults.failed > 0 && `, ${pipeResults.failed} failed`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="tobacco" className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">How to Import Tobacco</h3>
                  <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-3">
                    <li>Download the CSV template below</li>
                    <li>Open it in Excel, Google Sheets, or any spreadsheet app</li>
                    <li>Fill in your tobacco data (one blend per row)</li>
                    <li>Save as CSV format</li>
                    <li>Upload the completed file</li>
                  </ol>
                  <div className="mt-3 pt-3 border-t border-amber-300">
                    <p className="text-sm font-semibold text-amber-900 mb-1">Required Fields:</p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• <strong>name</strong> - Name of the tobacco blend (required)</li>
                    </ul>
                    <p className="text-xs text-amber-700 mt-2 italic">Note: All other fields are optional but recommended for better tracking.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={downloadTobaccoTemplate} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Tobacco Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <p className="text-stone-600 mb-4">Upload your completed CSV file</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleTobaccoUpload}
                    disabled={uploadingTobacco}
                    className="max-w-xs mx-auto"
                  />
                  {uploadingTobacco && <p className="text-sm text-stone-500 mt-2">Importing tobacco...</p>}
                </div>

                {tobaccoResults && (
                  <Card className={tobaccoResults.failed === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {tobaccoResults.failed === 0 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                        )}
                        <div>
                          <p className="font-semibold">Import Complete</p>
                          <p className="text-sm">
                            {tobaccoResults.success} blends imported successfully
                            {tobaccoResults.failed > 0 && `, ${tobaccoResults.failed} failed`}
                          </p>
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