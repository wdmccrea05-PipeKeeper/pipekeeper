import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import ImageCropper from '@/components/pipes/ImageCropper';

import PhotoUploader from '@/components/PhotoUploader';
import { toast } from 'sonner';

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
  flavor_notes: '',
  rating: '',
  favorite: false,
  photo: '',
  // Strategy / value fields
  production_status: '',
  edition: '',
  discontinued: false,
  allocated: false,
  availability_note: '',
  manual_value_override: '',
  valuation_notes: '',
  value_source_notes: '',
  replacement_difficulty: '',
});

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getExistingPhoto(record) {
  return record?.photo || record?.image || record?.image_url || '';
}

export default function BottleForm({
  bottle,
  onSubmit,
  onCancel,
  defaultBottleType = 'whiskey',
}) {
  const { t } = useTranslation();

  const existingPhoto = getExistingPhoto(bottle);

  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_FORM(defaultBottleType),
    ...(bottle || {}),
    photo: getExistingPhoto(bottle),
  }));

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(existingPhoto || '');
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

  const commitPhoto = (url) => {
    const cleanUrl = typeof url === 'string' ? url.trim() : '';
    setFormData((prev) => ({
      ...prev,
      photo: cleanUrl,
    }));
    setPhotoPreview(cleanUrl || '');
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
      toast.error(t('photos.readError', 'Could not read selected photo.'));
    }
  };

  const handleOnlineImageSelected = (imageUrl) => {
    commitPhoto(imageUrl);
    setShowOnlineSearch(false);
    toast.success(t('photos.selected', 'Photo selected.'));
  };

  const handleCroppedImage = async (croppedDataUrl) => {
    setUploadingPhoto(true);

    try {
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'bottle-photo.jpg', { type: 'image/jpeg' });

      const result = await base44.integrations.Core.UploadFile({ file });
      const uploadedUrl =
        result?.file_url || result?.url || result?.publicUrl || result?.photo || '';

      if (!uploadedUrl) {
        console.error('Upload returned no URL:', result);
        toast.error(t('photos.uploadFailed', 'Photo upload failed.'));
        return;
      }

      commitPhoto(uploadedUrl);
      toast.success(t('photos.uploaded', 'Photo uploaded.'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('photos.uploadFailed', 'Photo upload failed.'));
    } finally {
      setCropperImage(null);
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const preservedPhoto = formData.photo || existingPhoto || '';

    const cleanedData = {
      ...formData,
      photo: preservedPhoto || null,
      flavor_notes: formData.flavor_notes || null,
      age: toNumberOrNull(formData.age),
      abv: toNumberOrNull(formData.abv),
      purchase_price: toNumberOrNull(formData.purchase_price),
      retail_price: toNumberOrNull(formData.retail_price),
      aftermarket_price: toNumberOrNull(formData.aftermarket_price),
      collector_value: toNumberOrNull(formData.collector_value),
      manual_value_override: toNumberOrNull(formData.manual_value_override),
      rating: toNumberOrNull(formData.rating),
      value_last_updated:
        formData.retail_price || formData.aftermarket_price || formData.collector_value || formData.manual_value_override
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

      {/* OnlineImageSearchModal hidden for this release */}

      {/* Mobile-safe layout: flex-col so footer stays visible */}
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.95), rgba(31, 21, 16, 0.98))',
          border: '1px solid rgba(180, 140, 75, 0.25)',
          maxHeight: '90vh',
        }}
      >
        {/* Header — sticky, never scrolls away */}
        <div
          className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(180,140,75,0.18)' }}
        >
          <h2 style={{ color: '#F5F1E7' }} className="text-xl font-bold">
            {bottle
              ? t('whiskey.editBottle', 'Edit Bottle')
              : t('whiskey.addBottle', 'Add Bottle')}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <form id="bottle-form" onSubmit={handleSubmit} className="space-y-5">
            {/* BOTTLE TYPE */}
            <div>
              <label className="text-sm text-[#D8C7A6] block mb-2">
                {t('whiskey.bottleType', 'Bottle Type')} *
              </label>
              <Select
                value={formData.bottle_type}
                onValueChange={(value) => handleChange('bottle_type', value)}
              >
                <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whiskey">
                    {t('whiskey.whiskeyBottle', 'Whiskey Bottle')}
                  </SelectItem>
                  <SelectItem value="wine">
                    {t('whiskey.wineBottle', 'Wine Bottle')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* IDENTITY SECTION */}
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B48C4B] mb-3">
                Identity
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.name', 'Name')} *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={t('whiskey.bottleNamePlaceholder', 'Bottle name')}
                    required
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {formData.bottle_type === 'wine'
                      ? t('wine.winery', 'Winery')
                      : t('whiskey.distillery', 'Distillery')}
                  </label>
                  <Input
                    value={formData.distillery}
                    onChange={(e) => handleChange('distillery', e.target.value)}
                    placeholder={
                      formData.bottle_type === 'wine'
                        ? t('wine.wineryPlaceholder', 'Winery name')
                        : t('whiskey.distilleryPlaceholder', 'Distillery name')
                    }
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.region', 'Region')}
                  </label>
                  <Input
                    value={formData.region}
                    onChange={(e) => handleChange('region', e.target.value)}
                    placeholder={t('whiskey.regionPlaceholder', 'e.g., Islay, Speyside')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.country', 'Country')}
                  </label>
                  <Input
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder={t('whiskey.countryPlaceholder', 'e.g., Scotland, USA')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.type', 'Whiskey Type')}
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleChange('type', value)}
                  >
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
              </div>
            </div>

            {/* SPECS SECTION */}
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B48C4B] mb-3">
                Specifications
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.age', 'Age (Years)')}
                  </label>
                  <Input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => handleChange('age', e.target.value)}
                    placeholder={t('whiskey.agePlaceholder', 'e.g., 12')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.abv', 'ABV (%)')}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.abv || ''}
                    onChange={(e) => handleChange('abv', e.target.value)}
                    placeholder={t('whiskey.abvPlaceholder', 'e.g., 46.5')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.bottleSize', 'Bottle Size')}
                  </label>
                  <Select
                    value={formData.bottle_size}
                    onValueChange={(value) => handleChange('bottle_size', value)}
                  >
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
            </div>

            {/* ACQUISITION SECTION */}
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B48C4B] mb-3">
                Acquisition & Ownership
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.acquisitionMethod', 'How Acquired')}
                  </label>
                  <Select
                    value={formData.purchase_type}
                    onValueChange={(value) => handleChange('purchase_type', value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="aftermarket">Aftermarket / Secondary</SelectItem>
                      <SelectItem value="gift">Gift</SelectItem>
                      <SelectItem value="trade">Trade / Swap</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.purchaseLocation', 'Where Acquired')}
                  </label>
                  <Input
                    value={formData.purchase_location || ''}
                    onChange={(e) => handleChange('purchase_location', e.target.value)}
                    placeholder={t('whiskey.purchaseLocationPlaceholder', 'e.g., Local liquor store, online')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.amountPaid', 'Amount Paid')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price || ''}
                    onChange={(e) => handleChange('purchase_price', e.target.value)}
                    placeholder={t('whiskey.amountPaidPlaceholder', 'e.g., 49.99')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.purchaseDate', 'Date Purchased')}
                  </label>
                  <Input
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => handleChange('purchase_date', e.target.value)}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>
            </div>

            {/* VALUE SECTION */}
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B48C4B] mb-3">
                Value & Pricing
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.collectorValue', 'Collector Value')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.collector_value || ''}
                    onChange={(e) => handleChange('collector_value', e.target.value)}
                    placeholder={t('whiskey.collectorValuePlaceholder', 'Estimated value')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.retailPrice', 'Retail Price')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.retail_price || ''}
                    onChange={(e) => handleChange('retail_price', e.target.value)}
                    placeholder={t('whiskey.retailPricePlaceholder', 'Current retail')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.aftermarketPrice', 'Secondary Market Price')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.aftermarket_price || ''}
                    onChange={(e) => handleChange('aftermarket_price', e.target.value)}
                    placeholder={t('whiskey.aftermarketPricePlaceholder', 'Auction / secondary market')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.valueConfidence', 'Confidence Level')}
                  </label>
                  <Select
                    value={formData.value_confidence || 'medium'}
                    onValueChange={(value) => handleChange('value_confidence', value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* STRATEGY & AVAILABILITY SECTION */}
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B48C4B] mb-3">
                Strategy & Availability
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.productionStatus', 'Production Status')}
                  </label>
                  <Select
                    value={formData.production_status || '_none'}
                    onValueChange={(value) => handleChange('production_status', value === '_none' ? '' : value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue placeholder={t('whiskey.productionStatusPlaceholder', 'e.g. Discontinued')} />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="_none">Unknown</SelectItem>
                    <SelectItem value="Active">Active / Ongoing</SelectItem>
                    <SelectItem value="Limited Edition">Limited Edition</SelectItem>
                    <SelectItem value="Allocated">Allocated</SelectItem>
                    <SelectItem value="Single Cask">Single Cask</SelectItem>
                    <SelectItem value="Discontinued">Discontinued</SelectItem>
                    <SelectItem value="Vintage">Vintage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.edition', 'Edition / Release')}
                  </label>
                  <Input
                    value={formData.edition || ''}
                    onChange={(e) => handleChange('edition', e.target.value)}
                    placeholder={t('whiskey.editionPlaceholder', 'e.g. Batch #4, 2020 Release')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.replacementDifficulty', 'Replacement Difficulty')}
                  </label>
                  <Select
                    value={formData.replacement_difficulty || '_auto'}
                    onValueChange={(value) => handleChange('replacement_difficulty', value === '_auto' ? '' : value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue placeholder={t('whiskey.replacementDifficultyPlaceholder', 'Auto-computed if blank')} />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="_auto">Auto-Compute</SelectItem>
                    <SelectItem value="easy">Easy to Replace</SelectItem>
                    <SelectItem value="moderate">Moderately Available</SelectItem>
                    <SelectItem value="hard">Hard to Replace</SelectItem>
                    <SelectItem value="very_hard">Very Hard to Replace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.manualValueOverride', 'Manual Value Override')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.manual_value_override || ''}
                    onChange={(e) => handleChange('manual_value_override', e.target.value)}
                    placeholder={t('whiskey.manualValueOverridePlaceholder', 'Override engine value')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                  <p className="text-xs mt-1" style={{ color: 'rgba(224,200,160,0.5)' }}>
                    Takes precedence over all computed values when set.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.discontinued || false}
                    onChange={(e) => handleChange('discontinued', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[#D8C7A6]">
                    {t('whiskey.discontinued', 'Discontinued')}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allocated || false}
                    onChange={(e) => handleChange('allocated', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-[#D8C7A6]">
                    {t('whiskey.allocated', 'Allocated / Lottery')}
                  </span>
                </label>
              </div>

              <div className="mt-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.availabilityNote', 'Availability Note')}
                </label>
                <Input
                  value={formData.availability_note || ''}
                  onChange={(e) => handleChange('availability_note', e.target.value)}
                  placeholder={t('whiskey.availabilityNotePlaceholder', 'e.g. Distillery exclusive, regional allocation')}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.valuationNotes', 'Valuation Notes')}
                </label>
                <Textarea
                  value={formData.valuation_notes || ''}
                  onChange={(e) => handleChange('valuation_notes', e.target.value)}
                  placeholder={t('whiskey.valuationNotesPlaceholder', 'Notes on value reasoning, sources, or context')}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-20"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.valueSourceNotes', 'Value Source Notes')}
                </label>
                <Input
                  value={formData.value_source_notes || ''}
                  onChange={(e) => handleChange('value_source_notes', e.target.value)}
                  placeholder={t('whiskey.valueSourceNotesPlaceholder', 'e.g. Whisky Auctioneer Oct 2024')}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
              </div>
            </div>

            {/* RATING & MEDIA SECTION */}
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B48C4B] mb-3">
                Rating & Media
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.rating', 'Personal Rating')}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating || ''}
                    onChange={(e) => handleChange('rating', e.target.value)}
                    placeholder={t('whiskey.ratingPlaceholder', '1-5')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.favorite || false}
                      onChange={(e) => handleChange('favorite', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#D8C7A6]">
                      {t('whiskey.favorite', 'Favorite Bottle')}
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.photo', 'Bottle Photo')}
                </label>

                {photoPreview ? (
                  <div className="relative w-full h-64 rounded-xl overflow-hidden border border-[rgba(180,140,75,0.2)] mb-3 bg-black/20">
                    <img
                      src={photoPreview}
                      alt={t('whiskey.photoPreview', 'Bottle preview')}
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => commitPhoto('')}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}

                <PhotoUploader
                  onPhotosSelected={handlePhotoFilesSelected}
                  existingPhotos={photoPreview ? [photoPreview] : []}
                  maxPhotos={1}
                  showSearchOption={false}
                  recordType="bottle"
                  recordData={bottleSearchContext}
                />

                {uploadingPhoto ? (
                  <p className="text-xs mt-2 text-[#D8C7A6]">
                    {t('photos.processing', 'Processing photo...')}
                  </p>
                ) : null}
              </div>
            </div>

            {/* NOTES SECTION */}
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B48C4B] mb-3">
                Notes
              </p>

              <div className="mb-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.flavorNotes', 'Flavor Notes')}
                </label>
                <input
                  value={formData.flavor_notes || ''}
                  onChange={(e) => handleChange('flavor_notes', e.target.value)}
                  placeholder={t('whiskey.flavorNotesPlaceholder', 'e.g. Vanilla, caramel, smoke, dried fruit, oak…')}
                  className="w-full rounded-xl px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7] outline-none"
                />
                <p className="text-xs mt-1" style={{ color: 'rgba(224,200,160,0.5)' }}>
                  Comma-separated tasting descriptors used for AI recommendations.
                </p>
              </div>

              <div>
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.tastingNotes', 'Tasting Notes')}
                </label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder={t(
                    'whiskey.notesPlaceholder',
                    'Describe the flavor profile, aromas, finish, or collector notes.'
                  )}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-24"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer — sticky, always visible on mobile */}
        <div
          className="shrink-0 flex gap-3 justify-end px-6 py-4 border-t"
          style={{ borderColor: 'rgba(180,140,75,0.18)' }}
        >
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            form="bottle-form"
            style={{
              background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
              color: '#F5F1E7',
            }}
          >
            {bottle ? t('common.save', 'Save') : t('common.create', 'Create')}
          </Button>
        </div>
      </div>
    </>
  );
}