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
  rating: '',
  favorite: false,
  photo: '',
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
          <form id="bottle-form" onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
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
                onSearchOnlineClick={() => setShowOnlineSearch(true)}
                showSearchOption={true}
                recordType="bottle"
                recordData={bottleSearchContext}
              />

              {uploadingPhoto ? (
                <p className="text-xs mt-2 text-[#D8C7A6]">
                  {t('photos.processing', 'Processing photo...')}
                </p>
              ) : null}
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