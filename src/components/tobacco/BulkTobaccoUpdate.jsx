import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckSquare, Star, Package } from "lucide-react";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";
import FeatureGate from "@/components/subscription/FeatureGate";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function BulkTobaccoUpdate({ blends, onUpdate, onCancel, isLoading }) {
  const { t } = useTranslation();
  const [selectedBlends, setSelectedBlends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateFields, setUpdateFields] = useState({
    quantity_owned: '',
    tin_status: 'none',
    is_favorite: 'none',
    rating: ''
  });

  const filteredBlends = useMemo(() => 
    blends.filter(blend => 
      !searchQuery || 
      blend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blend.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [blends, searchQuery]
  );

  const toggleBlend = (blendId) => {
    setSelectedBlends(prev => 
      prev.includes(blendId) 
        ? prev.filter(id => id !== blendId)
        : [...prev, blendId]
    );
  };

  const toggleAll = () => {
    const currentlyAllSelected = filteredBlends.length > 0 && 
      filteredBlends.every(blend => selectedBlends.includes(blend.id));
    
    if (currentlyAllSelected) {
      setSelectedBlends([]);
    } else {
      setSelectedBlends(filteredBlends.map(b => b.id));
    }
  };

  const allSelected = filteredBlends.length > 0 && 
    filteredBlends.every(blend => selectedBlends.includes(blend.id));

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const updateData = {};
    if (updateFields.quantity_owned !== '') {
      updateData.quantity_owned = Number(updateFields.quantity_owned);
    }
    if (updateFields.tin_status && updateFields.tin_status !== 'none') {
      updateData.tin_status = updateFields.tin_status;
    }
    if (updateFields.is_favorite !== 'none') {
      updateData.is_favorite = updateFields.is_favorite === 'true';
    }
    if (updateFields.rating !== '') {
      updateData.rating = Math.round(Number(updateFields.rating));
    }

    onUpdate(selectedBlends, updateData);
  };

  return (
    <FeatureGate 
      feature="BULK_EDIT"
      featureName={t("bulkEdit.featureName")}
      description={t("bulkEdit.featureDesc")}
    >
    <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
      {/* Instructions */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-sm text-amber-900">
            {t("bulkEdit.instructions")}
          </p>
        </CardContent>
      </Card>

      {/* Blend Selection */}
      <Card className="border-stone-200 flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t("bulkEdit.selectBlends")} ({selectedBlends.length} {t("bulkEdit.selected")})
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAll}
              className="gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              {allSelected ? t("bulkEdit.deselectAll") : t("bulkEdit.selectAll")}
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("bulkEdit.searchBlends")}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-2">
              {filteredBlends.map(blend => (
                <div
                  key={blend.id}
                  onClick={() => toggleBlend(blend.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBlends.includes(blend.id)
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-stone-200 hover:border-amber-300 bg-white'
                  }`}
                >
                  <Checkbox
                    checked={selectedBlends.includes(blend.id)}
                    className="shrink-0 pointer-events-none"
                  />
                  <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0">
                    {blend.logo || blend.photo ? (
                      <img 
                        src={blend.logo || blend.photo} 
                        alt={blend.name}
                        className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`}
                      />
                    ) : (
                      <img 
                        src={getTobaccoLogo(blend.manufacturer)} 
                        alt=""
                        className="w-full h-full object-contain p-1"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{blend.name}</p>
                    <p className="text-sm text-stone-500 truncate">{blend.manufacturer || t("tobaccoExtended.unknownMaker")}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {blend.is_favorite && (
                      <Badge variant="secondary" className="bg-rose-100 text-rose-800">
                        <Star className="w-3 h-3 fill-current" />
                      </Badge>
                    )}
                    {blend.quantity_owned > 0 && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        {blend.quantity_owned} <Package className="w-3 h-3 ml-0.5" />
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {filteredBlends.length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <p>{t("bulkEdit.noBlendsFound")}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Separator />

      {/* Update Fields */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("bulkEdit.updateSelectedBlends")}</CardTitle>
          <p className="text-sm text-stone-500">{t("bulkEdit.leaveEmpty")}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("quickEdit.addToQuantity")}</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={updateFields.quantity_owned}
              onChange={(e) => setUpdateFields(prev => ({ ...prev, quantity_owned: e.target.value }))}
              placeholder={t("bulkEdit.addsToExisting")}
            />
            <p className="text-xs text-stone-500">{t("bulkEdit.addsToExistingNote")}</p>
          </div>
          
          <div className="space-y-2">
            <Label>{t("quickEdit.tinStatus")}</Label>
            <Select 
              value={updateFields.tin_status} 
              onValueChange={(v) => setUpdateFields(prev => ({ ...prev, tin_status: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("quickEdit.dontUpdate","Don't update")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("quickEdit.dontUpdate","Don't update")}</SelectItem>
                <SelectItem value="Sealed/Cellared">{t("quickEdit.sealedCellared")}</SelectItem>
                <SelectItem value="Opened">{t("quickEdit.opened")}</SelectItem>
                <SelectItem value="Empty">{t("quickEdit.empty")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("quickEdit.markAsFavorite")}</Label>
            <Select 
              value={updateFields.is_favorite} 
              onValueChange={(v) => setUpdateFields(prev => ({ ...prev, is_favorite: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("quickEdit.dontUpdate","Don't update")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("quickEdit.dontUpdate","Don't update")}</SelectItem>
                <SelectItem value="true">{t("bulkEdit.yesMarkFavorite")}</SelectItem>
                <SelectItem value="false">{t("bulkEdit.noRemoveFavorite")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("quickEdit.rating")}</Label>
            <Input
              type="number"
              min="1"
              max="5"
              step="1"
              value={updateFields.rating}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (Number(val) >= 1 && Number(val) <= 5)) {
                  setUpdateFields(prev => ({ ...prev, rating: val }));
                }
              }}
              placeholder={t("common.optional")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button 
          type="submit" 
          disabled={selectedBlends.length === 0 || isLoading}
          className="bg-amber-700 hover:bg-amber-800"
        >
          {t("bulkEdit.update")} {selectedBlends.length} {t("quickEdit.blend")}{selectedBlends.length !== 1 ? t("quickEdit.plural") : ''}
        </Button>
      </div>
    </form>
    </FeatureGate>
  );
}