import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, Camera, Plus, Search, Check, Edit, Library } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTobaccoLogo, getMatchingLogos } from "@/components/tobacco/TobaccoLogoLibrary";
import ImageCropper from "@/components/pipes/ImageCropper";
import FieldWithInfo from "@/components/forms/FieldWithInfo";
import PhotoUploader from "@/components/PhotoUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { canCreateTobacco } from "@/components/utils/limitChecks";
import { toast } from "sonner";
import { useRecentValues } from "@/components/hooks/useRecentValues";
import { Combobox } from "@/components/ui/combobox";

const BLEND_TYPES = ["Virginia", "Virginia/Perique", "English", "English Aromatic", "Balkan", "Aromatic", "Burley", "Virginia/Burley", "Latakia Blend", "Oriental/Turkish", "Navy Flake", "Dark Fired", "Cavendish", "Other"];
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
    tin_total_tins: '',
    tin_total_quantity_oz: '',
    tin_tins_open: '',
    tin_tins_cellared: '',
    tin_cellared_date: '',
    bulk_total_quantity_oz: '',
    bulk_open: '',
    bulk_cellared: '',
    bulk_cellared_date: '',
    pouch_size_oz: '',
    pouch_total_pouches: '',
    pouch_total_quantity_oz: '',
    pouch_pouches_open: '',
    pouch_pouches_cellared: '',
    pouch_cellared_date: '',
    production_status: '',
    aging_potential: '',
    rating: null,
    notes: '',
    photo: '',
    logo: '',
    is_favorite: false
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [newComponent, setNewComponent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [logoMatches, setLogoMatches] = useState([]);
  const [cropperImage, setCropperImage] = useState(null);
  const [cropperType, setCropperType] = useState(null);
  const [showLogoBrowser, setShowLogoBrowser] = useState(false);
  const [logoBrowserSearch, setLogoBrowserSearch] = useState('');
  
  const queryClient = useQueryClient();
  const entitlements = useEntitlements();
  const { user } = useCurrentUser();

  // Auto-suggest recent values
  const { data: recentManufacturers = [] } = useRecentValues("TobaccoBlend", "manufacturer");

  const { data: customLogos = [] } = useQuery({
    queryKey: ['custom-tobacco-logos'],
    queryFn: () => base44.entities.TobaccoLogoLibrary.list(),
  });

  const createLogoMutation = useMutation({
    mutationFn: (data) => base44.entities.TobaccoLogoLibrary.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-tobacco-logos'] });
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Check for logo matches when manufacturer changes
      if (field === 'manufacturer' && value) {
        const matches = getMatchingLogos(value, customLogos);
        setLogoMatches(matches);

        // Auto-set logo if exactly one match and no logo currently set
        if (matches.length === 1 && !prev.logo) {
          updated.logo = matches[0].logo;
        } else if (matches.length === 0 && !prev.logo) {
          // Use generic icon if no matches
          updated.logo = getTobaccoLogo(value, customLogos);
        }
        // If multiple matches, show selection UI (don't auto-set)
      }

      return updated;
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;

    setSearching(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find detailed information about this pipe tobacco blend: "${searchQuery}"
        
Include all available details such as:
- Official blend name
- Manufacturer/Brand
- Blend type (Virginia, English, Aromatic, etc.)
- Tobacco components (types of tobacco used)
- Cut type (Flake, Ribbon, etc.)
- Strength level
- Room note
- Flavor notes/profile
- Tin sizes commonly available
- Production status (current, discontinued, etc.)
- Aging potential

Return complete and accurate information based on the blend name or description provided.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            manufacturer: { type: "string" },
            blend_type: { type: "string" },
            tobacco_components: { type: "array", items: { type: "string" } },
            cut: { type: "string" },
            strength: { type: "string" },
            room_note: { type: "string" },
            flavor_notes: { type: "array", items: { type: "string" } },
            tin_size_oz: { type: "number" },
            production_status: { type: "string" },
            aging_potential: { type: "string" }
          }
        }
      });

      if (result) {
        setFormData(prev => ({
          ...prev,
          ...result
        }));
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImage(event.target.result);
      setCropperType('photo');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImage(event.target.result);
      setCropperType('logo');
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedDataUrl) => {
    const isLogo = cropperType === 'logo';
    
    if (isLogo) {
      setUploadingLogo(true);
    } else {
      setUploading(true);
    }

    try {
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      
      const result = await base44.integrations.Core.UploadFile({ file });
      
      if (isLogo) {
        handleChange('logo', result.file_url);
        
        if (formData.manufacturer) {
          await createLogoMutation.mutateAsync({
            brand_name: formData.manufacturer,
            logo_url: result.file_url,
            is_custom: true
          });
        }
      } else {
        handleChange('photo', result.file_url);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setCropperImage(null);
      setCropperType(null);
      if (isLogo) {
        setUploadingLogo(false);
      } else {
        setUploading(false);
      }
    }
  };

  const editPhoto = (type) => {
    const photoUrl = type === 'logo' ? formData.logo : formData.photo;
    setCropperImage(photoUrl);
    setCropperType(type);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check free tier limits for new blends only
    if (!blend && entitlements.tier === "free") {
      const canAdd = await canCreateTobacco(user?.email, entitlements.limits.tobaccos);
      if (!canAdd) {
        toast.error(
          entitlements.isFreeGrandfathered
            ? "You've reached the free limit. Upgrade to add more tobacco, or delete some existing ones."
            : `Free tier limited to ${entitlements.limits.tobaccos} tobacco blends. Upgrade to add more.`
        );
        return;
      }
    }

    const cleanedData = {
      ...formData,
      tin_size_oz: formData.tin_size_oz ? Number(formData.tin_size_oz) : null,
      tin_total_tins: formData.tin_total_tins ? Number(formData.tin_total_tins) : null,
      tin_total_quantity_oz: formData.tin_total_quantity_oz ? Number(formData.tin_total_quantity_oz) : null,
      tin_tins_open: formData.tin_tins_open ? Number(formData.tin_tins_open) : null,
      tin_tins_cellared: formData.tin_tins_cellared ? Number(formData.tin_tins_cellared) : null,
      bulk_total_quantity_oz: formData.bulk_total_quantity_oz ? Number(formData.bulk_total_quantity_oz) : null,
      bulk_open: formData.bulk_open ? Number(formData.bulk_open) : null,
      bulk_cellared: formData.bulk_cellared ? Number(formData.bulk_cellared) : null,
      pouch_size_oz: formData.pouch_size_oz ? Number(formData.pouch_size_oz) : null,
      pouch_total_pouches: formData.pouch_total_pouches ? Number(formData.pouch_total_pouches) : null,
      pouch_total_quantity_oz: formData.pouch_total_quantity_oz ? Number(formData.pouch_total_quantity_oz) : null,
      pouch_pouches_open: formData.pouch_pouches_open ? Number(formData.pouch_pouches_open) : null,
      pouch_pouches_cellared: formData.pouch_pouches_cellared ? Number(formData.pouch_pouches_cellared) : null,
      rating: formData.rating ? Math.round(Number(formData.rating)) : null,
    };
    onSave(cleanedData);
  };

  const filteredLogos = React.useMemo(() => {
    if (!logoBrowserSearch.trim()) return customLogos;
    return customLogos.filter(logo => 
      logo.brand_name?.toLowerCase().includes(logoBrowserSearch.toLowerCase())
    );
  }, [customLogos, logoBrowserSearch]);

  return (
    <>
      {cropperImage && (
        <ImageCropper
          imageUrl={cropperImage}
          onSave={handleCroppedImage}
          onCancel={() => {
            setCropperImage(null);
            setCropperType(null);
          }}
        />
      )}

      {/* Logo Browser Dialog */}
      <Dialog open={showLogoBrowser} onOpenChange={setShowLogoBrowser}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Browse Logo Library</DialogTitle>
            <DialogDescription>
              Select a logo from the library or upload a custom one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
              <Input
                value={logoBrowserSearch}
                onChange={(e) => setLogoBrowserSearch(e.target.value)}
                placeholder="Search brands..."
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
              {filteredLogos.map((logo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleChange('logo', logo.logo_url);
                    setShowLogoBrowser(false);
                    setLogoBrowserSearch('');
                  }}
                  className={`relative aspect-square rounded-lg border-2 transition-all hover:border-amber-500 ${
                    formData.logo === logo.logo_url 
                      ? 'border-amber-600 bg-amber-100' 
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <img 
                    src={logo.logo_url} 
                    alt={logo.brand_name}
                    className="w-full h-full object-contain p-2"
                  />
                  {formData.logo === logo.logo_url && (
                    <div className="absolute top-1 right-1 bg-amber-600 rounded-full p-1">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <p className="text-xs text-stone-600 mt-1 truncate px-1">{logo.brand_name}</p>
                </button>
              ))}
            </div>
            {filteredLogos.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                <Library className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No logos found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Search Section */}
      {!blend && (
        <>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#E0D8C8] flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search for Tobacco Blend
              </CardTitle>
              <p className="text-sm text-stone-600">
                Search by name or manufacturer to auto-fill details
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Peterson Irish Flake, Dunhill Nightcap..."
                  className="border-stone-200"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                />
                <Button 
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-amber-700 hover:bg-amber-800 shrink-0"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
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

      {/* Logo Selection from Library */}
      {logoMatches.length > 1 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#E0D8C8]">Select Logo</CardTitle>
            <p className="text-sm text-stone-600">
              Multiple logos found for "{formData.manufacturer}". Choose one:
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {logoMatches.map((match, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleChange('logo', match.logo);
                    setLogoMatches([]);
                  }}
                  className={`relative aspect-square rounded-lg border-2 transition-all hover:border-amber-500 ${
                    formData.logo === match.logo 
                      ? 'border-amber-600 bg-amber-100' 
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <img 
                    src={match.logo} 
                    alt={match.brand}
                    className="w-full h-full object-contain p-2"
                  />
                  {formData.logo === match.logo && (
                    <div className="absolute top-1 right-1 bg-amber-600 rounded-full p-1">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <p className="text-xs text-stone-600 mt-1">{match.brand}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo & Logo */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">Images</CardTitle>
          {formData.logo && !uploading && !uploadingLogo && (
            <p className="text-xs text-stone-500">
              Logo auto-populated from library. You can upload a custom one to replace it.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tin Photo */}
             <div className="space-y-2">
               <Label className="text-sm font-medium">Tin Photo</Label>
               <div className="flex items-center gap-4">
                 {formData.photo ? (
                   <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-stone-200 group">
                     <img src={formData.photo} alt="" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                       <button
                         type="button"
                         onClick={() => editPhoto('photo')}
                         className="bg-white/90 rounded-full p-1.5 hover:bg-white"
                       >
                         <Edit className="w-3.5 h-3.5 text-stone-700" />
                       </button>
                       <button
                         type="button"
                         onClick={() => handleChange('photo', '')}
                         className="bg-rose-500/90 rounded-full p-1.5 hover:bg-rose-600"
                       >
                         <X className="w-3.5 h-3.5 text-white" />
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="w-32 h-32 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-amber-600">
                     <PhotoUploader 
                       onPhotosSelected={(files) => {
                         const file = Array.from(files)[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onload = (event) => {
                             setCropperImage(event.target.result);
                             setCropperType('photo');
                           };
                           reader.readAsDataURL(file);
                         }
                       }}
                       existingPhotos={[]}
                       hideExisting
                     />
                   </div>
                 )}
               </div>
             </div>

            {/* Label/Logo */}
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <Label className="text-sm font-medium">Label/Logo</Label>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => setShowLogoBrowser(true)}
                   className="text-xs"
                 >
                   <Library className="w-3 h-3 mr-1" />
                   Browse Library
                 </Button>
               </div>
               <div className="flex items-center gap-4">
                 {formData.logo ? (
                   <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-stone-200 bg-white group">
                     <img src={formData.logo} alt="" className="w-full h-full object-contain p-2" />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                       <button
                         type="button"
                         onClick={() => editPhoto('logo')}
                         className="bg-white/90 rounded-full p-1.5 hover:bg-white"
                       >
                         <Edit className="w-3.5 h-3.5 text-stone-700" />
                       </button>
                       <button
                         type="button"
                         onClick={() => handleChange('logo', '')}
                         className="bg-rose-500/90 rounded-full p-1.5 hover:bg-rose-600"
                       >
                         <X className="w-3.5 h-3.5 text-white" />
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="w-32 h-32 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-400 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-amber-600">
                     <PhotoUploader 
                       onPhotosSelected={(files) => {
                         const file = Array.from(files)[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onload = (event) => {
                             setCropperImage(event.target.result);
                             setCropperType('logo');
                           };
                           reader.readAsDataURL(file);
                         }
                       }}
                       existingPhotos={[]}
                       hideExisting
                     />
                   </div>
                 )}
               </div>
               </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithInfo 
            label="Blend Name" 
            required 
            helpText="The official or common name of the tobacco blend."
          >
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Orlik Golden Sliced"
              required
              className="border-stone-200"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Manufacturer" 
            helpText="The company or brand that makes this blend (e.g., Peterson, Dunhill, Sutliff)."
          >
            <Combobox
              value={formData.manufacturer}
              onValueChange={(v) => handleChange('manufacturer', v)}
              options={recentManufacturers}
              placeholder="e.g., Orlik, Peterson"
              searchPlaceholder="Search manufacturers..."
              allowCustom={true}
              className="border-stone-200"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label="Blend Type" 
            helpText="The primary tobacco category. Virginia is sweet, English has Latakia (smoky), Aromatic has toppings."
          >
            <Select value={formData.blend_type} onValueChange={(v) => handleChange('blend_type', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {BLEND_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Cut" 
            helpText="How the tobacco is processed. Flake requires rubbing out, Ribbon is ready to smoke, Plug needs slicing."
          >
            <Select value={formData.cut} onValueChange={(v) => handleChange('cut', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select cut" />
              </SelectTrigger>
              <SelectContent>
                {CUTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Strength" 
            helpText="Nicotine content and body. Mild is gentle, Full is strong. Affects your smoking experience significantly."
          >
            <Select value={formData.strength} onValueChange={(v) => handleChange('strength', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select strength" />
              </SelectTrigger>
              <SelectContent>
                {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label="Room Note" 
            helpText="How the smoke smells to people around you. Pleasant aromatics vs stronger, more pronounced scents."
          >
            <Select value={formData.room_note} onValueChange={(v) => handleChange('room_note', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Select room note" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_NOTES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
        </CardContent>
      </Card>

      {/* Tobacco Components */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">Tobacco Components</CardTitle>
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
          <CardTitle className="text-lg text-[#E0D8C8]">Flavor Notes</CardTitle>
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
          <CardTitle className="text-lg text-[#E0D8C8]">Inventory & Status</CardTitle>
          <p className="text-sm text-stone-500">Track your tobacco across tins, bulk, and pouches</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="tins" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tins">Tins</TabsTrigger>
              <TabsTrigger value="bulk">Bulk</TabsTrigger>
              <TabsTrigger value="pouches">Pouches</TabsTrigger>
            </TabsList>

            {/* Tins Tab */}
            <TabsContent value="tins" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tin Size (oz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tin_size_oz || ''}
                    onChange={(e) => {
                      handleChange('tin_size_oz', e.target.value);
                      if (e.target.value && formData.tin_total_tins) {
                        handleChange('tin_total_quantity_oz', Number(e.target.value) * Number(formData.tin_total_tins));
                      }
                    }}
                    placeholder="e.g., 1.75"
                    className="border-stone-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Tins</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.tin_total_tins || ''}
                    onChange={(e) => {
                      handleChange('tin_total_tins', e.target.value);
                      if (e.target.value && formData.tin_size_oz) {
                        handleChange('tin_total_quantity_oz', Number(formData.tin_size_oz) * Number(e.target.value));
                      }
                    }}
                    placeholder="e.g., 5"
                    className="border-stone-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Quantity (oz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tin_total_quantity_oz || ''}
                    onChange={(e) => handleChange('tin_total_quantity_oz', e.target.value)}
                    placeholder="Auto-calculated"
                    className="border-stone-200 bg-stone-50"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                   <Label>Tins Open</Label>
                   <Input
                     type="number"
                     min="0"
                     value={formData.tin_tins_open || ''}
                     onChange={(e) => {
                       handleChange('tin_tins_open', e.target.value);
                       if (e.target.value && formData.tin_size_oz && formData.tin_tins_cellared) {
                         handleChange('tin_total_quantity_oz', Number(e.target.value) * Number(formData.tin_size_oz) + Number(formData.tin_tins_cellared) * Number(formData.tin_size_oz));
                       }
                     }}
                     placeholder="e.g., 1"
                     className="border-stone-200"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Tins Cellared</Label>
                   <Input
                     type="number"
                     min="0"
                     value={formData.tin_tins_cellared || ''}
                     onChange={(e) => {
                       handleChange('tin_tins_cellared', e.target.value);
                       if (e.target.value && formData.tin_size_oz && formData.tin_tins_open) {
                         handleChange('tin_total_quantity_oz', Number(formData.tin_tins_open) * Number(formData.tin_size_oz) + Number(e.target.value) * Number(formData.tin_size_oz));
                       }
                     }}
                     placeholder="e.g., 4"
                     className="border-stone-200"
                   />
                 </div>
                <div className="space-y-2">
                  <Label>Date Cellared</Label>
                  <Input
                    type="date"
                    value={formData.tin_cellared_date || ''}
                    onChange={(e) => handleChange('tin_cellared_date', e.target.value)}
                    className="border-stone-200"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Bulk Tab */}
            <TabsContent value="bulk" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Bulk Quantity (oz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.bulk_total_quantity_oz || ''}
                    onChange={(e) => handleChange('bulk_total_quantity_oz', e.target.value)}
                    placeholder="e.g., 16"
                    className="border-stone-200"
                  />
                </div>
                <div className="space-y-2">
                   <Label>Bulk Open (oz)</Label>
                   <Input
                     type="number"
                     step="0.01"
                     min="0"
                     value={formData.bulk_open || ''}
                     onChange={(e) => {
                       handleChange('bulk_open', e.target.value);
                       if (e.target.value && formData.bulk_cellared !== undefined && formData.bulk_cellared !== '') {
                         handleChange('bulk_total_quantity_oz', Number(e.target.value) + Number(formData.bulk_cellared));
                       }
                     }}
                     placeholder="e.g., 2"
                     className="border-stone-200"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Bulk Cellared (oz)</Label>
                   <Input
                     type="number"
                     step="0.01"
                     min="0"
                     value={formData.bulk_cellared || ''}
                     onChange={(e) => {
                       handleChange('bulk_cellared', e.target.value);
                       if (e.target.value && formData.bulk_open !== undefined && formData.bulk_open !== '') {
                         handleChange('bulk_total_quantity_oz', Number(formData.bulk_open) + Number(e.target.value));
                       }
                     }}
                     placeholder="e.g., 14"
                     className="border-stone-200"
                   />
                 </div>
                <div className="space-y-2">
                  <Label>Date Cellared</Label>
                  <Input
                    type="date"
                    value={formData.bulk_cellared_date || ''}
                    onChange={(e) => handleChange('bulk_cellared_date', e.target.value)}
                    className="border-stone-200"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Pouches Tab */}
            <TabsContent value="pouches" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pouch Size (oz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pouch_size_oz || ''}
                    onChange={(e) => {
                      handleChange('pouch_size_oz', e.target.value);
                      if (e.target.value && formData.pouch_total_pouches) {
                        handleChange('pouch_total_quantity_oz', Number(e.target.value) * Number(formData.pouch_total_pouches));
                      }
                    }}
                    placeholder="e.g., 1.5"
                    className="border-stone-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Pouches</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.pouch_total_pouches || ''}
                    onChange={(e) => {
                      handleChange('pouch_total_pouches', e.target.value);
                      if (e.target.value && formData.pouch_size_oz) {
                        handleChange('pouch_total_quantity_oz', Number(formData.pouch_size_oz) * Number(e.target.value));
                      }
                    }}
                    placeholder="e.g., 3"
                    className="border-stone-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Quantity (oz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pouch_total_quantity_oz || ''}
                    onChange={(e) => handleChange('pouch_total_quantity_oz', e.target.value)}
                    placeholder="Auto-calculated"
                    className="border-stone-200 bg-stone-50"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                   <Label>Pouches Open</Label>
                   <Input
                     type="number"
                     min="0"
                     value={formData.pouch_pouches_open || ''}
                     onChange={(e) => {
                       handleChange('pouch_pouches_open', e.target.value);
                       if (e.target.value && formData.pouch_size_oz && formData.pouch_pouches_cellared) {
                         handleChange('pouch_total_quantity_oz', Number(e.target.value) * Number(formData.pouch_size_oz) + Number(formData.pouch_pouches_cellared) * Number(formData.pouch_size_oz));
                       }
                     }}
                     placeholder="e.g., 1"
                     className="border-stone-200"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Pouches Cellared</Label>
                   <Input
                     type="number"
                     min="0"
                     value={formData.pouch_pouches_cellared || ''}
                     onChange={(e) => {
                       handleChange('pouch_pouches_cellared', e.target.value);
                       if (e.target.value && formData.pouch_size_oz && formData.pouch_pouches_open) {
                         handleChange('pouch_total_quantity_oz', Number(formData.pouch_pouches_open) * Number(formData.pouch_size_oz) + Number(e.target.value) * Number(formData.pouch_size_oz));
                       }
                     }}
                     placeholder="e.g., 2"
                     className="border-stone-200"
                   />
                 </div>
                <div className="space-y-2">
                  <Label>Date Cellared</Label>
                  <Input
                    type="date"
                    value={formData.pouch_cellared_date || ''}
                    onChange={(e) => handleChange('pouch_cellared_date', e.target.value)}
                    className="border-stone-200"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Common fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
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
                step="1"
                value={formData.rating || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 1 && Number(val) <= 5 && Number.isInteger(Number(val)))) {
                    handleChange('rating', val);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && Number(e.target.value)) {
                    handleChange('rating', Math.round(Number(e.target.value)));
                  }
                }}
                placeholder="Optional"
                className="border-stone-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#E0D8C8]">Notes</CardTitle>
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
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="text-stone-800">
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
    </>
  );
}