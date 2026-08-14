import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check, Upload, Loader2, Trash2 } from "lucide-react";
import { getAvailableBrands } from "@/components/tobacco/TobaccoLogoLibrary";
import { base44 } from "@/api/base44Client";
import { trackedUploadFile } from '@/lib/integrationTelemetry';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function LogoLibraryBrowser({ open, onClose, onSelect, currentLogo }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBlendName, setNewBlendName] = useState('');
  const queryClient = useQueryClient();
  
  const { data: customLogos = [] } = useQuery({
    queryKey: ['custom-tobacco-logos'],
    queryFn: () => base44.entities.TobaccoLogoLibrary.list(),
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TobaccoLogoLibrary.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-tobacco-logos'] });
    },
  });
  
  const allBrands = getAvailableBrands(customLogos);
  
  // Smart search - match blend name (primary) or brand/manufacturer (secondary)
  const filteredBrands = searchQuery.trim() === '' 
    ? allBrands 
    : allBrands
        .map(brandObj => {
          const blendLower = (brandObj.blendName || '').toLowerCase();
          const brandLower = brandObj.brand.toLowerCase();
          const queryLower = searchQuery.toLowerCase();
          
          // Split search query into individual terms
          const searchTerms = queryLower.split(/[\s,]+/).filter(term => term.length > 0);
          
          // Calculate relevance score — blend name match takes priority
          let score = 0;
          
          // Blend name matches (higher priority)
          if (blendLower && blendLower === queryLower) {
            score = 100; // exact blend match
          } else if (blendLower && blendLower.startsWith(queryLower)) {
            score = 95;
          } else if (blendLower && blendLower.includes(queryLower)) {
            score = 90;
          } else if (brandLower === queryLower) {
            score = 80; // exact brand match
          } else if (brandLower.startsWith(queryLower)) {
            score = 70;
          } else if (brandLower.includes(queryLower)) {
            score = 60;
          } else {
            // Check if blend or brand matches any of the search terms
            const blendWords = blendLower ? blendLower.split(/[\s&]+/) : [];
            const brandWords = brandLower.split(/[\s&]+/);
            let matchCount = 0;
            
            for (const term of searchTerms) {
              // Blend name word match (higher priority)
              if (blendWords.some(w => w === term)) {
                matchCount += 10;
                score += 50;
              }
              else if (blendWords.some(w => w.startsWith(term))) {
                matchCount += 5;
                score += 35;
              }
              // Brand word match (lower priority)
              else if (brandWords.some(w => w === term)) {
                matchCount += 5;
                score += 30;
              }
              else if (brandWords.some(w => w.startsWith(term))) {
                matchCount += 3;
                score += 20;
              }
              // Contains match
              else if ((blendLower && blendLower.includes(term)) || brandLower.includes(term)) {
                matchCount += 1;
                score += 10;
              }
            }
            
            if (matchCount > 0 && searchTerms.length > 1) {
              score += matchCount * 5;
            }
          }
          
          return { ...brandObj, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

  const handleSelect = (brandObj) => {
    onSelect(brandObj.logo);
    onClose();
  };
  
  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file || !newBrandName.trim()) return;
    
    setUploading(true);
    try {
      const result = await trackedUploadFile({ file }, { feature: 'blend.logo_upload', module: 'pipekeeper' });
      await base44.entities.TobaccoLogoLibrary.create({
        brand_name: newBrandName.trim(),
        blend_name: newBlendName.trim() || null,
        logo_url: result.file_url,
        is_custom: true
      });
      queryClient.invalidateQueries({ queryKey: ['custom-tobacco-logos'] });
      setNewBrandName('');
      setNewBlendName('');
      e.target.value = '';
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteCustom = (e, brandObj) => {
    e.stopPropagation();
    // Find the custom logo entry matching both brand and blend (if any)
    const logoEntry = customLogos.find(l => 
      l.brand_name === brandObj.brand && (l.blend_name || null) === (brandObj.blendName || null)
    );
    if (logoEntry) {
      deleteMutation.mutate(logoEntry.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("logoLibraryBrowser.title")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Add Custom Logo */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-amber-800">{t("logoLibraryBrowser.addCustomLogo")}</p>
            <div className="flex gap-2">
              <Input
                value={newBlendName}
                onChange={(e) => setNewBlendName(e.target.value)}
                placeholder="Blend name (optional, e.g. Haunted Bookshop)"
                className="flex-1"
              />
              <Input
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder={t("logoLibraryBrowser.brandNamePlaceholder")}
                className="flex-1"
              />
              <label className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !newBrandName.trim() || uploading
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-amber-700 text-white hover:bg-amber-800 cursor-pointer'
              }`}>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t("logoLibraryBrowser.uploadLogo")}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadLogo}
                  disabled={!newBrandName.trim() || uploading}
                />
              </label>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by blend name or manufacturer…"
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredBrands.map((brandObj) => {
                const isSelected = currentLogo === brandObj.logo;
                // Display: blend name as primary label when available, manufacturer as secondary
                const primaryLabel = brandObj.blendName || brandObj.brand;
                const secondaryLabel = brandObj.blendName ? brandObj.brand : null;
                
                return (
                  <div key={`${brandObj.brand}-${brandObj.blendName || ''}-${brandObj.isCustom}`} className="flex flex-col">
                    <button
                      onClick={() => handleSelect(brandObj)}
                      className={`relative aspect-square rounded-lg border-2 transition-all hover:border-amber-500 overflow-hidden ${
                        isSelected 
                          ? 'border-amber-600 bg-amber-100' 
                          : 'border-stone-200 bg-white'
                      }`}
                    >
                      <div className="w-full h-full flex items-center justify-center p-3 bg-white">
                        <img 
                          src={brandObj.logo} 
                          alt={primaryLabel}
                          className="max-w-full max-h-full object-contain"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            parent.innerHTML = `<div class="text-amber-600 text-4xl">🍂</div>`;
                          }}
                        />
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-amber-600 rounded-full p-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {brandObj.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustom(e, brandObj)}
                          className="absolute bottom-2 right-2 bg-rose-500/90 hover:bg-rose-600 rounded-full p-1"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </button>
                    <div className="mt-1 px-1 text-center">
                      <p className="text-xs font-medium text-stone-800 truncate leading-tight">
                        {primaryLabel}
                      </p>
                      {secondaryLabel && (
                        <p className="text-[10px] text-stone-500 truncate leading-tight">
                          {secondaryLabel}
                        </p>
                      )}
                      {brandObj.isCustom && <span className="text-amber-600 text-[10px]">✦</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredBrands.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No matches found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}