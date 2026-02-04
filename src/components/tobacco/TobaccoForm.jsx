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
import { useTranslation } from "react-i18next";

const BLEND_TYPES = ["Virginia", "Virginia/Perique", "English", "English Aromatic", "Balkan", "Aromatic", "Burley", "Virginia/Burley", "Latakia Blend", "Oriental/Turkish", "Navy Flake", "Dark Fired", "Cavendish", "Other"];
const CUTS = ["Ribbon", "Flake", "Broken Flake", "Ready Rubbed", "Plug", "Coin", "Cube Cut", "Crumble Cake", "Shag", "Rope", "Twist", "Other"];
const STRENGTHS = ["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];
const ROOM_NOTES = ["Pleasant", "Neutral", "Strong", "Very Strong"];
const PRODUCTION_STATUS = ["Current Production", "Discontinued", "Limited Edition", "Vintage"];
const AGING_POTENTIAL = ["Poor", "Fair", "Good", "Excellent"];

const COMMON_FLAVOR_NOTES = ["Earthy", "Sweet", "Nutty", "Woody", "Smoky", "Spicy", "Fruity", "Floral", "Tangy", "Creamy", "Peppery", "Chocolate", "Coffee", "Vanilla", "Honey", "Leather", "Grass", "Hay", "Citrus", "Plum", "Fig", "Raisin"];

export default function TobaccoForm({ blend, onSave, onCancel, isLoading }) {
  const { t } = useTranslation();
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
            ? t("limits.freeLimitReached")
            : t("limits.tobaccoLimit", { limit: entitlements.limits.tobaccos })
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
            <DialogTitle>{t("tobaccoExtended.browseLibrary")}</DialogTitle>
            <DialogDescription>
              {t("tobaccoExtended.browseLibraryDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
              <Input
                value={logoBrowserSearch}
                onChange={(e) => setLogoBrowserSearch(e.target.value)}
                placeholder={t("tobaccoExtended.searchBrands")}
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
                <p>{t("tobaccoExtended.noLogos")}</p>
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
                {t("tobaccoExtended.searchForBlend")}
              </CardTitle>
              <p className="text-sm text-stone-600">
                {t("tobaccoExtended.searchDesc")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("tobaccoExtended.searchPlaceholder")}
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
                      {t("common.searching")}
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      {t("common.search")}
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
              <span className="bg-white px-2 text-stone-500">{t("formsExtended.orEnterManually")}</span>
            </div>
          </div>
        </>
      )}

      {/* Logo Selection from Library */}
      {logoMatches.length > 1 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-stone-800">{t("tobaccoExtended.selectLogo")}</CardTitle>
            <p className="text-sm text-stone-600">
              {t("tobaccoExtended.selectLogoDesc", { manufacturer: formData.manufacturer })}
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
          <CardTitle className="text-lg text-[#E0D8C8]">{t("tobaccoExtended.images")}</CardTitle>
          {formData.logo && !uploading && !uploadingLogo && (
            <p className="text-xs text-stone-500">
              {t("tobaccoExtended.logoAutoPopulated")}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tin Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("tobaccoExtended.tinPhoto")}</Label>
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
                 <Label className="text-sm font-medium">{t("tobaccoExtended.labelLogo")}</Label>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => setShowLogoBrowser(true)}
                   className="text-xs"
                 >
                   <Library className="w-3 h-3 mr-1" />
                   {t("tobaccoExtended.browseLibrary")}
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
          <CardTitle className="text-lg text-[#E0D8C8]">{t("formsExtended.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithInfo 
            label={t("tobaccoExtended.blendName")} 
            required 
            helpText={t("tobaccoExtended.blendNameHelp")}
          >
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t("tobaccoExtended.blendNamePlaceholder")}
              required
              className="border-stone-200"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("tobaccoExtended.manufacturer")} 
            helpText={t("tobaccoExtended.manufacturerHelp")}
          >
            <Combobox
              value={formData.manufacturer}
              onValueChange={(v) => handleChange('manufacturer', v)}
              options={recentManufacturers}
              placeholder={t("tobaccoExtended.manufacturerPlaceholder")}
              searchPlaceholder={t("common.searchPlaceholder")}
              allowCustom={true}
              className="border-stone-200"
            />
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("tobaccoExtended.blendType")} 
            helpText={t("tobaccoExtended.blendTypeHelp")}
          >
            <Select value={formData.blend_type} onValueChange={(v) => handleChange('blend_type', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {BLEND_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("tobaccoExtended.cut")} 
            helpText={t("tobaccoExtended.cutHelp")}
          >
            <Select value={formData.cut} onValueChange={(v) => handleChange('cut', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CUTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("tobaccoExtended.strength")} 
            helpText={t("tobaccoExtended.strengthHelp")}
          >
            <Select value={formData.strength} onValueChange={(v) => handleChange('strength', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder={t("common.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldWithInfo>
          <FieldWithInfo 
            label={t("tobaccoExtended.roomNote")} 
            helpText={t("tobaccoExtended.roomNoteHelp")}
          >
            <Select value={formData.room_note} onValueChange={(v) => handleChange('room_note', v)}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder={t("common.selectPlaceholder")} />
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
          <CardTitle className="text-lg text-[#E0D8C8]">{t("tobaccoExtended.tobaccoComponents")}</CardTitle>
          <p className="text-sm text-stone-500">{t("tobaccoExtended.tobaccoComponentsDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newComponent}
              onChange={(e) => setNewComponent(e.target.value)}
              placeholder={t("tobaccoExtended.componentPlaceholder")}
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
          <CardTitle className="text-lg text-[#E0D8C8]">{t("tobaccoExtended.flavorNotes")}</CardTitle>
          <p className="text-sm text-stone-500">{t("tobaccoExtended.flavorNotesDesc")}</p>
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
          <CardTitle className="text-lg text-[#E0D8C8]">{t("tobaccoExtended.inventoryStatus")}</CardTitle>
          <p className="text-sm text-stone-500">{t("tobaccoExtended.inventoryStatusDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="tins" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tins">{t("tobaccoExtended.tins")}</TabsTrigger>
              <TabsTrigger value="bulk">{t("tobaccoExtended.bulk")}</TabsTrigger>
              <TabsTrigger value="pouches">{t("tobaccoExtended.pouches")}</TabsTrigger>
            </TabsList>

            {/* Tins Tab */}
            <TabsContent value="tins" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("tobaccoExtended.tinSize")}</Label>
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
                  <Label>{t("tobaccoExtended.totalTins")}</Label>
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
                  <Label>{t("tobaccoExtended.totalQuantity")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tin_total_quantity_oz || ''}
                    onChange={(e) => handleChange('tin_total_quantity_oz', e.target.value)}
                    placeholder={t("tobaccoExtended.autoCalculated")}
                    className="border-stone-200 bg-stone-50"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                   <Label>{t("tobaccoExtended.tinsOpen")}</Label>
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
                   <Label>{t("tobaccoExtended.tinsCellared")}</Label>
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
                  <Label>{t("tobaccoExtended.dateCellared")}</Label>
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
                  <Label>{t("tobaccoExtended.bulkTotalQuantity")}</Label>
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
                   <Label>{t("tobaccoExtended.bulkOpen")}</Label>
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
                   <Label>{t("tobaccoExtended.bulkCellared")}</Label>
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
                     <Label>{t("tobaccoExtended.dateCellared")}</Label>
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
                  <Label>{t("tobaccoExtended.pouchSize")}</Label>
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
                  <Label>{t("tobaccoExtended.totalPouches")}</Label>
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
                  <Label>{t("tobaccoExtended.totalQuantity")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pouch_total_quantity_oz || ''}
                    onChange={(e) => handleChange('pouch_total_quantity_oz', e.target.value)}
                    placeholder={t("tobaccoExtended.autoCalculated")}
                    className="border-stone-200 bg-stone-50"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                   <Label>{t("tobaccoExtended.pouchesOpen")}</Label>
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
                   <Label>{t("tobaccoExtended.pouchesCellared")}</Label>
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
                     <Label>{t("tobaccoExtended.dateCellared")}</Label>
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
              <Label>{t("tobaccoExtended.productionStatus")}</Label>
              <Select value={formData.production_status} onValueChange={(v) => handleChange('production_status', v)}>
                <SelectTrigger className="border-stone-200">
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("tobaccoExtended.agingPotential")}</Label>
              <Select value={formData.aging_potential} onValueChange={(v) => handleChange('aging_potential', v)}>
                <SelectTrigger className="border-stone-200">
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {AGING_POTENTIAL.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("tobaccoExtended.yourRating")}</Label>
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
                placeholder={t("tobaccoExtended.ratingPlaceholder")}
                className="border-stone-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-800">{t("common.notes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder={t("tobaccoExtended.notesPlaceholder")}
              className="border-stone-200"
              rows={4}
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

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="text-stone-800">
          {t("common.cancel")}
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-amber-700 hover:bg-amber-800"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {blend ? t("tobaccoExtended.updateBlend") : t("tobaccoExtended.addBlend")}
        </Button>
      </div>
    </form>
    </>
  );
}