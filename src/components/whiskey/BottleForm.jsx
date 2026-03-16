import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, ImageIcon, Search } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import ImageCropper from '@/components/pipes/ImageCropper';
import OnlineImageSearchModal from '@/components/search/OnlineImageSearchModal';

export default function BottleForm({ bottle, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(
    bottle || {
      bottle_type: 'whiskey',
      name: '',
      distillery: '',
      region: '',
      country: '',
      type: 'Other',
      age: '',
      abv: '',
      bottle_size: '750ml',
      purchase_type: 'retail',
      purchase_price: '',
      purchase_location: '',
      purchase_date: '',
      retail_price: '',
      aftermarket_price: '',
      collector_value: '',
      value_confidence: 'medium',
      notes: '',
      rating: '',
      favorite: false,
      photo: '',
    }
  );

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(bottle?.photo || '');
  const [cropperImage, setCropperImage] = useState(null);
  const [showOnlineSearch, setShowOnlineSearch] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropperImage(event.target.result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const handleCroppedImage = async (croppedDataUrl) => {
    setUploadingPhoto(true);
    try {
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      
      const result = await base44.integrations.Core.UploadFile({ file });
      if (result?.file_url) {
        setFormData((prev) => ({ ...prev, photo: result.file_url }));
        setPhotoPreview(result.file_url);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setCropperImage(null);
      setUploadingPhoto(false);
    }
  };

  const handleOnlineImageSelected = (imageUrl) => {
    setCropperImage(imageUrl);
    setShowOnlineSearch(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cleanedData = {
      ...formData,
      age: formData.age ? Number(formData.age) : null,
      abv: formData.abv ? Number(formData.abv) : null,
      purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
      retail_price: formData.retail_price ? Number(formData.retail_price) : null,
      aftermarket_price: formData.aftermarket_price ? Number(formData.aftermarket_price) : null,
      collector_value: formData.collector_value ? Number(formData.collector_value) : null,
      rating: formData.rating ? Number(formData.rating) : null,
      value_last_updated: formData.retail_price || formData.aftermarket_price || formData.collector_value ? new Date().toISOString() : null,
    };
    
    // Remove empty strings
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') {
        cleanedData[key] = null;
      }
    });
    
    onSubmit(cleanedData);
  };

  return (
    <>
      {cropperImage && (
        <ImageCropper
          imageUrl={cropperImage}
          onSave={handleCroppedImage}
          onCancel={() => setCropperImage(null)}
        />
      )}

      <OnlineImageSearchModal
        isOpen={showOnlineSearch}
        recordType="bottle"
        recordData={formData}
        onImageSelected={handleOnlineImageSelected}
        onClose={() => setShowOnlineSearch(false)}
      />

      <div
        className="w-full max-w-2xl rounded-2xl p-6 space-y-6"
        style={{
          background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.95), rgba(31, 21, 16, 0.98))',
          border: '1px solid rgba(180, 140, 75, 0.25)',
        }}
      >
      <div className="flex items-center justify-between">
        <h2 style={{ color: '#F5F1E7' }} className="text-2xl font-bold">
          {bottle ? t('whiskey.editBottle') || 'Edit Bottle' : t('whiskey.addBottle') || 'Add Bottle'}
        </h2>
        <button onClick={onCancel} className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
         {/* Bottle Type */}
         <div>
           <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.bottleType') || 'Bottle Type'} *</label>
           <Select value={formData.bottle_type} onValueChange={(value) => handleChange('bottle_type', value)}>
             <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="whiskey">{t('whiskey.whiskeyBottle') || 'Whiskey Bottle'}</SelectItem>
               <SelectItem value="wine">{t('whiskey.wineBottle') || 'Wine Bottle'}</SelectItem>
             </SelectContent>
           </Select>
         </div>

         {/* Name & Distillery */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.name') || 'Name'} *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Bottle name"
              required
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">
              {formData.bottle_type === 'wine' 
                ? (t('wine.winery') || 'Winery') 
                : (t('whiskey.distillery') || 'Distillery')}
            </label>
            <Input
              value={formData.distillery}
              onChange={(e) => handleChange('distillery', e.target.value)}
              placeholder={formData.bottle_type === 'wine' ? 'Winery name' : 'Distillery name'}
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Region & Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.region') || 'Region'}</label>
            <Input
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              placeholder="e.g., Islay, Speyside"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.country') || 'Country'}</label>
            <Input
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="e.g., Scotland, USA"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Type & Age */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.type') || 'Type'}</label>
            <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single Malt">Single Malt</SelectItem>
                <SelectItem value="Blended Malt">Blended Malt</SelectItem>
                <SelectItem value="Single Grain">Single Grain</SelectItem>
                <SelectItem value="Blended Grain">Blended Grain</SelectItem>
                <SelectItem value="Blended Whiskey">Blended Whiskey</SelectItem>
                <SelectItem value="Bourbon">Bourbon</SelectItem>
                <SelectItem value="Rye">Rye</SelectItem>
                <SelectItem value="Tennessee Whiskey">Tennessee Whiskey</SelectItem>
                <SelectItem value="Irish Whiskey">Irish Whiskey</SelectItem>
                <SelectItem value="Scotch Whisky">Scotch Whisky</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.age') || 'Age (years)'}</label>
            <Input
              type="number"
              value={formData.age}
              onChange={(e) => handleChange('age', e.target.value)}
              placeholder="e.g., 12"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* ABV & Bottle Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.abv') || 'ABV (%)'}</label>
            <Input
              type="number"
              step="0.1"
              value={formData.abv}
              onChange={(e) => handleChange('abv', e.target.value)}
              placeholder="e.g., 43.0"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.bottleSize') || 'Bottle Size'}</label>
            <Select value={formData.bottle_size} onValueChange={(value) => handleChange('bottle_size', value)}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50ml">50ml</SelectItem>
                <SelectItem value="100ml">100ml</SelectItem>
                <SelectItem value="200ml">200ml</SelectItem>
                <SelectItem value="375ml">375ml</SelectItem>
                <SelectItem value="500ml">500ml</SelectItem>
                <SelectItem value="700ml">700ml</SelectItem>
                <SelectItem value="750ml">750ml</SelectItem>
                <SelectItem value="1L">1L</SelectItem>
                <SelectItem value="1.75L">1.75L</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Purchase Type & Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchaseType') || 'Purchase Type'} *</label>
            <Select value={formData.purchase_type} onValueChange={(value) => handleChange('purchase_type', value)}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">{t('whiskey.purchaseTypeRetail')}</SelectItem>
                <SelectItem value="aftermarket">{t('whiskey.purchaseTypeAftermarket')}</SelectItem>
                <SelectItem value="gift">{t('whiskey.purchaseTypeGift')}</SelectItem>
                <SelectItem value="trade">{t('whiskey.purchaseTypeTrade')}</SelectItem>
                <SelectItem value="other">{t('whiskey.purchaseTypeOther')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchasePrice') || 'Amount Paid ($)'}</label>
            <Input
              type="number"
              step="0.01"
              value={formData.purchase_price}
              onChange={(e) => handleChange('purchase_price', e.target.value)}
              placeholder="0.00"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Purchase Location & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchaseLocation') || 'Purchase Location'}</label>
            <Input
              value={formData.purchase_location}
              onChange={(e) => handleChange('purchase_location', e.target.value)}
              placeholder="Store, auction, distillery, etc."
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchaseDate') || 'Purchase Date'}</label>
            <Input
              type="date"
              value={formData.purchase_date}
              onChange={(e) => handleChange('purchase_date', e.target.value)}
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>
        </div>

        {/* Market Pricing Intelligence */}
        <div className="bg-[rgba(180,140,75,0.08)] border border-[rgba(180,140,75,0.15)] rounded-lg p-4">
          <label className="text-sm font-semibold text-[#D4A574] block mb-3">{t('whiskey.pricingBreakdown')}</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.retailPrice')}</label>
              <Input
                type="number"
                step="0.01"
                value={formData.retail_price}
                onChange={(e) => handleChange('retail_price', e.target.value)}
                placeholder="0.00"
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.aftermarketPrice')}</label>
              <Input
                type="number"
                step="0.01"
                value={formData.aftermarket_price}
                onChange={(e) => handleChange('aftermarket_price', e.target.value)}
                placeholder="0.00"
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
            <div>
              <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.collectorValue')}</label>
              <Input
                type="number"
                step="0.01"
                value={formData.collector_value}
                onChange={(e) => handleChange('collector_value', e.target.value)}
                placeholder="0.00"
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.valueConfidence')}</label>
            <Select value={formData.value_confidence} onValueChange={(value) => handleChange('value_confidence', value)}>
              <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('whiskey.valueConfidenceHigh')}</SelectItem>
                <SelectItem value="medium">{t('whiskey.valueConfidenceMedium')}</SelectItem>
                <SelectItem value="low">{t('whiskey.valueConfidenceLow')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs mt-2" style={{ color: 'rgba(180,140,75,0.5)' }}>
            Retail, Aftermarket, and Collector values are independent. Fill in the values you have or can estimate.
          </p>
        </div>

        {/* Rating */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.rating') || 'Rating (1-5)'}</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="5"
            value={formData.rating}
            onChange={(e) => handleChange('rating', e.target.value)}
            placeholder="5.0"
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.photo') || 'Bottle Photo'}</label>
          <div className="space-y-3">
            {photoPreview && (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-[rgba(180,140,75,0.2)]">
                <img 
                  src={photoPreview} 
                  alt="Bottle preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview('');
                    handleChange('photo', '');
                  }}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-[rgba(180,140,75,0.3)] rounded-lg cursor-pointer hover:border-[rgba(180,140,75,0.5)] transition-colors">
                <div className="flex flex-col items-center gap-2">
                  {uploadingPhoto ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#D4A574] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-[#D8C7A6]">Processing...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-[#D4A574]" />
                      <span className="text-xs text-[#D8C7A6]">Upload photo</span>
                    </>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOnlineSearch(true)}
                disabled={uploadingPhoto}
                className="px-4"
              >
                <Search className="w-4 h-4 mr-2" />
                {t("onlineImageSearch.searchOnline", "Search Online")}
              </Button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.tastingNotes') || 'Tasting Notes'}</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Describe the flavor profile, aromas, etc."
            className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-24"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
              color: '#F5F1E7',
            }}
          >
            {bottle ? t('whiskey.updateBottle') || 'Update Bottle' : t('whiskey.addBottle') || 'Add Bottle'}
          </Button>
        </div>
      </form>
      </div>
    </>
  );
}