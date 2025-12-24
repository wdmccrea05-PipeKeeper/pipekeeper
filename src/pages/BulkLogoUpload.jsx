import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function BulkLogoUploadPage() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);

  const parseManufacturerName = (filename) => {
    // Remove file extension
    let name = filename.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
    
    // Replace underscores and hyphens with spaces
    name = name.replace(/[_-]/g, ' ');
    
    // Trim whitespace
    name = name.trim();
    
    return name;
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setResults([]);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setResults([]);
    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const manufacturerName = parseManufacturerName(file.name);

      try {
        // Upload the file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Check if this brand already exists in the library
        const existing = await base44.entities.TobaccoLogoLibrary.filter({ 
          brand_name: manufacturerName 
        });

        if (existing.length > 0) {
          // Update existing entry
          await base44.entities.TobaccoLogoLibrary.update(existing[0].id, {
            logo_url: file_url
          });
          uploadResults.push({
            filename: file.name,
            manufacturer: manufacturerName,
            status: 'updated',
            message: 'Logo updated'
          });
        } else {
          // Create new entry
          await base44.entities.TobaccoLogoLibrary.create({
            brand_name: manufacturerName,
            logo_url: file_url,
            is_custom: true
          });
          uploadResults.push({
            filename: file.name,
            manufacturer: manufacturerName,
            status: 'success',
            message: 'Logo added'
          });
        }
      } catch (error) {
        uploadResults.push({
          filename: file.name,
          manufacturer: manufacturerName,
          status: 'error',
          message: error.message || 'Upload failed'
        });
      }

      setProgress(((i + 1) / files.length) * 100);
      setResults([...uploadResults]);
    }

    setUploading(false);
  };

  const handleClear = () => {
    setFiles([]);
    setResults([]);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-2xl text-[#e8d5b7]">Bulk Logo Upload</CardTitle>
            <p className="text-sm text-[#e8d5b7]/70 mt-2">
              Upload multiple tobacco brand logos at once. The manufacturer name will be extracted from each filename.
            </p>
            <div className="mt-3 p-3 bg-amber-900/20 rounded-lg border border-amber-600/30">
              <p className="text-xs text-[#e8d5b7]/90">
                <strong>Filename Format:</strong> Use the manufacturer name as the filename (e.g., "Peterson.png", "Cornell_and_Diehl.png"). 
                Underscores and hyphens will be converted to spaces.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input */}
            <div>
              <label className="block mb-2">
                <div className="flex items-center justify-center w-full h-32 px-4 transition bg-[#243548] border-2 border-[#e8d5b7]/30 border-dashed rounded-lg hover:border-[#8b3a3a] cursor-pointer">
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-8 h-8 text-[#e8d5b7]/60" />
                    <div className="text-sm text-[#e8d5b7]/70">
                      <span className="font-semibold text-[#e8d5b7]">Click to upload</span> or drag and drop
                    </div>
                    <p className="text-xs text-[#e8d5b7]/50">PNG, JPG, WEBP, SVG (multiple files)</p>
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Selected Files Preview */}
            {files.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#e8d5b7] mb-3">
                  Selected Files ({files.length})
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {files.slice(0, 10).map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-[#243548] rounded-lg">
                      <span className="text-sm text-[#e8d5b7] truncate flex-1">{file.name}</span>
                      <span className="text-xs text-[#e8d5b7]/60 ml-2">→ {parseManufacturerName(file.name)}</span>
                    </div>
                  ))}
                  {files.length > 10 && (
                    <p className="text-xs text-[#e8d5b7]/60 text-center py-2">
                      ... and {files.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-[#e8d5b7]">
                  <span>Uploading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="flex-1 bg-[#8b3a3a] hover:bg-[#6d2e2e]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {files.length} Logo{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                disabled={uploading}
                className="border-[#e8d5b7]/30"
              >
                Clear
              </Button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#e8d5b7] mb-3">
                  Upload Results ({results.filter(r => r.status === 'success' || r.status === 'updated').length}/{results.length} successful)
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        result.status === 'error'
                          ? 'bg-red-900/20 border border-red-600/30'
                          : 'bg-green-900/20 border border-green-600/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {result.status === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#e8d5b7] truncate">{result.filename}</p>
                          <p className="text-xs text-[#e8d5b7]/60">
                            {result.manufacturer} • {result.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}