import React, { useState } from 'react';
// NOTE: This component is intentionally large (~900 lines). Each FormSection is a
// collapsible accordion section. Future refactor: split each section into a sub-component.
// See section comments below for boundaries.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2, Search, Edit, ArrowLeftRight } from "lucide-react";
import FormSection from '@/components/forms/FormSection';
import { base44 } from "@/api/base44Client";
import PipeSearch from "@/components/ai/PipeSearch";
import PhotoIdentifier from "@/components/ai/PhotoIdentifier";
import ImageCropper from "@/components/pipes/ImageCropper";
import FieldWithInfo from "@/components/forms/FieldWithInfo";
import InterchangeableBowls from "@/components/pipes/InterchangeableBowls";
import PhotoUploader from "@/components/PhotoUploader";
import { useMeasurement, imperialToMetric } from "@/components/utils/measurementConversion";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { canCreatePipe, FREE_TIER_LIMITS } from "@/components/utils/limitChecks";
import { toast } from "sonner";
import { useRecentValues } from "@/components/hooks/useRecentValues";
import { Combobox } from "@/components/ui/combobox";
import { preparePipeData } from "@/components/utils/schemaCompatibility";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { CuratorEvents } from "@/components/utils/curatorEventLogger";
import { sortByLabel, uniqueSortedStrings } from "@/lib/sorting/alphabetical";

const SHAPES = ["Billiard", "Bent Billiard", "Apple", "Bent Apple", "Dublin", "Bent Dublin", "Bulldog", "Rhodesian", "Canadian", "Liverpool", "Lovat", "Lumberman", "Prince", "Author", "Brandy", "Pot", "Tomato", "Egg", "Acorn", "Pear", "Cutty", "Devil Anse", "Hawkbill", "Diplomat", "Poker", "Cherrywood", "Duke", "Don", "Tankard", "Churchwarden", "Nosewarmer", "Vest Pocket", "MacArthur", "Calabash", "Reverse Calabash", "Cavalier", "Freehand", "Blowfish", "Volcano", "Horn", "Nautilus", "Tomahawk", "Bullmoose", "Bullcap", "Oom Paul (Hungarian)", "Tyrolean", "Unknown", "Other"];
const BOWL_STYLES = ["Cylindrical (Straight Wall)", "Conical (Tapered)", "Rounded / Ball", "Oval / Egg", "Squat / Pot", "Chimney (Tall)", "Paneled", "Faceted / Multi-Panel", "Horn-Shaped", "Freeform", "Unknown"];
const SHANK_SHAPES = ["Round", "Diamond", "Square", "Oval", "Paneled / Faceted", "Military / Army Mount", "Freeform", "Unknown"];
const BENDS = ["Straight", "1/4 Bent", "1/2 Bent", "3/4 Bent", "Full Bent", "S-Bend", "Unknown"];
const SIZE_CLASSES = ["Vest Pocket", "Small", "Standard", "Large", "Magnum / XL", "Churchwarden", "MacArthur", "Unknown"];
const BOWL_MATERIALS = ["Briar", "Meerschaum", "Corn Cob", "Clay", "Olive Wood", "Cherry Wood", "Morta", "Other"];
const STEM_MATERIALS = ["Acrylic", "Amber", "Bone", "Cumberland", "Ebonite", "Horn", "Lucite", "Other", "Vulcanite"];
const FINISHES = ["Smooth", "Sandblast", "Rusticated", "Partially Rusticated", "Carved", "Natural", "Other"];
const CHAMBER_VOLUMES = ["Small", "Medium", "Large", "Extra Large"];
const CONDITIONS = ["Mint", "Excellent", "Very Good", "Good", "Fair", "Poor", "Estate - Unrestored"];
const FILTER_TYPES = ["None", "6mm", "9mm", "Stinger", "Other"];

export default function PipeForm({ pipe, onSave, onCancel, isLoading }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(() => {
    const defaults = {
      name: '',
      maker: '',
      country_of_origin: '',
      shape: '',
      bowlStyle: '',
      shankShape: '',
      bend: '',
      sizeClass: '',
      length_mm: '',
      weight_grams: '',
      bowl_height_mm: '',
      bowl_width_mm: '',
      bowl_diameter_mm: '',
      bowl_depth_mm: '',
      chamber_volume: '',
      stem_material: '',
      bowl_material: '',
      finish: '',
      filter_type: '',
      year_made: '',
      purchase_date: '',
      stamping: '',
      condition: '',
      purchase_price: '',
      estimated_value: '',
      notes: '',
      usage_characteristics: '',
      smoking_characteristics: '',
      photos: [],
      stamping_photos: [],
      is_favorite: false,
      ai_excluded: false,
      interchangeable_bowls: [],
    };
    const merged = { ...defaults, ...(pipe || {}) };
    merged.photos = Array.isArray(pipe?.photos)
      ? pipe.photos
      : [pipe?.photo, pipe?.photo_url, pipe?.image, pipe?.image_url].filter(Boolean);
    merged.stamping_photos = Array.isArray(pipe?.stamping_photos) ? pipe.stamping_photos : [];
    return merged;
  });
  const [hasInterchangeableBowls, setHasInterchangeableBowls] = useState(
    pipe?.interchangeable_bowls?.length > 0 || false
  );
  const [uploading, setUploading] = useState(false);
  const [uploadingStamping, setUploadingStamping] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [cropperType, setCropperType] = useState(null);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState(null);
  const [showOnlineSearch, setShowOnlineSearch] = useState(false);
  const [onlineSearchType, setOnlineSearchType] = useState(null); // 'photo' | 'stamping'

  const { user, hasPaid, isTrial } = useCurrentUser();
  const entitlements = useEntitlements();
  const isPaidUser = hasPaid;
  const photoLimit = Number.isFinite(entitlements?.limits?.photosPerItem)
    ? entitlements.limits.photosPerItem
    : FREE_TIER_LIMITS.PHOTOS_PER_ITEM;
  
  const { useImperial, setUseImperial, convertLength, convertWeight, getLengthUnit, getWeightUnit } = useMeasurement();

  // Auto-suggest recent values
  const { data: recentMakers = [] } = useRecentValues("Pipe", "maker");
  const { data: recentCountries = [] } = useRecentValues("Pipe", "country_of_origin");
  const { data: recentBowlMaterials = [] } = useRecentValues("Pipe", "bowl_material");
  const { data: recentStemMaterials = [] } = useRecentValues("Pipe", "stem_material");
  const sortedRecentMakers = React.useMemo(
    () => uniqueSortedStrings(recentMakers),
    [recentMakers]
  );
  const sortedRecentCountries = React.useMemo(
    () =>
      uniqueSortedStrings(
        recentCountries.map((country) => (country === "USA" ? "United States" : country))
      ),
    [recentCountries]
  );
  const sortedBowlMaterials = React.useMemo(
    () => uniqueSortedStrings([...BOWL_MATERIALS, ...recentBowlMaterials]),
    [recentBowlMaterials]
  );
  const sortedStemMaterials = React.useMemo(
    () => uniqueSortedStrings([...STEM_MATERIALS, ...recentStemMaterials]),
    [recentStemMaterials]
  );
  const sortedShapes = React.useMemo(() => sortByLabel(SHAPES, (value) => value), []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [dataSource, setDataSource] = useState(null);

  const handleSearchSelect = (searchData) => {
    setFormData(prev => {
      // Merge search data, but preserve any existing photos
      const { photos: _photos, stamping_photos: _stampingPhotos, ...rest } = searchData;
      return {
        ...prev,
        ...rest
      };
    });
    setDataSource('Web Search');
  };

  const handlePhotoIdentify = (identifiedData) => {
    setFormData(prev => {
      // Merge identified data, but preserve any existing photos
      const { photos: _photos, stamping_photos: _stampingPhotos, ...rest } = identifiedData;
      return {
        ...prev,
        ...rest
      };
    });
    setDataSource('AI Photo Identification');
  };



  const handlePhotoUpload = async (e, isStamping = false) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // For single file, open cropper
    if (files.length === 1) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropperImage(event.target.result);
        setCropperType(isStamping ? 'stamping' : 'photo');
      };
      reader.readAsDataURL(file);
      return;
    }

    // For multiple files, upload directly
    if (isStamping) {
      setUploadingStamping(true);
    } else {
      setUploading(true);
    }

    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);

      if (isStamping) {
        handleChange('stamping_photos', [...(formData.stamping_photos || []), ...urls]);
      } else {
        handleChange('photos', [...(formData.photos || []), ...urls]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      if (isStamping) {
        setUploadingStamping(false);
      } else {
        setUploading(false);
      }
    }
  };

  const handleCroppedImage = async (croppedDataUrl) => {
    const isStamping = cropperType === 'stamping';
    
    if (isStamping) {
      setUploadingStamping(true);
    } else {
      setUploading(true);
    }

    try {
      // Convert data URL to blob
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      
      // Upload
      const result = await base44.integrations.Core.UploadFile({ file });
      
      // If editing existing photo, replace it
      if (editingPhotoIndex !== null) {
        if (isStamping) {
          const newPhotos = [...(formData.stamping_photos || [])];
          newPhotos[editingPhotoIndex] = result.file_url;
          handleChange('stamping_photos', newPhotos);
        } else {
          const newPhotos = [...(formData.photos || [])];
          newPhotos[editingPhotoIndex] = result.file_url;
          handleChange('photos', newPhotos);
        }
        setEditingPhotoIndex(null);
      } else {
        // Adding new photo
        if (isStamping) {
          handleChange('stamping_photos', [...(formData.stamping_photos || []), result.file_url]);
        } else {
          handleChange('photos', [...(formData.photos || []), result.file_url]);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setCropperImage(null);
      setCropperType(null);
      if (isStamping) {
        setUploadingStamping(false);
      } else {
        setUploading(false);
      }
    }
  };

  const removePhoto = (index, isStamping = false) => {
    if (isStamping) {
      handleChange('stamping_photos', (formData.stamping_photos || []).filter((_, i) => i !== index));
    } else {
      handleChange('photos', (formData.photos || []).filter((_, i) => i !== index));
    }
  };

  const editPhoto = (index, isStamping = false) => {
    setEditingPhotoIndex(index);
    const photoUrl = isStamping ? formData.stamping_photos[index] : formData.photos[index];
    setCropperImage(photoUrl);
    setCropperType(isStamping ? 'stamping' : 'photo');
  };

  const handleOnlineImageSelected = (imageUrl) => {
    setCropperImage(imageUrl);
    setCropperType(onlineSearchType || 'photo');
    setShowOnlineSearch(false);
    setOnlineSearchType(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check free tier limits for new pipes only
    if (!pipe && !isPaidUser) {
      const result = await canCreatePipe(user?.email, isPaidUser, false);
      if (!result.canCreate) {
        toast.error(result.reason || t("limits.pipesLimit", { limit: result.limit }));
        return;
      }
    }

    // Check photo limits
    const totalPhotos = (formData.photos?.length || 0) + (formData.stamping_photos?.length || 0);
    if (totalPhotos > photoLimit) {
      toast.error(t("limits.photosLimit", { limit: photoLimit }));
      return;
    }

    const roundOptional = (val) => {
      if (!val) return null;
      const num = Number(val);
      const rounded = Math.round(num * 100) / 100;
      return rounded % 1 === 0 ? Math.round(rounded) : rounded;
    };

    const cleanedData = {
      ...formData,
      length_mm: roundOptional(formData.length_mm),
      weight_grams: roundOptional(formData.weight_grams),
      bowl_height_mm: roundOptional(formData.bowl_height_mm),
      bowl_width_mm: roundOptional(formData.bowl_width_mm),
      bowl_diameter_mm: roundOptional(formData.bowl_diameter_mm),
      bowl_depth_mm: roundOptional(formData.bowl_depth_mm),
      purchase_price: roundOptional(formData.purchase_price),
      estimated_value: roundOptional(formData.estimated_value),
      interchangeable_bowls: hasInterchangeableBowls ? formData.interchangeable_bowls : [],
    };

    // Log event
    if (!pipe) {
      CuratorEvents.itemAdded({
        metadata: {
          item_type: 'pipe',
          has_photos: (formData.photos?.length || 0) > 0,
          data_source: dataSource,
        },
      });
    } else {
      CuratorEvents.itemEdited({
        metadata: {
          item_type: 'pipe',
          item_id: pipe.id,
        },
      });
    }

    onSave(preparePipeData(cleanedData));
  };

  return (
    <>
      {cropperImage && (
        <ImageCropper
          imageUrl={cropperImage}
          onSave={handleCroppedImage}
          onCancel={() => {
            setCropperImage(null);
            setCropperType(null);
            setEditingPhotoIndex(null);
          }}
        />
      )}

      {/* OnlineImageSearchModal hidden for this release */}

      <form onSubmit={handleSubmit} className="space-y-6">
      {/* ===== SECTION: AI Search (new pipes only) ===== */}
      {!pipe && (
        <>
          <Card className="border-[#A35C5C]/50" variant="elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#E0D8C8] flex items-center gap-2">
                <Search className="w-5 h-5" />
                {t("pipesExtended.searchForPipe")}
              </CardTitle>
              <p className="text-sm text-[#E0D8C8]/70">
                {t("pipesExtended.searchDesc")}
              </p>
            </CardHeader>
            <CardContent>
              <PipeSearch onSelect={handleSearchSelect} />
            </CardContent>
          </Card>

          <PhotoIdentifier onIdentify={handlePhotoIdentify} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[rgba(20,15,11,0.98)] px-2 text-[#D7C9B2]/70">{t("formsExtended.orEnterManually")}</span>
            </div>
          </div>
        </>
      )}

      {/* ===== SECTION: Pipe Photos ===== */}
      <FormSection
        title={t("pipesExtended.pipePhotos")}
        summary={formData.photos?.length ? `${formData.photos.length} photo(s)` : undefined}
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {formData.photos?.map((photo, idx) => (
            <div key={idx} className="relative aspect-[16/9] rounded-lg overflow-hidden border border-[#E0D8C8]/15 group">
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => editPhoto(idx, false)}
                  className="bg-[#A35C5C]/80 rounded-full p-1.5 hover:bg-[#A35C5C]"
                >
                  <Edit className="w-3.5 h-3.5 text-[#E0D8C8]" />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="bg-[#E05D5D]/80 rounded-full p-1.5 hover:bg-[#E05D5D]"
                >
                  <X className="w-3.5 h-3.5 text-[#E0D8C8]" />
                </button>
              </div>
            </div>
          ))}
          <div className="aspect-[16/9] rounded-lg border-2 border-dashed border-[#E0D8C8]/20 hover:border-[#A35C5C]/50 transition-colors flex items-center justify-center p-3">
            <PhotoUploader
              onPhotosSelected={(files) => {
                const file = files?.[0];
                if (!file) return;
                try {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setCropperImage(event.target.result);
                    setCropperType('photo');
                  };
                  reader.readAsDataURL(file);
                } catch (err) {
                  console.error('Error reading file:', err);
                }
              }}
              showSearchOption={false}
              recordType="pipe"
              recordData={formData}
              existingPhotos={[]}
              hideExisting
            />
          </div>
        </div>
      </FormSection>

      {/* ===== SECTION: Stamping Photos ===== */}
      <FormSection
        title={t("pipesExtended.stampingPhotos")}
        summary={formData.stamping_photos?.length ? `${formData.stamping_photos.length} photo(s)` : undefined}
        defaultOpen={false}
      >
        <p className="text-sm text-[#E0D8C8]/70">{t("pipesExtended.stampingPhotosDesc")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {formData.stamping_photos?.map((photo, idx) => (
            <div key={idx} className="relative aspect-[16/9] rounded-lg overflow-hidden border border-[#E0D8C8]/15 group">
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => editPhoto(idx, true)}
                  className="bg-[#A35C5C]/80 rounded-full p-1.5 hover:bg-[#A35C5C]"
                >
                  <Edit className="w-3.5 h-3.5 text-[#E0D8C8]" />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(idx, true)}
                  className="bg-[#E05D5D]/80 rounded-full p-1.5 hover:bg-[#E05D5D]"
                >
                  <X className="w-3.5 h-3.5 text-[#E0D8C8]" />
                </button>
              </div>
            </div>
          ))}
          <div className="aspect-[16/9] rounded-lg border-2 border-dashed border-[#E0D8C8]/20 hover:border-[#A35C5C]/50 transition-colors flex items-center justify-center p-3">
            <PhotoUploader
              onPhotosSelected={(files) => {
                const file = files?.[0];
                if (!file) return;
                try {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setCropperImage(event.target.result);
                    setCropperType('stamping');
                  };
                  reader.readAsDataURL(file);
                } catch (err) {
                  console.error('Error reading file:', err);
                }
              }}
              showSearchOption={false}
              recordType="pipe"
              recordData={formData}
              existingPhotos={[]}
              hideExisting
            />
          </div>
        </div>
      </FormSection>

      {/* ===== SECTION: Pipe Identity ===== */}
      <FormSection
        title="Identity"
        summary={[formData.name, formData.maker].filter(Boolean).join(' · ') || undefined}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithInfo 
            label={t("pipesExtended.name")} 
            required 
            helpText={t("pipesExtended.nameHelp")}
          >
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t("pipesExtended.namePlaceholder")}
              required
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.maker")} 
            helpText={t("pipesExtended.makerHelp")}
          >
            <Combobox
              value={formData.maker}
              onValueChange={(v) => handleChange('maker', v)}
              options={sortedRecentMakers}
              placeholder={t("pipesExtended.makerPlaceholder")}
              searchPlaceholder={t("common.searchPlaceholder")}
              allowCustom={true}
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.country")} 
            helpText={t("pipesExtended.countryHelp")}
          >
            <Combobox
              value={formData.country_of_origin}
              onValueChange={(v) => {
                // Normalize common aliases to canonical form
                const normalized = v === 'USA' ? 'United States' : v;
                handleChange('country_of_origin', normalized);
              }}
              options={sortedRecentCountries}
              placeholder={t("pipesExtended.countryPlaceholder")}
              searchPlaceholder={t("common.searchPlaceholder")}
              allowCustom={true}
            />
          </FieldWithInfo>
          <FieldWithInfo 
          label={t("pipesExtended.yearMade")} 
          helpText={t("pipesExtended.yearMadeHelp")}
          >
          <Input
            value={formData.year_made}
            onChange={(e) => handleChange('year_made', e.target.value)}
            placeholder={t("pipesExtended.yearMadePlaceholder")}
          />
          </FieldWithInfo>
          <FieldWithInfo 
          label={t("pipesExtended.purchaseDate")} 
          helpText={t("pipesExtended.purchaseDateHelp")}
          >
          <Input
            type="date"
            value={formData.purchase_date}
            onChange={(e) => handleChange('purchase_date', e.target.value)}
          />
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.stamping")} 
            helpText={t("pipesExtended.stampingHelp")}
          >
            <Input
              value={formData.stamping}
              onChange={(e) => handleChange('stamping', e.target.value)}
              placeholder={t("pipesExtended.stampingPlaceholder")}
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.condition")} 
            helpText={t("pipesExtended.conditionHelp")}
          >
            <Select value={formData.condition || ''} onValueChange={(v) => handleChange('condition', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(cond => <SelectItem key={cond} value={cond}>{t(`conditions.${cond}`, cond)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
        </div>
      </FormSection>

      {/* ===== SECTION: Geometry & Dimensions ===== */}
      <FormSection
        title="Geometry & Measurements"
        defaultOpen={false}
      >
        <p className="text-sm text-[#E0D8C8]/70">{t("pipesExtended.pipeGeometryDesc")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithInfo
            label={t("pipesExtended.shape")}
            required
            helpText={t("pipesExtended.shapeHelp")}
          >
            <Select value={formData.shape || "Unknown"} onValueChange={(v) => handleChange('shape', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {sortedShapes.map(shape => <SelectItem key={shape} value={shape}>{t(`shapes.${shape}`, shape)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.bowlStyle")} 
            helpText={t("pipesExtended.bowlStyleHelp")}
          >
            <Select value={formData.bowlStyle || "Unknown"} onValueChange={(v) => handleChange('bowlStyle', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {BOWL_STYLES.map(style => <SelectItem key={style} value={style}>{t(`bowlStyles.${style}`, style)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.shankShape")} 
            helpText={t("pipesExtended.shankShapeHelp")}
          >
            <Select value={formData.shankShape || "Unknown"} onValueChange={(v) => handleChange('shankShape', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {SHANK_SHAPES.map(shape => <SelectItem key={shape} value={shape}>{t(`shankShapes.${shape}`, shape)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.bend")} 
            helpText={t("pipesExtended.bendHelp")}
          >
            <Select value={formData.bend || "Unknown"} onValueChange={(v) => handleChange('bend', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {BENDS.map(bend => <SelectItem key={bend} value={bend}>{t(`bends.${bend}`, bend)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.sizeClass")} 
            helpText={t("pipesExtended.sizeClassHelp")}
          >
            <Select value={formData.sizeClass || "Standard"} onValueChange={(v) => handleChange('sizeClass', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {SIZE_CLASSES.map(size => <SelectItem key={size} value={size}>{t(`sizeClasses.${size}`, size)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
        </div>
      </FormSection>

      {/* ===== SECTION: Materials & Finish ===== */}
      <FormSection
        title="Construction & Finish"
        summary={[formData.shape, formData.bowl_material].filter(Boolean).join(', ') || undefined}
        defaultOpen={false}
      >
        <div className="flex flex-row items-center justify-between gap-2 mb-2">
          {dataSource && (
            <p className="text-xs text-[#E0D8C8]/70">{t("formsExtended.dataSource")}: {dataSource}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUseImperial(!useImperial)}
            className="whitespace-nowrap shrink-0 ml-auto"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            {useImperial ? t("pipesExtended.showMetric") : t("pipesExtended.showImperial")}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldWithInfo
            label={t("pipesExtended.bowlMaterial")}
            helpText={t("pipesExtended.bowlMaterialHelp")}
          >
            <Combobox
              value={formData.bowl_material}
              onValueChange={(v) => handleChange('bowl_material', v)}
              options={sortedBowlMaterials}
              placeholder={t("common.selectPlaceholder")}
              searchPlaceholder={t("common.searchPlaceholder")}
              allowCustom={false}
            />
          </FieldWithInfo>
          <FieldWithInfo
            label={t("pipesExtended.stemMaterial")}
            helpText={t("pipesExtended.stemMaterialHelp")}
          >
            <Combobox
              value={formData.stem_material}
              onValueChange={(v) => handleChange('stem_material', v)}
              options={sortedStemMaterials}
              placeholder={t("common.selectPlaceholder")}
              searchPlaceholder={t("common.searchPlaceholder")}
              allowCustom={false}
            />
          </FieldWithInfo>
          <FieldWithInfo
            label={t("pipesExtended.finish")}
            helpText={t("pipesExtended.finishHelp")}
          >
            <Select value={formData.finish || ''} onValueChange={(v) => handleChange('finish', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {FINISHES.map(finish => <SelectItem key={finish} value={finish}>{t(`finishes.${finish}`, finish)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.chamberVolume")} 
            helpText={t("pipesExtended.chamberVolumeHelp")}
          >
            <Select value={formData.chamber_volume || ''} onValueChange={(v) => handleChange('chamber_volume', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CHAMBER_VOLUMES.map(vol => <SelectItem key={vol} value={vol}>{t(`sizes.${vol}`, vol)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("pipesExtended.filterType")} 
            helpText={t("pipesExtended.filterTypeHelp")}
          >
            <Select value={formData.filter_type || ''} onValueChange={(v) => handleChange('filter_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {FILTER_TYPES.map(filter => <SelectItem key={filter} value={filter}>{t(`filterTypes.${filter}`, filter)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.length")} ({getLengthUnit()})</Label>
            <Input
              type="number"
              step="0.01"
              value={
                formData.length_mm 
                  ? Math.round(convertLength(parseFloat(formData.length_mm)) * 100) / 100
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('length_mm', '');
                } else {
                  const metricVal = useImperial ? imperialToMetric(parseFloat(val), 'length') : parseFloat(val);
                  handleChange('length_mm', String(Math.round(metricVal * 100) / 100));
                }
              }}
              placeholder={useImperial ? "e.g., 5.5" : "e.g., 140"}
            />
          </div>
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.weight")} ({getWeightUnit()})</Label>
            <Input
              type="number"
              step="0.01"
              value={
                formData.weight_grams 
                  ? Math.round(convertWeight(parseFloat(formData.weight_grams)) * 100) / 100
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('weight_grams', '');
                } else {
                  const metricVal = useImperial ? imperialToMetric(parseFloat(val), 'weight') : parseFloat(val);
                  handleChange('weight_grams', String(Math.round(metricVal * 100) / 100));
                }
              }}
              placeholder={useImperial ? "e.g., 1.5" : "e.g., 42"}
            />
          </div>
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.bowlHeight")} ({getLengthUnit()})</Label>
            <Input
              type="number"
              step="0.01"
              value={
                formData.bowl_height_mm 
                  ? Math.round(convertLength(parseFloat(formData.bowl_height_mm)) * 100) / 100
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_height_mm', '');
                } else {
                  const metricVal = useImperial ? imperialToMetric(parseFloat(val), 'length') : parseFloat(val);
                  handleChange('bowl_height_mm', String(Math.round(metricVal * 100) / 100));
                }
              }}
              placeholder={useImperial ? "e.g., 2.0" : "e.g., 50"}
            />
          </div>
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.bowlWidth")} ({getLengthUnit()})</Label>
            <Input
              type="number"
              step="0.01"
              value={
                formData.bowl_width_mm 
                  ? Math.round(convertLength(parseFloat(formData.bowl_width_mm)) * 100) / 100
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_width_mm', '');
                } else {
                  const metricVal = useImperial ? imperialToMetric(parseFloat(val), 'length') : parseFloat(val);
                  handleChange('bowl_width_mm', String(Math.round(metricVal * 100) / 100));
                }
              }}
              placeholder={useImperial ? "e.g., 1.5" : "e.g., 38"}
            />
          </div>
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.chamberDiameter")} ({getLengthUnit()})</Label>
            <Input
              type="number"
              step="0.01"
              value={
                formData.bowl_diameter_mm 
                  ? Math.round(convertLength(parseFloat(formData.bowl_diameter_mm)) * 100) / 100
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_diameter_mm', '');
                } else {
                  const metricVal = useImperial ? imperialToMetric(parseFloat(val), 'length') : parseFloat(val);
                  handleChange('bowl_diameter_mm', String(Math.round(metricVal * 100) / 100));
                }
              }}
              placeholder={useImperial ? "e.g., 0.8" : "e.g., 20"}
            />
          </div>
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.chamberDepth")} ({getLengthUnit()})</Label>
            <Input
              type="number"
              step="0.01"
              value={
                formData.bowl_depth_mm 
                  ? Math.round(convertLength(parseFloat(formData.bowl_depth_mm)) * 100) / 100
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_depth_mm', '');
                } else {
                  const metricVal = useImperial ? imperialToMetric(parseFloat(val), 'length') : parseFloat(val);
                  handleChange('bowl_depth_mm', String(Math.round(metricVal * 100) / 100));
                }
              }}
              placeholder={useImperial ? "e.g., 1.6" : "e.g., 40"}
            />
          </div>
        </div>
      </FormSection>

      {/* ===== SECTION: Value & Notes ===== */}
      <FormSection
        title="Value & Notes"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.purchasePrice")}</Label>
            <Input
              type="number"
              value={formData.purchase_price}
              onChange={(e) => handleChange('purchase_price', e.target.value)}
              placeholder={t("pipesExtended.purchasePricePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label className="break-words">{t("pipesExtended.estimatedValue")}</Label>
            <Input
              type="number"
              value={formData.estimated_value}
              onChange={(e) => handleChange('estimated_value', e.target.value)}
              placeholder={t("pipesExtended.estimatedValuePlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="break-words">{t("pipesExtended.usageCharacteristics")}</Label>
          <Textarea
            value={formData.usage_characteristics || formData.smoking_characteristics}
            onChange={(e) => {
              handleChange('usage_characteristics', e.target.value);
              handleChange('smoking_characteristics', '');
            }}
            placeholder={t("pipesExtended.usageCharacteristicsPlaceholder")}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label className="break-words">{t("common.notes")}</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder={t("pipesExtended.notesPlaceholder")}
            rows={3}
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={formData.is_favorite}
            onCheckedChange={(v) => handleChange('is_favorite', v)}
          />
          <Label className="break-words">{t("formsExtended.markAsFavorite")}</Label>
        </div>
        <div className="pt-4 border-t border-[#E0D8C8]/20">
          <FieldWithInfo
            label={t("formsExtended.collectibleOnly", "Collectible Only")}
            helpText={t("formsExtended.collectibleOnlyHelp", "Exclude this pipe from AI matching, rotation, and recommendation logic. It will still remain in your collection, valuation totals, exports, and insurance documentation.")}
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.ai_excluded || false}
                onCheckedChange={(v) => {
                  handleChange('ai_excluded', v);
                  CuratorEvents.collectibleToggled({
                    metadata: {
                      item_type: 'pipe',
                      item_id: pipe?.id || 'new',
                      ai_excluded: v,
                    },
                  });
                }}
              />
              <span className="text-sm text-[#E0D8C8]/70">{formData.ai_excluded ? t("formsExtended.aiExcluded", "Excluded from AI") : t("formsExtended.aiIncluded", "Included in AI")}</span>
            </div>
          </FieldWithInfo>
        </div>
      </FormSection>

      {/* ===== SECTION: Interchangeable Bowls ===== */}
      <FormSection
        title="Interchangeable Bowls"
        defaultOpen={false}
      >
        <p className="text-sm text-[#E0D8C8]/70">{t("formsExtended.interchangeableBowlsDesc")}</p>
        <div className="flex items-center gap-3">
          <Switch
            checked={hasInterchangeableBowls}
            onCheckedChange={(checked) => {
              setHasInterchangeableBowls(checked);
              if (!checked) {
                handleChange('interchangeable_bowls', []);
              }
            }}
          />
          <Label className="break-words">{t("pipesExtended.hasInterchangeableBowls")}</Label>
        </div>
        {hasInterchangeableBowls && (
          <div className="pt-2">
            <InterchangeableBowls
              pipe={formData}
              onUpdate={(updates) => setFormData({ ...formData, ...updates })}
            />
          </div>
        )}
      </FormSection>

      {/* ===== SECTION: Form Actions ===== */}
      {/* Actions */}
      <div className="sticky bottom-0 bg-[linear-gradient(180deg,rgba(22,18,14,0.94)_0%,rgba(18,14,11,0.97)_100%)] backdrop-blur-sm border-t border-[rgba(140,105,65,0.18)] p-4 sm:p-6 flex gap-3 justify-end -mx-6 sm:-mx-8 px-6 sm:px-8">
        <Button type="button" variant="outline" onClick={onCancel} className="bg-black/15 border-[rgba(140,105,65,0.35)] text-[#E0D8C8] hover:bg-white/5">
          {t("common.cancel")}
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-[#A35C5C] hover:bg-[#8F4E4E] text-white"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {pipe ? t("pipesExtended.updatePipe") : t("pipesExtended.addPipe")}
        </Button>
      </div>
    </form>
    </>
  );
}
