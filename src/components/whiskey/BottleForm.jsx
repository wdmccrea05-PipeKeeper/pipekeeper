import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import ImageCropper from '@/components/pipes/ImageCropper';
import FormSection from '@/components/forms/FormSection';
import BottleCatalogSearch from './BottleCatalogSearch';

import PhotoUploader from '@/components/PhotoUploader';
import { toast } from 'sonner';
import { getItemPhoto } from '@/lib/images/getItemPhoto';

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
  return getItemPhoto(record) || '';
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
      toast.error(t('photos.readError'));
    }
  };

  const handleOnlineImageSelected = (imageUrl) => {
    commitPhoto(imageUrl);
    setShowOnlineSearch(false);
    toast.success(t('photos.selected'));
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
        toast.error(t('photos.uploadFailed'));
        return;
      }

      commitPhoto(uploadedUrl);
      toast.success(t('photos.uploaded'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('photos.uploadFailed'));
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
              ? t('whiskey.editBottle')
              : t('whiskey.addBottle')}
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
                {t('whiskey.bottleType')} *
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
                    {t('whiskey.whiskeyBottle')}
                  </SelectItem>
                  <SelectItem value="wine">
                    {t('whiskey.wineBottle')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* QUICK ADD FROM CATALOG */}
            <FormSection title={t("auto.components_whiskey_BottleForm.quick_add_from_catalog_tfy53u")} defaultOpen={true}>
              <BottleCatalogSearch
                onSelect={(entry) => {
                  setFormData((prev) => ({
                    ...prev,
                    name: entry.name ?? prev.name,
                    distillery: entry.distillery ?? prev.distillery,
                    region: entry.region ?? prev.region,
                    country: entry.country ?? prev.country,
                    type: entry.type ?? prev.type,
                    abv: entry.abv != null ? String(entry.abv) : prev.abv,
                    age: entry.age != null ? String(entry.age) : prev.age,
                    retail_price: entry.retail_price != null ? String(entry.retail_price) : prev.retail_price,
                  }));
                }}
                onManualAdd={onCancel}
              />
            </FormSection>

            {/* IDENTITY SECTION */}
            <FormSection
              title={t("auto.components_whiskey_BottleForm.identity_1q3z8u")}
              defaultOpen={true}
              summary={[formData.name, formData.distillery].filter(Boolean).join(' · ')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.name')} *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={t('whiskey.bottleNamePlaceholder')}
                    required
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {formData.bottle_type === 'wine'
                      ? t('wine.winery')
                      : t('whiskey.distillery')}
                  </label>
                  <Input
                    value={formData.distillery}
                    onChange={(e) => handleChange('distillery', e.target.value)}
                    placeholder={
                      formData.bottle_type === 'wine'
                        ? t('wine.wineryPlaceholder')
                        : t('whiskey.distilleryPlaceholder')
                    }
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.region')}
                  </label>
                  <Input
                    value={formData.region}
                    onChange={(e) => handleChange('region', e.target.value)}
                    placeholder={t('whiskey.regionPlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.country')}
                  </label>
                  <Input
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder={t('whiskey.countryPlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.type')}
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleChange('type', value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blended Grain">{t("auto.components_whiskey_BottleForm.blended_grain_1y2b1i")}</SelectItem>
                      <SelectItem value="Blended Malt">{t("auto.components_whiskey_BottleForm.blended_malt_w9dx9d")}</SelectItem>
                      <SelectItem value="Blended Whiskey">{t("auto.components_whiskey_BottleForm.blended_whiskey_1rvyqi")}</SelectItem>
                      <SelectItem value="Bourbon">{t("auto.components_whiskey_BottleForm.bourbon_1saguy")}</SelectItem>
                      <SelectItem value="Irish Whiskey">{t("auto.components_whiskey_BottleForm.irish_whiskey_pw6ibs")}</SelectItem>
                      <SelectItem value="Rye">{t("auto.components_whiskey_BottleForm.rye_376qph")}</SelectItem>
                      <SelectItem value="Scotch Whisky">{t("auto.components_whiskey_BottleForm.scotch_whisky_ff1aeg")}</SelectItem>
                      <SelectItem value="Single Grain">{t("auto.components_whiskey_BottleForm.single_grain_1q1c7p")}</SelectItem>
                      <SelectItem value="Single Malt">{t("auto.components_whiskey_BottleForm.single_malt_neodkl")}</SelectItem>
                      <SelectItem value="Tennessee Whiskey">{t("auto.components_whiskey_BottleForm.tennessee_whiskey_10z1e0")}</SelectItem>
                      <SelectItem value="Other">{t("auto.components_whiskey_BottleForm.other_3u793b")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* DISTILLERY & DETAILS SECTION */}
            <FormSection title={t("auto.components_whiskey_BottleForm.distillery_and_details_1bmu5n")} defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.age')}
                  </label>
                  <Input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => handleChange('age', e.target.value)}
                    placeholder={t('whiskey.agePlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.abv')}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.abv || ''}
                    onChange={(e) => handleChange('abv', e.target.value)}
                    placeholder={t('whiskey.abvPlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.bottleSize')}
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
                      <SelectItem value="Other">{t("auto.components_whiskey_BottleForm.other_3u793b")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* INVENTORY & PURCHASE SECTION */}
            <FormSection title={t("auto.components_whiskey_BottleForm.inventory_and_purchase_1o9dlr")} defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.acquisitionMethod')}
                  </label>
                  <Select
                    value={formData.purchase_type}
                    onValueChange={(value) => handleChange('purchase_type', value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">{t("auto.components_whiskey_BottleForm.retail_1lb3kj")}</SelectItem>
                      <SelectItem value="aftermarket">{t("auto.components_whiskey_BottleForm.aftermarket_secondary_1c8ijb")}</SelectItem>
                      <SelectItem value="gift">{t("auto.components_whiskey_BottleForm.gift_yjtl0v")}</SelectItem>
                      <SelectItem value="trade">{t("auto.components_whiskey_BottleForm.trade_swap_74xkkf")}</SelectItem>
                      <SelectItem value="other">{t("auto.components_whiskey_BottleForm.other_3u793b")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.purchaseLocation')}
                  </label>
                  <Input
                    value={formData.purchase_location || ''}
                    onChange={(e) => handleChange('purchase_location', e.target.value)}
                    placeholder={t('whiskey.purchaseLocationPlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.amountPaid')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price || ''}
                    onChange={(e) => handleChange('purchase_price', e.target.value)}
                    placeholder={t('whiskey.amountPaidPlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.purchaseDate')}
                  </label>
                  <Input
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => handleChange('purchase_date', e.target.value)}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              {/* Value & Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.collectorValue')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.collector_value || ''}
                    onChange={(e) => handleChange('collector_value', e.target.value)}
                    placeholder={t('whiskey.collectorValuePlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.retailPrice')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.retail_price || ''}
                    onChange={(e) => handleChange('retail_price', e.target.value)}
                    placeholder={t('whiskey.retailPricePlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.aftermarketPrice')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.aftermarket_price || ''}
                    onChange={(e) => handleChange('aftermarket_price', e.target.value)}
                    placeholder={t('whiskey.aftermarketPricePlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.valueConfidence')}
                  </label>
                  <Select
                    value={formData.value_confidence || 'medium'}
                    onValueChange={(value) => handleChange('value_confidence', value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t("auto.components_whiskey_BottleForm.high_yjucrp")}</SelectItem>
                      <SelectItem value="medium">{t("auto.components_whiskey_BottleForm.medium_1i29el")}</SelectItem>
                      <SelectItem value="low">{t("auto.components_whiskey_BottleForm.low_376lfb")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* NOTES & TAGS SECTION */}
            <FormSection title={t("auto.components_whiskey_BottleForm.notes_and_tags_1xv94o")} defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.productionStatus')}
                  </label>
                  <Select
                    value={formData.production_status || '_none'}
                    onValueChange={(value) => handleChange('production_status', value === '_none' ? '' : value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue placeholder={t('whiskey.productionStatusPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Active">{t("auto.components_whiskey_BottleForm.active_ongoing_1j2kvh")}</SelectItem>
                    <SelectItem value="Allocated">{t("auto.components_whiskey_BottleForm.allocated_1e9tua")}</SelectItem>
                    <SelectItem value="Discontinued">{t("auto.components_whiskey_BottleForm.discontinued_10hh6x")}</SelectItem>
                    <SelectItem value="Limited Edition">{t("auto.components_whiskey_BottleForm.limited_edition_1ykxz8")}</SelectItem>
                    <SelectItem value="Single Cask">{t("auto.components_whiskey_BottleForm.single_cask_negog9")}</SelectItem>
                    <SelectItem value="Vintage">{t("auto.components_whiskey_BottleForm.vintage_1p982y")}</SelectItem>
                    <SelectItem value="_none">{t("auto.components_whiskey_BottleForm.unknown_172kxt")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.edition')}
                  </label>
                  <Input
                    value={formData.edition || ''}
                    onChange={(e) => handleChange('edition', e.target.value)}
                    placeholder={t('whiskey.editionPlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.replacementDifficulty')}
                  </label>
                  <Select
                    value={formData.replacement_difficulty || '_auto'}
                    onValueChange={(value) => handleChange('replacement_difficulty', value === '_auto' ? '' : value)}
                  >
                    <SelectTrigger className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]">
                      <SelectValue placeholder={t('whiskey.replacementDifficultyPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="_auto">{t("auto.components_whiskey_BottleForm.auto_compute_1jmks5")}</SelectItem>
                    <SelectItem value="very_easy">{t("auto.components_whiskey_BottleForm.very_easy_to_replace_pwuubg")}</SelectItem>
                    <SelectItem value="easy">{t("auto.components_whiskey_BottleForm.easy_to_replace_1z0c5s")}</SelectItem>
                    <SelectItem value="moderate">{t("auto.components_whiskey_BottleForm.moderately_difficult_1l9ars")}</SelectItem>
                    <SelectItem value="hard">{t("auto.components_whiskey_BottleForm.hard_to_replace_15qjtp")}</SelectItem>
                    <SelectItem value="very_hard">{t("auto.components_whiskey_BottleForm.very_hard_rare_12dtjc")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.manualValueOverride')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.manual_value_override || ''}
                    onChange={(e) => handleChange('manual_value_override', e.target.value)}
                    placeholder={t('whiskey.manualValueOverridePlaceholder')}
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                  />
                  <p className="text-xs mt-1" style={{ color: 'rgba(224,200,160,0.5)' }}>
                    {t("auto.components_whiskey_BottleForm.takes_precedence_over_all_computed_values_xcuyf1")}
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
                    {t('whiskey.discontinued')}
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
                    {t('whiskey.allocated')}
                  </span>
                </label>
              </div>

              <div className="mt-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.availabilityNote')}
                </label>
                <Input
                  value={formData.availability_note || ''}
                  onChange={(e) => handleChange('availability_note', e.target.value)}
                  placeholder={t('whiskey.availabilityNotePlaceholder')}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.valuationNotes')}
                </label>
                <Textarea
                  value={formData.valuation_notes || ''}
                  onChange={(e) => handleChange('valuation_notes', e.target.value)}
                  placeholder={t('whiskey.valuationNotesPlaceholder')}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-20"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.valueSourceNotes')}
                </label>
                <Input
                  value={formData.value_source_notes || ''}
                  onChange={(e) => handleChange('value_source_notes', e.target.value)}
                  placeholder={t('whiskey.valueSourceNotesPlaceholder')}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
              </div>
            </FormSection>

            {/* TASTING PROFILE SECTION */}
            <FormSection title={t("auto.components_whiskey_BottleForm.tasting_profile_ty6uts")} defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-sm text-[#D8C7A6] block mb-2">
                    {t('whiskey.rating')}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating || ''}
                    onChange={(e) => handleChange('rating', e.target.value)}
                    placeholder={t('whiskey.ratingPlaceholder')}
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
                      {t('whiskey.favorite')}
                    </span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.flavorNotes')}
                </label>
                <input
                  value={formData.flavor_notes || ''}
                  onChange={(e) => handleChange('flavor_notes', e.target.value)}
                  placeholder={t('whiskey.flavorNotesPlaceholder')}
                  className="w-full rounded-xl px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7] outline-none"
                />
                <p className="text-xs mt-1" style={{ color: 'rgba(224,200,160,0.5)' }}>
                  {t("auto.components_whiskey_BottleForm.comma_separated_tasting_descriptors_used_for_tnmel8")}
                </p>
              </div>

              <div>
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.tastingNotes')}
                </label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder={t(
                    'whiskey.notesPlaceholder'
                  )}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] h-24"
                />
              </div>
            </FormSection>

            {/* PHOTOS SECTION */}
            <FormSection title={t("auto.components_whiskey_BottleForm.photos_1k2it3")} defaultOpen={false}>
              <div>
                <label className="text-sm text-[#D8C7A6] block mb-2">
                  {t('whiskey.photo')}
                </label>

                {photoPreview ? (
                  <div className="relative w-full h-64 rounded-xl overflow-hidden border border-[rgba(180,140,75,0.2)] mb-3 bg-black/20">
                    <img
                      src={photoPreview}
                      alt={t('whiskey.photoPreview')}
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
                    {t('photos.processing')}
                  </p>
                ) : null}
              </div>
            </FormSection>
          </form>
        </div>

        {/* Footer — sticky, always visible on mobile */}
        <div
          className="shrink-0 flex gap-3 justify-end px-6 py-4 border-t"
          style={{ borderColor: 'rgba(180,140,75,0.18)' }}
        >
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="bottle-form"
            style={{
              background: 'linear-gradient(135deg, rgba(163, 92, 92, 1), rgba(140, 74, 74, 1))',
              color: '#F5F1E7',
            }}
          >
            {bottle ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </div>
    </>
  );
}