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

const SHAPES = ["Billiard", "Bulldog", "Dublin", "Apple", "Author", "Bent", "Canadian", "Churchwarden", "Freehand", "Lovat", "Poker", "Prince", "Rhodesian", "Zulu", "Calabash", "Cavalier", "Chimney", "Devil Anse", "Egg", "Hawkbill", "Horn", "Hungarian", "Nautilus", "Oom Paul", "Panel", "Pot", "Sitter", "Tomato", "Volcano", "Woodstock", "Other"];
const BOWL_MATERIALS = ["Briar", "Meerschaum", "Corn Cob", "Clay", "Olive Wood", "Cherry Wood", "Morta", "Other"];
const STEM_MATERIALS = ["Vulcanite", "Acrylic", "Lucite", "Cumberland", "Amber", "Horn", "Bone", "Other"];
const FINISHES = ["Smooth", "Sandblast", "Rusticated", "Partially Rusticated", "Carved", "Natural", "Other"];
const CHAMBER_VOLUMES = ["Small", "Medium", "Large", "Extra Large"];
const CONDITIONS = ["Mint", "Excellent", "Very Good", "Good", "Fair", "Poor", "Estate - Unrestored"];
const FILTER_TYPES = ["None", "6mm", "9mm", "Stinger", "Other"];

export default function PipeForm({ pipe, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState(pipe || {
    name: '',
    maker: '',
    country_of_origin: '',
    shape: '',
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
    stamping: '',
    condition: '',
    purchase_price: '',
    estimated_value: '',
    notes: '',
    smoking_characteristics: '',
    photos: [],
    stamping_photos: [],
    is_favorite: false
  });
  const [useImperial, setUseImperial] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingStamping, setUploadingStamping] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [cropperType, setCropperType] = useState(null);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const isPaidUser = user?.subscription_level === 'paid';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchSelect = (searchData) => {
    setFormData(prev => {
      // Merge search data, but preserve any existing photos
      const { photos: _photos, stamping_photos: _stampingPhotos, ...rest } = searchData;
      return {
        ...prev,
        ...rest
      };
    });
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

  const handleSubmit = (e) => {
    e.preventDefault();
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
    };
    onSave(cleanedData);
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
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search for Pipe
              </CardTitle>
              <p className="text-sm text-stone-600">
                Search by maker or model to auto-fill details
              </p>
            </CardHeader>
            <CardContent>
              <PipeSearch onSelect={handleSearchSelect} />
            </CardContent>
          </Card>

          {isPaidUser ? (
            <PhotoIdentifier onIdentify={handlePhotoIdentify} />
          ) : (
            <UpgradePrompt 
              featureName="AI Photo Identification"
              description="Upload photos of your pipe's stampings to instantly identify the maker, model, and approximate value using advanced AI."
            />
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-500">Or enter manually</span>
            </div>
          </div>
        </>
      )}

      {/* Photos Section */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Pipe Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {formData.photos?.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 group">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => editPhoto(idx, false)}
                    className="bg-white/90 rounded-full p-1.5 hover:bg-white"
                  >
                    <Edit className="w-3.5 h-3.5 text-stone-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="bg-rose-500/90 rounded-full p-1.5 hover:bg-rose-600"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-amber-600">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Add Photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, false)}
                disabled={uploading}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Stamping Photos */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Stamping Photos</CardTitle>
          <p className="text-sm text-stone-500">Photos of maker stamps, logos, or markings for identification</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {formData.stamping_photos?.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 group">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => editPhoto(idx, true)}
                    className="bg-white/90 rounded-full p-1.5 hover:bg-white"
                  >
                    <Edit className="w-3.5 h-3.5 text-stone-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(idx, true)}
                    className="bg-rose-500/90 rounded-full p-1.5 hover:bg-rose-600"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-amber-600">
              {uploadingStamping ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Add Stamp</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, true)}
                disabled={uploadingStamping}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Basic Information</CardTitle>
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
              className="border-stone-200"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Maker / Brand" 
            helpText="The pipe manufacturer or maker (e.g., Dunhill, Peterson, Savinelli)."
          >
            <Input
              value={formData.maker}
              onChange={(e) => handleChange('maker', e.target.value)}
              placeholder="e.g., Dunhill, Peterson"
              className="border-stone-200"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Country of Origin" 
            helpText="Where the pipe was manufactured (e.g., England, Denmark, Italy)."
          >
            <Input
              value={formData.country_of_origin}
              onChange={(e) => handleChange('country_of_origin', e.target.value)}
              placeholder="e.g., England, Denmark"
              className="border-stone-200"
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
              className="border-stone-200"
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
              className="border-stone-200"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Condition" 
            helpText="Overall condition of the pipe from mint (perfect) to poor (heavily damaged)."
          >
            <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
        </CardContent>
      </Card>

      {/* Physical Characteristics */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-stone-800">Physical Characteristics</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUseImperial(!useImperial)}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            {useImperial ? 'Metric' : 'Imperial'}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldWithInfo 
            label="Shape" 
            helpText="The classic shape category of your pipe (e.g., Billiard, Dublin, Bent)."
          >
            <Select value={formData.shape} onValueChange={(v) => handleChange('shape', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select shape" />
              </SelectTrigger>
              <SelectContent>
                {SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Bowl Material" 
            helpText="What the tobacco chamber is made from. Briar is most common; Meerschaum is prized for cool smoking."
          >
            <Select value={formData.bowl_material} onValueChange={(v) => handleChange('bowl_material', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {BOWL_MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Stem Material" 
            helpText="What the mouthpiece is made from. Vulcanite is traditional but oxidizes; Acrylic is more durable."
          >
            <Select value={formData.stem_material} onValueChange={(v) => handleChange('stem_material', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {STEM_MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Finish" 
            helpText="Surface treatment of the bowl. Smooth shows the wood grain; Sandblast reveals ring grain texture."
          >
            <Select value={formData.finish} onValueChange={(v) => handleChange('finish', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select finish" />
              </SelectTrigger>
              <SelectContent>
                {FINISHES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Chamber Volume" 
            helpText="Overall size of the tobacco chamber. Small = 15-30 min smoke, Medium = 30-45 min, Large = 45-60 min, Extra Large = 60+ min."
          >
            <Select value={formData.chamber_volume} onValueChange={(v) => handleChange('chamber_volume', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                {CHAMBER_VOLUMES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Filter Type" 
            helpText="Size of removable filter or 'None' if filterless. 9mm filters absorb moisture and cool smoke."
          >
            <Select value={formData.filter_type} onValueChange={(v) => handleChange('filter_type', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <div className="space-y-2">
            <Label>Length {useImperial ? '(in)' : '(mm)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={useImperial && formData.length_mm ? formData.length_mm / 25.4 : (formData.length_mm || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('length_mm', '');
                } else {
                  handleChange('length_mm', useImperial ? String(parseFloat(val) * 25.4) : val);
                }
              }}
              placeholder={useImperial ? "e.g., 5.5" : "e.g., 140"}
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Weight {useImperial ? '(oz)' : '(g)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={useImperial && formData.weight_grams ? formData.weight_grams / 28.35 : (formData.weight_grams || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('weight_grams', '');
                } else {
                  handleChange('weight_grams', useImperial ? String(parseFloat(val) * 28.35) : val);
                }
              }}
              placeholder={useImperial ? "e.g., 1.5" : "e.g., 42"}
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Bowl Height {useImperial ? '(in)' : '(mm)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={useImperial && formData.bowl_height_mm ? formData.bowl_height_mm / 25.4 : (formData.bowl_height_mm || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_height_mm', '');
                } else {
                  handleChange('bowl_height_mm', useImperial ? String(parseFloat(val) * 25.4) : val);
                }
              }}
              placeholder={useImperial ? "e.g., 2.0" : "e.g., 50"}
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Bowl Width {useImperial ? '(in)' : '(mm)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={useImperial && formData.bowl_width_mm ? formData.bowl_width_mm / 25.4 : (formData.bowl_width_mm || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_width_mm', '');
                } else {
                  handleChange('bowl_width_mm', useImperial ? String(parseFloat(val) * 25.4) : val);
                }
              }}
              placeholder={useImperial ? "e.g., 1.5" : "e.g., 38"}
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Chamber Diameter {useImperial ? '(in)' : '(mm)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={useImperial && formData.bowl_diameter_mm ? formData.bowl_diameter_mm / 25.4 : (formData.bowl_diameter_mm || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_diameter_mm', '');
                } else {
                  handleChange('bowl_diameter_mm', useImperial ? String(parseFloat(val) * 25.4) : val);
                }
              }}
              placeholder={useImperial ? "e.g., 0.8" : "e.g., 20"}
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Chamber Depth {useImperial ? '(in)' : '(mm)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={useImperial && formData.bowl_depth_mm ? formData.bowl_depth_mm / 25.4 : (formData.bowl_depth_mm || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleChange('bowl_depth_mm', '');
                } else {
                  handleChange('bowl_depth_mm', useImperial ? String(parseFloat(val) * 25.4) : val);
                }
              }}
              placeholder={useImperial ? "e.g., 1.6" : "e.g., 40"}
              className="border-stone-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Value & Notes */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Value & Notes</CardTitle>
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
                className="border-stone-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Value ($)</Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => handleChange('estimated_value', e.target.value)}
                placeholder="Current market value"
                className="border-stone-200"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Smoking Characteristics</Label>
            <Textarea
              value={formData.smoking_characteristics}
              onChange={(e) => handleChange('smoking_characteristics', e.target.value)}
              placeholder="How does it smoke? Hot/cool, wet/dry, flavor notes..."
              className="border-stone-200"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about this pipe..."
              className="border-stone-200"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_favorite}
              onCheckedChange={(v) => handleChange('is_favorite', v)}
            />
            <Label>Mark as Favorite</Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-amber-700 hover:bg-amber-800"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {pipe ? 'Update Pipe' : 'Add Pipe'}
        </Button>
      </div>
    </form>
    </>
  );
}