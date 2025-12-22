import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, Camera, Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TobaccoSearch from "@/components/ai/TobaccoSearch";
import { fetchTobaccoStockPhoto } from "@/components/ai/StockPhotoFetcher";

const BLEND_TYPES = ["Virginia", "Virginia/Perique", "English", "Balkan", "Aromatic", "Burley", "Virginia/Burley", "Latakia Blend", "Oriental/Turkish", "Navy Flake", "Dark Fired", "Cavendish", "Other"];
const CUTS = ["Ribbon", "Flake", "Broken Flake", "Ready Rubbed", "Plug", "Coin", "Cube Cut", "Crumble Cake", "Shag", "Rope", "Twist", "Other"];
const STRENGTHS = ["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];
const ROOM_NOTES = ["Pleasant", "Neutral", "Strong", "Very Strong"];
const PRODUCTION_STATUS = ["Current Production", "Discontinued", "Limited Edition", "Vintage"];
const AGING_POTENTIAL = ["Poor", "Fair", "Good", "Excellent"];

const COMMON_FLAVOR_NOTES = ["Earthy", "Sweet", "Nutty", "Woody", "Smoky", "Spicy", "Fruity", "Floral", "Tangy", "Creamy", "Peppery", "Chocolate", "Coffee", "Vanilla", "Honey", "Leather", "Grass", "Hay", "Citrus", "Plum", "Fig", "Raisin"];

export default function TobaccoForm({ blend, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState(blend || {
    name: '',
    manufacturer: '',
    blend_type: '',
    tobacco_components: [],
    cut: '',
    strength: '',
    room_note: '',
    flavor_notes: [],
    tin_size_oz: '',
    quantity_owned: '',
    production_status: '',
    aging_potential: '',
    rating: null,
    notes: '',
    photo: '',
    is_favorite: false
  });
  const [uploading, setUploading] = useState(false);
  const [fetchingPhoto, setFetchingPhoto] = useState(false);
  const [newComponent, setNewComponent] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchSelect = (searchData) => {
    setFormData(prev => ({
      ...prev,
      ...searchData
    }));
  };

  const handleFetchStockPhoto = async () => {
    if (!formData.manufacturer && !formData.name) {
      return;
    }

    setFetchingPhoto(true);
    try {
      const stockPhoto = await fetchTobaccoStockPhoto(formData);
      if (stockPhoto) {
        handleChange('photo', stockPhoto);
      }
    } catch (err) {
      console.error('Error fetching stock photo:', err);
    } finally {
      setFetchingPhoto(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      handleChange('photo', result.file_url);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const addComponent = () => {
    if (newComponent.trim()) {
      handleChange('tobacco_components', [...(formData.tobacco_components || []), newComponent.trim()]);
      setNewComponent('');
    }
  };

  const removeComponent = (index) => {
    handleChange('tobacco_components', formData.tobacco_components.filter((_, i) => i !== index));
  };

  const toggleFlavorNote = (note) => {
    const current = formData.flavor_notes || [];
    if (current.includes(note)) {
      handleChange('flavor_notes', current.filter(n => n !== note));
    } else {
      handleChange('flavor_notes', [...current, note]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      tin_size_oz: formData.tin_size_oz ? Number(formData.tin_size_oz) : null,
      quantity_owned: formData.quantity_owned ? Number(formData.quantity_owned) : null,
      rating: formData.rating ? Number(formData.rating) : null,
    };
    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Search Section */}
      {!blend && (
        <>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search for Tobacco Blend
              </CardTitle>
              <p className="text-sm text-stone-600">
                Search by name or manufacturer to auto-fill details
              </p>
            </CardHeader>
            <CardContent>
              <TobaccoSearch onSelect={handleSearchSelect} />
            </CardContent>
          </Card>

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

      {/* Photo */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-stone-800">Blend Photo</CardTitle>
            {(formData.manufacturer || formData.name) && !formData.photo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchStockPhoto}
                disabled={fetchingPhoto}
                className="text-xs"
              >
                {fetchingPhoto ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Finding...
                  </>
                ) : (
                  'Find Stock Photo'
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {formData.photo ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-stone-200">
                <img src={formData.photo} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleChange('photo', '')}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-1 hover:bg-black/70"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <label className="w-32 h-32 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-amber-600">
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
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            )}
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
            <Label>Blend Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Orlik Golden Sliced"
              required
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Manufacturer</Label>
            <Input
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="e.g., Orlik, Peterson"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Blend Type</Label>
            <Select value={formData.blend_type} onValueChange={(v) => handleChange('blend_type', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {BLEND_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cut</Label>
            <Select value={formData.cut} onValueChange={(v) => handleChange('cut', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select cut" />
              </SelectTrigger>
              <SelectContent>
                {CUTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Strength</Label>
            <Select value={formData.strength} onValueChange={(v) => handleChange('strength', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select strength" />
              </SelectTrigger>
              <SelectContent>
                {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Room Note</Label>
            <Select value={formData.room_note} onValueChange={(v) => handleChange('room_note', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select room note" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_NOTES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tobacco Components */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Tobacco Components</CardTitle>
          <p className="text-sm text-stone-500">List the types of tobacco in this blend</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newComponent}
              onChange={(e) => setNewComponent(e.target.value)}
              placeholder="e.g., Virginia, Latakia, Perique..."
              className="border-stone-200"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addComponent())}
            />
            <Button type="button" onClick={addComponent} variant="outline" className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tobacco_components?.map((comp, idx) => (
              <Badge key={idx} variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                {comp}
                <button type="button" onClick={() => removeComponent(idx)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flavor Notes */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Flavor Notes</CardTitle>
          <p className="text-sm text-stone-500">Select all that apply</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {COMMON_FLAVOR_NOTES.map(note => (
              <Badge
                key={note}
                variant="secondary"
                className={`cursor-pointer transition-colors ${
                  formData.flavor_notes?.includes(note)
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                }`}
                onClick={() => toggleFlavorNote(note)}
              >
                {note}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inventory & Status */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Inventory & Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tin Size (oz)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.tin_size_oz}
              onChange={(e) => handleChange('tin_size_oz', e.target.value)}
              placeholder="e.g., 1.75"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Quantity Owned</Label>
            <Input
              type="number"
              value={formData.quantity_owned}
              onChange={(e) => handleChange('quantity_owned', e.target.value)}
              placeholder="Number of tins"
              className="border-stone-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Production Status</Label>
            <Select value={formData.production_status} onValueChange={(v) => handleChange('production_status', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Aging Potential</Label>
            <Select value={formData.aging_potential} onValueChange={(v) => handleChange('aging_potential', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select potential" />
              </SelectTrigger>
              <SelectContent>
                {AGING_POTENTIAL.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Your Rating (1-5)</Label>
            <Input
              type="number"
              min="1"
              max="5"
              value={formData.rating || ''}
              onChange={(e) => handleChange('rating', e.target.value)}
              placeholder="Optional"
              className="border-stone-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Your tasting notes, storage info, etc..."
              className="border-stone-200"
              rows={4}
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
          {blend ? 'Update Blend' : 'Add Blend'}
        </Button>
      </div>
    </form>
  );
}