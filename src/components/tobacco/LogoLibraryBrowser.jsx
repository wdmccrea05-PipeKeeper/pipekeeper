import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check, Upload, Loader2, Trash2 } from "lucide-react";
import { getAvailableBrands } from "@/components/tobacco/TobaccoLogoLibrary";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function LogoLibraryBrowser({ open, onClose, onSelect, currentLogo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
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
  
  // Smart search - prioritize starts-with, then includes, then word matches
  const filteredBrands = searchQuery.trim() === '' 
    ? allBrands 
    : allBrands
        .map(brand => {
          const brandLower = brand.toLowerCase();
          const queryLower = searchQuery.toLowerCase();
          
          // Calculate relevance score
          let score = 0;
          if (brandLower === queryLower) score = 100; // exact match
          else if (brandLower.startsWith(queryLower)) score = 80; // starts with
          else if (brandLower.includes(queryLower)) score = 60; // contains
          else {
            // Check if any word starts with query
            const words = brandLower.split(/[\s&]+/);
            if (words.some(w => w.startsWith(queryLower))) score = 40;
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
      const result = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TobaccoLogoLibrary.create({
        brand_name: newBrandName.trim(),
        logo_url: result.file_url,
        is_custom: true
      });
      queryClient.invalidateQueries({ queryKey: ['custom-tobacco-logos'] });
      setNewBrandName('');
      e.target.value = '';
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteCustom = (e, brandObj) => {
    e.stopPropagation();
    const logoEntry = customLogos.find(l => l.brand_name === brandObj.brand);
    if (logoEntry) {
      deleteMutation.mutate(logoEntry.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Logo Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Add Custom Logo */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-amber-800">Add Custom Logo</p>
            <div className="flex gap-2">
              <Input
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Brand name..."
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
                    Upload Logo
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
              placeholder="Search brands..."
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredBrands.map((brandObj) => {
                const isSelected = currentLogo === brandObj.logo;
                
                return (
                  <div key={`${brandObj.brand}-${brandObj.isCustom}`} className="flex flex-col">
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
                          alt={brandObj.brand}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
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
                    <p className="text-xs text-stone-600 mt-1 px-1 text-center truncate">
                      {brandObj.brand}
                      {brandObj.isCustom && <span className="text-amber-600"> ✦</span>}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {filteredBrands.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No brands found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}