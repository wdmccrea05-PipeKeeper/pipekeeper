import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Loader2, Camera, Search, Edit, ArrowLeftRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PipeSearch from "@/components/ai/PipeSearch";
import PhotoIdentifier from "@/components/ai/PhotoIdentifier";
import ImageCropper from "@/components/pipes/ImageCropper";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import FieldWithInfo from "@/components/forms/FieldWithInfo";
import InterchangeableBowls from "@/components/pipes/InterchangeableBowls";
import PhotoUploader from "@/components/PhotoUploader";
import { useMeasurement, imperialToMetric } from "@/components/utils/measurementConversion";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { canCreatePipe } from "@/components/utils/limitChecks";
import { toast } from "sonner";
import { useRecentValues } from "@/components/hooks/useRecentValues";
import { Combobox } from "@/components/ui/combobox";
import { preparePipeData } from "@/components/utils/schemaCompatibility";
import { useTranslation } from "react-i18next";

const SHAPES = ["Billiard", "Bent Billiard", "Apple", "Bent Apple", "Dublin", "Bent Dublin", "Bulldog", "Rhodesian", "Canadian", "Liverpool", "Lovat", "Lumberman", "Prince", "Author", "Brandy", "Pot", "Tomato", "Egg", "Acorn", "Pear", "Cutty", "Devil Anse", "Hawkbill", "Diplomat", "Poker", "Cherrywood", "Duke", "Don", "Tankard", "Churchwarden", "Nosewarmer", "Vest Pocket", "MacArthur", "Calabash", "Reverse Calabash", "Cavalier", "Freehand", "Blowfish", "Volcano", "Horn", "Nautilus", "Tomahawk", "Bullmoose", "Bullcap", "Oom Paul (Hungarian)", "Tyrolean", "Unknown", "Other"];
const BOWL_STYLES = ["Cylindrical (Straight Wall)", "Conical (Tapered)", "Rounded / Ball", "Oval / Egg", "Squat / Pot", "Chimney (Tall)", "Paneled", "Faceted / Multi-Panel", "Horn-Shaped", "Freeform", "Unknown"];
const SHANK_SHAPES = ["Round", "Diamond", "Square", "Oval", "Paneled / Faceted", "Military / Army Mount", "Freeform", "Unknown"];
const BENDS = ["Straight", "1/4 Bent", "1/2 Bent", "3/4 Bent", "Full Bent", "S-Bend", "Unknown"];
const SIZE_CLASSES = ["Vest Pocket", "Small", "Standard", "Large", "Magnum / XL", "Churchwarden", "MacArthur", "Unknown"];
const BOWL_MATERIALS = ["Briar", "Meerschaum", "Corn Cob", "Clay", "Olive Wood", "Cherry Wood", "Morta", "Other"];
const STEM_MATERIALS = ["Acrylic", "Amber", "Bone", "Cumberland", "Ebonite", "Horn", "Lucite", "Metal", "Other", "Vulcanite"];
const FINISHES = ["Smooth", "Sandblast", "Rusticated", "Partially Rusticated", "Carved", "Natural", "Other"];
const CHAMBER_VOLUMES = ["Small", "Medium", "Large", "Extra Large"];
const CONDITIONS = ["Mint", "Excellent", "Very Good", "Good", "Fair", "Poor", "Estate - Unrestored"];
const FILTER_TYPES = ["None", "6mm", "9mm", "Stinger", "Other"];

export default function PipeForm({ pipe, onSave, onCancel, isLoading }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(pipe || {
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
    interchangeable_bowls: []
  });
  const [hasInterchangeableBowls, setHasInterchangeableBowls] = useState(
    pipe?.interchangeable_bowls?.length > 0 || false
  );
  const [uploading, setUploading] = useState(false);
  const [uploadingStamping, setUploadingStamping] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [cropperType, setCropperType] = useState(null);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState(null);

  const { user } = useCurrentUser();
  const entitlements = useEntitlements();
  const isPaidUser = user?.subscription_level === 'paid';
  
  const { useImperial, setUseImperial, convertLength, convertWeight, getLengthUnit, getWeightUnit } = useMeasurement();

  // Auto-suggest recent values
  const { data: recentMakers = [] } = useRecentValues("Pipe", "maker");
  const { data: recentCountries = [] } = useRecentValues("Pipe", "country_of_origin");
  const { data: recentBowlMaterials = [] } = useRecentValues("Pipe", "bowl_material");
  const { data: recentStemMaterials = [] } = useRecentValues("Pipe", "stem_material");

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
      handleChange('stamping_photos', formData.stamping_photos.filter((_, i) => i !== index));
    } else {
      handleChange('photos', formData.photos.filter((_, i) => i !== index));
    }
  };

  const editPhoto = (index, isStamping = false) => {
    setEditingPhotoIndex(index);
    const photoUrl = isStamping ? formData.stamping_photos[index] : formData.photos[index];
    setCropperImage(photoUrl);
    setCropperType(isStamping ? 'stamping' : 'photo');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check free tier limits for new pipes only
    if (!pipe && entitlements.tier === "free") {
      const canAdd = await canCreatePipe(user?.email, entitlements.limits.pipes);
      if (!canAdd) {
        toast.error(
          entitlements.isFreeGrandfathered
            ? "You've reached the free limit. Upgrade to add more pipes, or delete some existing ones."
            : `Free tier limited to ${entitlements.limits.pipes} pipes. Upgrade to add more.`
        );
        return;
      }
    }

    // Check photo limits
    const totalPhotos = (formData.photos?.length || 0) + (formData.stamping_photos?.length || 0);
    if (totalPhotos > entitlements.limits.photosPerItem) {
      toast.error(`Free tier limited to ${entitlements.limits.photosPerItem} photo per pipe. Upgrade for unlimited.`);
      return;
    }

    const cleanedData = {
      ...formData,
      length_mm: formData.length_mm ? Number(formData.length_mm) : null,
      weight_grams: formData.weight_grams ? Number(formData.weight_grams) : null,
      bowl_height_mm: formData.bowl_height_mm ? Number(formData.bowl_height_mm) : null,
      bowl_width_mm: formData.bowl_width_mm ? Number(formData.bowl_width_mm) : null,
      bowl_diameter_mm: formData.bowl_diameter_mm ? Number(formData.bowl_diameter_mm) : null,
      bowl_depth_mm: formData.bowl_depth_mm ? Number(formData.bowl_depth_mm) : null,
      purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      interchangeable_bowls: hasInterchangeableBowls ? formData.interchangeable_bowls : [],
    };
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
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Search Section */}
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
              <span className="bg-[#243548] px-2 text-[#E0D8C8]/70">{t("formsExtended.orEnterManually")}</span>
            </div>
          </div>
        </>
      )}

      {/* Photos Section */}
      <Card className="border-[#E0D8C8]/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">{t("pipesExtended.pipePhotos")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
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
                  const uploadPromises = Array.from(files).map(async (file) => {
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
                  });
                  Promise.all(uploadPromises);
                }}
                existingPhotos={[]}
                hideExisting
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stamping Photos */}
      <Card className="border-[#E0D8C8]/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">{t("pipesExtended.stampingPhotos")}</CardTitle>
          <p className="text-sm text-[#E0D8C8]/70">{t("pipesExtended.stampingPhotosDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
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
                  const uploadPromises = Array.from(files).map(async (file) => {
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
                  });
                  Promise.all(uploadPromises);
                }}
                existingPhotos={[]}
                hideExisting
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="border-[#E0D8C8]/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">{t("formsExtended.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithInfo 
            label="Name" 
            required 
            helpText="A descriptive name for your pipe. Can be based on shape, maker, or your own nickname."
          >
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., My Favorite Billiard"
              required
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Maker / Brand" 
            helpText="The pipe manufacturer or maker (e.g., Dunhill, Peterson, Savinelli)."
          >
            <Combobox
              value={formData.maker}
              onValueChange={(v) => handleChange('maker', v)}
              options={recentMakers}
              placeholder="e.g., Dunhill, Peterson"
              searchPlaceholder="Search makers..."
              allowCustom={true}
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Country of Origin" 
            helpText="Where the pipe was manufactured (e.g., England, Denmark, Italy)."
          >
            <Combobox
              value={formData.country_of_origin}
              onValueChange={(v) => handleChange('country_of_origin', v)}
              options={recentCountries}
              placeholder="e.g., England, Denmark"
              searchPlaceholder="Search countries..."
              allowCustom={true}
            />
          </FieldWithInfo>
          <FieldWithInfo 
          label="Year Made" 
          helpText="Year or era the pipe was made. Can be approximate (e.g., '1970s', 'c. 2005')."
          >
          <Input
            value={formData.year_made}
            onChange={(e) => handleChange('year_made', e.target.value)}
            placeholder="e.g., 1970s, 2020"
          />
          </FieldWithInfo>
          <FieldWithInfo 
          label="Purchase Date" 
          helpText="Date when you acquired this pipe"
          >
          <Input
            type="date"
            value={formData.purchase_date}
            onChange={(e) => handleChange('purchase_date', e.target.value)}
          />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Stamping / Markings" 
            helpText="Text, logos, or markings stamped on the pipe (usually on the shank or stem)."
          >
            <Input
              value={formData.stamping}
              onChange={(e) => handleChange('stamping', e.target.value)}
              placeholder="Text on the pipe"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Condition" 
            helpText="Overall condition of the pipe from mint (perfect) to poor (heavily damaged)."
          >
            <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
        </CardContent>
      </Card>

      {/* Pipe Geometry */}
      <Card className="border-[#E0D8C8]/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">{t("pipesExtended.pipeGeometry")}</CardTitle>
          <p className="text-sm text-[#E0D8C8]/70">{t("pipesExtended.pipeGeometryDesc")}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithInfo 
            label="Shape" 
            required
            helpText="Primary shape classification of your pipe"
          >
            <Select value={formData.shape || "Unknown"} onValueChange={(v) => handleChange('shape', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select shape" />
              </SelectTrigger>
              <SelectContent>
                {SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Bowl Style" 
            helpText="Internal bowl shape classification"
          >
            <Select value={formData.bowlStyle || "Unknown"} onValueChange={(v) => handleChange('bowlStyle', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select bowl style" />
              </SelectTrigger>
              <SelectContent>
                {BOWL_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Shank Shape" 
            helpText="Cross-sectional shape of the shank"
          >
            <Select value={formData.shankShape || "Unknown"} onValueChange={(v) => handleChange('shankShape', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select shank shape" />
              </SelectTrigger>
              <SelectContent>
                {SHANK_SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Bend" 
            helpText="Degree of bend from stem to bowl"
          >
            <Select value={formData.bend || "Unknown"} onValueChange={(v) => handleChange('bend', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select bend" />
              </SelectTrigger>
              <SelectContent>
                {BENDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Size Class" 
            helpText="Overall size classification"
          >
            <Select value={formData.sizeClass || "Standard"} onValueChange={(v) => handleChange('sizeClass', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select size class" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_CLASSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
        </CardContent>
      </Card>

      {/* Physical Characteristics */}
      <Card className="border-[#E0D8C8]/15">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-[#E0D8C8]">{t("formsExtended.physicalCharacteristics")}</CardTitle>
            {dataSource && (
              <p className="text-xs text-[#E0D8C8]/70 mt-1">{t("formsExtended.dataSource")}: {dataSource}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUseImperial(!useImperial)}
            className="whitespace-nowrap"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            {useImperial ? t("pipesExtended.showMetric") : t("pipesExtended.showImperial")}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldWithInfo 
            label="Bowl Material" 
            helpText="What the tobacco chamber is made from. Briar is most common; Meerschaum is prized for cool sessions."
          >
            <Combobox
              value={formData.bowl_material}
              onValueChange={(v) => handleChange('bowl_material', v)}
              options={[...new Set([...BOWL_MATERIALS, ...recentBowlMaterials])]}
              placeholder="Select material"
              searchPlaceholder="Search materials..."
              allowCustom={false}
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Stem Material" 
            helpText="What the mouthpiece is made from. Vulcanite is traditional but oxidizes; Acrylic is more durable."
          >
            <Combobox
              value={formData.stem_material}
              onValueChange={(v) => handleChange('stem_material', v)}
              options={[...new Set([...STEM_MATERIALS, ...recentStemMaterials])]}
              placeholder="Select material"
              searchPlaceholder="Search materials..."
              allowCustom={false}
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Finish" 
            helpText="Surface treatment of the bowl. Smooth shows the wood grain; Sandblast reveals ring grain texture."
          >
            <Select value={formData.finish} onValueChange={(v) => handleChange('finish', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select finish" />
              </SelectTrigger>
              <SelectContent>
                {FINISHES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Chamber Volume" 
            helpText="Overall size of the tobacco chamber. Small = 15-30 min session, Medium = 30-45 min, Large = 45-60 min, Extra Large = 60+ min."
          >
            <Select value={formData.chamber_volume} onValueChange={(v) => handleChange('chamber_volume', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                {CHAMBER_VOLUMES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Filter Type" 
            helpText="Size of removable filter or 'None' if filterless. 9mm filters absorb moisture and cool the session."
          >
            <Select value={formData.filter_type} onValueChange={(v) => handleChange('filter_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <div className="space-y-2">
            <Label>Length ({getLengthUnit()})</Label>
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
            <Label>Weight ({getWeightUnit()})</Label>
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
            <Label>Bowl Height ({getLengthUnit()})</Label>
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
            <Label>Bowl Width ({getLengthUnit()})</Label>
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
            <Label>Chamber Diameter ({getLengthUnit()})</Label>
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
            <Label>Chamber Depth ({getLengthUnit()})</Label>
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
        </CardContent>
      </Card>

      {/* Value & Notes */}
      <Card className="border-[#E0D8C8]/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">{t("formsExtended.valueNotes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purchase Price ($)</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
                placeholder="What you paid"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Value ($)</Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => handleChange('estimated_value', e.target.value)}
                placeholder="Current market value"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Usage Characteristics</Label>
            <Textarea
              value={formData.usage_characteristics || formData.smoking_characteristics}
              onChange={(e) => {
                handleChange('usage_characteristics', e.target.value);
                handleChange('smoking_characteristics', '');
              }}
              placeholder="How does it perform? Hot/cool, wet/dry, flavor notes..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about this pipe..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_favorite}
              onCheckedChange={(v) => handleChange('is_favorite', v)}
            />
            <Label>{t("formsExtended.markAsFavorite")}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Interchangeable Bowls */}
      <Card className="border-[#E0D8C8]/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8] flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            {t("formsExtended.interchangeableBowls")}
          </CardTitle>
          <p className="text-sm text-[#E0D8C8]/70">{t("formsExtended.interchangeableBowlsDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label>{t("pipesExtended.hasInterchangeableBowls")}</Label>
          </div>
          {hasInterchangeableBowls && (
            <div className="pt-2">
              <InterchangeableBowls
                pipe={formData}
                onUpdate={(updates) => setFormData({ ...formData, ...updates })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[#243548] to-[#243548]/80 backdrop-blur-sm border-t border-[#E0D8C8]/15 p-4 sm:p-6 flex gap-3 justify-end -mx-6 sm:-mx-8 px-6 sm:px-8">
        <Button type="button" variant="outline" onClick={onCancel} className="bg-white/10 border-white/30 text-[#E0D8C8] hover:bg-white/20">
          Cancel
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