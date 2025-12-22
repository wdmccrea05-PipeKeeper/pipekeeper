import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Loader2, Camera, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PipeSearch from "@/components/ai/PipeSearch";
import PhotoIdentifier from "@/components/ai/PhotoIdentifier";

const SHAPES = ["Billiard", "Bulldog", "Dublin", "Apple", "Author", "Bent", "Canadian", "Churchwarden", "Freehand", "Lovat", "Poker", "Prince", "Rhodesian", "Zulu", "Calabash", "Cavalier", "Chimney", "Devil Anse", "Egg", "Hawkbill", "Horn", "Hungarian", "Nautilus", "Oom Paul", "Panel", "Pot", "Sitter", "Tomato", "Volcano", "Woodstock", "Other"];
const BOWL_MATERIALS = ["Briar", "Meerschaum", "Corn Cob", "Clay", "Olive Wood", "Cherry Wood", "Morta", "Other"];
const STEM_MATERIALS = ["Vulcanite", "Acrylic", "Lucite", "Cumberland", "Amber", "Horn", "Bone", "Other"];
const FINISHES = ["Smooth", "Sandblast", "Rusticated", "Carved", "Natural", "Other"];
const CHAMBER_VOLUMES = ["Small", "Medium", "Large", "Extra Large"];
const CONDITIONS = ["Mint", "Excellent", "Very Good", "Good", "Fair", "Poor", "Estate - Unrestored"];
const FILTER_TYPES = ["None", "6mm", "9mm", "Stinger", "Other"];

export default function PipeForm({ pipe, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState(pipe || {
    name: '',
    maker: '',
    country_of_origin: '',
    shape: '',
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
  const [uploading, setUploading] = useState(false);
  const [uploadingStamping, setUploadingStamping] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchSelect = (searchData) => {
    setFormData(prev => ({
      ...prev,
      ...searchData
    }));
  };

  const handlePhotoIdentify = (identifiedData) => {
    setFormData(prev => ({
      ...prev,
      ...identifiedData
    }));
  };

  const handlePhotoUpload = async (e, isStamping = false) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

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

  const removePhoto = (index, isStamping = false) => {
    if (isStamping) {
      handleChange('stamping_photos', formData.stamping_photos.filter((_, i) => i !== index));
    } else {
      handleChange('photos', formData.photos.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      bowl_diameter_mm: formData.bowl_diameter_mm ? Number(formData.bowl_diameter_mm) : null,
      bowl_depth_mm: formData.bowl_depth_mm ? Number(formData.bowl_depth_mm) : null,
      purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
    };
    onSave(cleanedData);
  };

  return (
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

          <PhotoIdentifier onIdentify={handlePhotoIdentify} />

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
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-1 hover:bg-black/70"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
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
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx, true)}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-1 hover:bg-black/70"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
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
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., My Favorite Billiard"
              required
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Maker / Brand</Label>
            <Input
              value={formData.maker}
              onChange={(e) => handleChange('maker', e.target.value)}
              placeholder="e.g., Dunhill, Peterson"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Country of Origin</Label>
            <Input
              value={formData.country_of_origin}
              onChange={(e) => handleChange('country_of_origin', e.target.value)}
              placeholder="e.g., England, Denmark"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Year Made</Label>
            <Input
              value={formData.year_made}
              onChange={(e) => handleChange('year_made', e.target.value)}
              placeholder="e.g., 1970s, 2020"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Stamping / Markings</Label>
            <Input
              value={formData.stamping}
              onChange={(e) => handleChange('stamping', e.target.value)}
              placeholder="Text on the pipe"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Physical Characteristics */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Physical Characteristics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Shape</Label>
            <Select value={formData.shape} onValueChange={(v) => handleChange('shape', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select shape" />
              </SelectTrigger>
              <SelectContent>
                {SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bowl Material</Label>
            <Select value={formData.bowl_material} onValueChange={(v) => handleChange('bowl_material', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {BOWL_MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stem Material</Label>
            <Select value={formData.stem_material} onValueChange={(v) => handleChange('stem_material', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {STEM_MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Finish</Label>
            <Select value={formData.finish} onValueChange={(v) => handleChange('finish', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select finish" />
              </SelectTrigger>
              <SelectContent>
                {FINISHES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chamber Volume</Label>
            <Select value={formData.chamber_volume} onValueChange={(v) => handleChange('chamber_volume', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                {CHAMBER_VOLUMES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Filter Type</Label>
            <Select value={formData.filter_type} onValueChange={(v) => handleChange('filter_type', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bowl Diameter (mm)</Label>
            <Input
              type="number"
              value={formData.bowl_diameter_mm}
              onChange={(e) => handleChange('bowl_diameter_mm', e.target.value)}
              placeholder="e.g., 20"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Bowl Depth (mm)</Label>
            <Input
              type="number"
              value={formData.bowl_depth_mm}
              onChange={(e) => handleChange('bowl_depth_mm', e.target.value)}
              placeholder="e.g., 35"
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
  );
}