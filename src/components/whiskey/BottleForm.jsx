import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import ImageCropper from '@/components/pipes/ImageCropper';
import OnlineImageSearchModal from '@/components/search/OnlineImageSearchModal';
import PhotoUploader from '@/components/PhotoUploader';

const DEFAULT_FORM = (defaultBottleType = 'whiskey') => ({
  bottle_type: defaultBottleType,
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
});

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function BottleForm({ bottle, onSubmit, onCancel, defaultBottleType = 'whiskey' }) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState(
    bottle ? { ...DEFAULT_FORM(defaultBottleType), ...bottle } : DEFAULT_FORM(defaultBottleType)
  );

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(bottle?.photo || '');
  const [cropperImage, setCropperImage] = useState(null);
  const [showOnlineSearch, setShowOnlineSearch] = useState(false);

  const bottleSearchContext = useMemo(
    () => ({
      name: formData.name,
      distillery: formData.distillery,
      type: formData.type,
      region: formData.region,
      country: formData.country,
      bottle_type: formData.bottle_type,
    }),
    [formData]
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoFilesSelected = async (files) => {
    const file = Array.isArray(files) ? files[0] : null;
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropperImage(event.target?.result || null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const handleOnlineImageSelected = (imageUrl) => {
    setCropperImage(imageUrl);
    setShowOnlineSearch(false);
  };

  const handleCroppedImage = async (croppedDataUrl) => {
    setUploadingPhoto(true);
    try {
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'bottle-photo.jpg', { type: 'image/jpeg' });

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

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanedData = {
      ...formData,
      age: toNumberOrNull(formData.age),
      abv: toNumberOrNull(formData.abv),
      purchase_price: toNumberOrNull(formData.purchase_price),
      retail_price: toNumberOrNull(formData.retail_price),
      aftermarket_price: toNumberOrNull(formData.aftermarket_price),
      collector_value: toNumberOrNull(formData.collector_value),
      rating: toNumberOrNull(formData.rating),
      value_last_updated:
        formData.retail_price || formData.aftermarket_price || formData.collector_value
          ? new Date().toISOString()
          : null,
    };

    Object.keys(cleanedData).forEach((key) => {
      if (cleanedData[key] === '') cleanedData[key] = null;
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
        recordData={bottleSearchContext}
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
          <button type="button" onClick={onCancel} className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.name') || 'Name'} *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('whiskey.bottleNamePlaceholder') || 'Bottle name'}
                required
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">
                {formData.bottle_type === 'wine'
                  ? (t('wine.winery') || 'Winery')
                  : (t('whiskey.distillery') || 'Distillery')}
              </label>
              <Input
                value={formData.distillery}
                onChange={(e) => handleChange('distillery', e.target.value)}
                placeholder={formData.bottle_type === 'wine'
                  ? (t('wine.wineryPlaceholder') || 'Winery name')
                  : (t('whiskey.distilleryPlaceholder') || 'Distillery name')}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.region') || 'Region'}</label>
              <Input
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                placeholder={t('whiskey.regionPlaceholder') || 'e.g., Islay, Speyside'}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.country') || 'Country'}</label>
              <Input
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder={t('whiskey.countryPlaceholder') || 'e.g., Scotland, USA'}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.type') || 'Type'}</label>
              <Select value={formData.type || 'Other'} onValueChange={(value) => handleChange('type', value)}>
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
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.age') || 'Age (years)'}</label>
              <Input
                type="number"
                value={formData.age ?? ''}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="12"
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.abv') || 'ABV (%)'}</label>
              <Input
                type="number"
                value={formData.abv ?? ''}
                onChange={(e) => handleChange('abv', e.target.value)}
                placeholder="46"
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.bottleSize') || 'Bottle Size'}</label>
              <Select value={formData.bottle_size || '750ml'} onValueChange={(value) => handleChange('bottle_size', value)}>
                <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50ml">50ml</SelectItem>
                  <SelectItem value="200ml">200ml</SelectItem>
                  <SelectItem value="375ml">375ml</SelectItem>
                  <SelectItem value="700ml">700ml</SelectItem>
                  <SelectItem value="750ml">750ml</SelectItem>
                  <SelectItem value="1L">1L</SelectItem>
                  <SelectItem value="1.75L">1.75L</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchaseType') || 'Purchase Type'} *</label>
              <Select value={formData.purchase_type || 'retail'} onValueChange={(value) => handleChange('purchase_type', value)}>
                <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">{t('whiskey.purchaseTypeRetail') || 'Retail'}</SelectItem>
                  <SelectItem value="aftermarket">{t('whiskey.purchaseTypeAftermarket') || 'Aftermarket'}</SelectItem>
                  <SelectItem value="gift">{t('whiskey.purchaseTypeGift') || 'Gift'}</SelectItem>
                  <SelectItem value="trade">{t('whiskey.purchaseTypeTrade') || 'Trade'}</SelectItem>
                  <SelectItem value="other">{t('whiskey.purchaseTypeOther') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchasePrice') || 'Amount Paid ($)'}</label>
              <Input
                type="number"
                step="0.01"
                value={formData.purchase_price ?? ''}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
                placeholder="0.00"
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchaseLocation') || 'Purchase Location'}</label>
              <Input
                value={formData.purchase_location || ''}
                onChange={(e) => handleChange('purchase_location', e.target.value)}
                placeholder={t('whiskey.purchaseLocationPlaceholder') || 'Store, auction, distillery, etc.'}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
            <div className="min-w-0">
              <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.purchaseDate') || 'Purchase Date'}</label>
              <Input
                type="date"
                value={formData.purchase_date || ''}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            </div>
          </div>

          <div className="bg-[rgba(180,140,75,0.08)] border border-[rgba(180,140,75,0.15)] rounded-lg p-4">
            <label className="text-sm font-semibold text-[#D4A574] block mb-3">
              {t('whiskey.pricingBreakdown') || 'Pricing Breakdown'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="min-w-0">
                <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.retailPrice') || 'Retail Price'}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.retail_price ?? ''}
                  onChange={(e) => handleChange('retail_price', e.target.value)}
                  placeholder="0.00"
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
              </div>
              <div className="min-w-0">
                <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.aftermarketPrice') || 'Aftermarket Price'}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.aftermarket_price ?? ''}
                  onChange={(e) => handleChange('aftermarket_price', e.target.value)}
                  placeholder="0.00"
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
              </div>
              <div className="min-w-0">
                <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.collectorValue') || 'Collector Value'}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.collector_value ?? ''}
                  onChange={(e) => handleChange('collector_value', e.target.value)}
                  placeholder="0.00"
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-[#D8C7A6] block mb-1">{t('whiskey.valueConfidence') || 'Value Confidence'}</label>
              <Select value={formData.value_confidence || 'medium'} onValueChange={(value) => handleChange('value_confidence', value)}>
                <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">{t('whiskey.valueConfidenceHigh') || 'High'}</SelectItem>
                  <SelectItem value="medium">{t('whiskey.valueConfidenceMedium') || 'Medium'}</SelectItem>
                  <SelectItem value="low">{t('whiskey.valueConfidenceLow') || 'Low'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs mt-2" style={{ color: 'rgba(180,140,75,0.5)' }}>
              {t('whiskey.valueBreakdownHelp') || 'Retail, aftermarket, and collector values are separate. Use the best values you have.'}
            </p>
          </div>

          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.rating') || 'Rating (1-5)'}</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="5"
              value={formData.rating ?? ''}
              onChange={(e) => handleChange('rating', e.target.value)}
              placeholder="5.0"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
            />
          </div>

          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.photo') || 'Bottle Photo'}</label>

            {photoPreview && (
              <div className="relative w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-[rgba(180,140,75,0.2)] mb-3 bg-black/20">
                <img
                  src={photoPreview}
                  alt={t('whiskey.photoPreview') || 'Bottle preview'}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview('');
                    handleChange('photo', '');
                  }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <PhotoUploader
              onPhotosSelected={handlePhotoFilesSelected}
              existingPhotos={photoPreview ? [photoPreview] : []}
              maxPhotos={1}
              onSearchOnlineClick={() => setShowOnlineSearch(true)}
              showSearchOption={true}
              recordType="bottle"
              recordData={bottleSearchContext}
            />

            {uploadingPhoto && (
              <p className="text-xs mt-2 text-[#D8C7A6]">
                {t('photos.processing') || 'Processing photo...'}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-[#D8C7A6] block mb-2">{t('whiskey.tastingNotes') || 'Tasting Notes'}</label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder={t('whiskey.notesPlaceholder') || 'Describe the flavor profile, aromas, finish, or collector notes.'}
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-24"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
                color: '#F5F1E7',
              }}
            >
              {bottle ? (t('whiskey.updateBottle') || 'Update Bottle') : (t('whiskey.addBottle') || 'Add Bottle')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
