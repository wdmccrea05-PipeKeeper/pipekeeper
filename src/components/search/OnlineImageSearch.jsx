import React, { useState, useCallback, useMemo } from 'react';
import { Search, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";

/**
 * OnlineImageSearch Component
 * 
 * Fetches images from web search and returns selected image URL
 * Selected images are passed through the existing image editor pipeline
 */
export default function OnlineImageSearch({ 
  recordType, // 'pipe' | 'blend' | 'bottle'
  recordData, // Current record data for auto-generating search query
  onImageSelected, // Callback: (imageUrl) => void
  onClose // Callback to close the search modal
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState(generateSearchQuery(recordType, recordData));
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  /**
   * Auto-generate search query based on record type and data
   */
  function generateSearchQuery(type, data) {
    if (!data) return '';

    if (type === 'pipe') {
      const parts = [];
      if (data.maker) parts.push(data.maker);
      if (data.name) parts.push(data.name);
      if (parts.length > 0) return `${parts.join(' ')} pipe`;
      return 'tobacco pipe';
    }

    if (type === 'blend') {
      const parts = [];
      if (data.manufacturer) parts.push(data.manufacturer);
      if (data.name) parts.push(data.name);
      if (parts.length > 0) return `${parts.join(' ')} tin label`;
      return 'tobacco tin label';
    }

    if (type === 'bottle') {
      const parts = [];
      if (data.distillery) parts.push(data.distillery);
      if (data.name) parts.push(data.name);
      if (parts.length > 0) return `${parts.join(' ')} bottle`;
      return 'whiskey bottle';
    }

    return '';
  }

  /**
    * Search for images using Bing Image Search API (faster, more reliable)
    */
   const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError(t("onlineImageSearch.queryRequired", "Please enter a search query"));
      return;
    }

    setLoading(true);
    setError(null);
    setImages([]);

    try {
      // Use direct image search via backend function for faster results
      const response = await base44.functions.invoke('searchProductImages', {
        query: searchQuery,
        recordType: recordType,
        limit: 12
      });

      const imageUrls = response?.images || [];
      if (imageUrls.length === 0) {
        setError(t("onlineImageSearch.noResults", "No images found. Try adjusting your search query."));
      } else {
        setImages(imageUrls);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(t("onlineImageSearch.searchError", "Failed to search for images. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, recordType, t]);

  /**
   * Handle image selection
   */
  const handleSelectImage = useCallback((imageUrl) => {
    setSelectedImageUrl(imageUrl);
    // Pass the image URL to the parent (PipeForm, etc.)
    // The image will then be opened in the existing ImageCropper
    onImageSelected(imageUrl);
    onClose();
  }, [onImageSelected, onClose]);

  return (
    <div className="w-full h-full flex flex-col space-y-3">
      {/* Search Input - Sticky */}
      <form onSubmit={handleSearch} className="space-y-2 flex-shrink-0">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#E0D8C8]">
            {t("onlineImageSearch.searchQuery", "Search Query")}
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("onlineImageSearch.enterQuery", "Enter search query...")}
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="bg-[#A35C5C] hover:bg-[#8F4E4E] text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-[#E0D8C8]/60">
            {t("onlineImageSearch.tip", "Tip: Include brand, model, or product details for better results")}
          </p>
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#E05D5D]/20 border border-[#E05D5D]/40 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-[#E05D5D] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#E0D8C8]">{error}</p>
        </div>
      )}

      {/* Results Grid - Scrollable */}
      {images.length > 0 && (
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          <p className="text-sm text-[#E0D8C8]/70">
            {t("onlineImageSearch.selectImage", "Select an image to edit and use")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
            {images.map((imageUrl, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#E0D8C8]/20 hover:border-[#A35C5C]/50 cursor-pointer group bg-black/20"
                onClick={() => handleSelectImage(imageUrl)}
              >
                <img
                  src={imageUrl}
                  alt={`Result ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#A35C5C] hover:bg-[#8F4E4E]"
                  >
                    {t("onlineImageSearch.select", "Select")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8 flex-1">
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#A35C5C] mx-auto" />
            <p className="text-sm text-[#E0D8C8]/70">{t("common.searching", "Searching...")}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && images.length === 0 && !error && (
        <div className="text-center p-6 rounded-lg bg-[#3a2a20]/30 border border-[#E0D8C8]/10 flex-1 flex items-center justify-center">
          <div>
            <Search className="w-8 h-8 text-[#E0D8C8]/40 mx-auto mb-2" />
            <p className="text-sm text-[#E0D8C8]/60">
              {t("onlineImageSearch.startSearch", "Enter a search query and click search to find images")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}