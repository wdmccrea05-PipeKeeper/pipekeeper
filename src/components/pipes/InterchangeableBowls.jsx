import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Layers, Camera, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";

const BOWL_MATERIALS = ["Briar", "Meerschaum", "Corn Cob", "Clay", "Olive Wood", "Cherry Wood", "Morta", "Other"];
const CHAMBER_VOLUMES = ["Small", "Medium", "Large", "Extra Large"];
const SHAPES = [
  "Billiard","Bulldog","Dublin","Apple","Author","Bent","Canadian","Churchwarden","Freehand",
  "Lovat","Poker","Prince","Rhodesian","Zulu","Calabash","Other"
];

function toNumberOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function InterchangeableBowls({ pipe, onUpdate }) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [useMetric, setUseMetric] = useState(true);

  const [bowlForm, setBowlForm] = useState({
    bowl_variant_id: "",
    name: "",
    shape: "",
    bowl_material: "",
    bowl_height_mm: "",
    bowl_width_mm: "",
    bowl_diameter_mm: "",
    bowl_depth_mm: "",
    chamber_volume: "",
    focus: [],
    notes: "",
    photo: "",
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const convertToImperial = (mm) => {
    if (!mm) return null;
    return (mm / 25.4).toFixed(2);
  };

  const formatMeasurement = (mm, label) => {
    if (!mm) return null;
    if (useMetric) {
      return `${label} ${mm}mm`;
    } else {
      return `${label} ${convertToImperial(mm)}"`;
    }
  };

  const interchangeableBowls = Array.isArray(pipe?.interchangeable_bowls) ? pipe.interchangeable_bowls : [];

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBowlForm({ ...bowlForm, photo: file_url });
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert(t("bowls.photoUploadError", "Failed to upload photo. Please try again."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenDialog = (bowl = null, index = null) => {
    if (bowl) {
      setBowlForm({
        bowl_variant_id: bowl.bowl_variant_id || `bowl_${index}`,
        name: bowl.name || "",
        shape: bowl.shape || "",
        bowl_material: bowl.bowl_material || "",
        bowl_height_mm: bowl.bowl_height_mm ?? "",
        bowl_width_mm: bowl.bowl_width_mm ?? "",
        bowl_diameter_mm: bowl.bowl_diameter_mm ?? "",
        bowl_depth_mm: bowl.bowl_depth_mm ?? "",
        chamber_volume: bowl.chamber_volume || "",
        focus: Array.isArray(bowl.focus) ? bowl.focus : [],
        notes: bowl.notes || "",
        photo: bowl.photo || "",
      });
      setEditingIndex(index);
    } else {
      setBowlForm({
        bowl_variant_id: `bowl_${interchangeableBowls.length}`,
        name: "",
        shape: "",
        bowl_material: "",
        bowl_height_mm: "",
        bowl_width_mm: "",
        bowl_diameter_mm: "",
        bowl_depth_mm: "",
        chamber_volume: "",
        focus: [],
        notes: "",
        photo: "",
      });
      setEditingIndex(null);
    }
    setDialogOpen(true);
  };

  const handleSaveBowl = () => {
    const updatedBowls = [...interchangeableBowls];

    const normalized = {
      ...bowlForm,
      bowl_variant_id: bowlForm.bowl_variant_id || (editingIndex != null ? `bowl_${editingIndex}` : `bowl_${updatedBowls.length}`),
      bowl_height_mm: toNumberOrNull(bowlForm.bowl_height_mm),
      bowl_width_mm: toNumberOrNull(bowlForm.bowl_width_mm),
      bowl_diameter_mm: toNumberOrNull(bowlForm.bowl_diameter_mm),
      bowl_depth_mm: toNumberOrNull(bowlForm.bowl_depth_mm),
      focus: Array.isArray(bowlForm.focus) ? bowlForm.focus : [],
    };

    if (editingIndex !== null) {
      updatedBowls[editingIndex] = normalized;
    } else {
      updatedBowls.push(normalized);
    }

    onUpdate({ interchangeable_bowls: updatedBowls });
    setDialogOpen(false);
  };

  const handleDeleteBowl = (index) => {
    if (!window.confirm(t("bowls.removeBowlConfirm", "Remove this bowl from the list?"))) return;
    const updatedBowls = interchangeableBowls.filter((_, i) => i !== index);
    // re-stabilize ids for display/selection if you want consistent ordering
    const rekeyed = updatedBowls.map((b, i) => ({ ...b, bowl_variant_id: b.bowl_variant_id || `bowl_${i}` }));
    onUpdate({ interchangeable_bowls: rekeyed });
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Layers className="w-5 h-5" />
            {t("formsExtended.interchangeableBowls")}
          </CardTitle>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseMetric(!useMetric)}
              className="text-xs"
            >
              {useMetric ? "mm" : "in"}
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 flex-1 sm:flex-none" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-1" />
                {t("bowls.addBowl", "Add Bowl")}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingIndex !== null ? t("bowls.editBowl", "Edit Bowl") : t("bowls.addInterchangeableBowl", "Add Interchangeable Bowl")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("bowls.bowlName", "Bowl Name")}</Label>
                    <Input
                      value={bowlForm.name}
                      onChange={(e) => setBowlForm({ ...bowlForm, name: e.target.value })}
                      placeholder={t("bowls.bowlNamePlaceholder", "e.g., Standard Bowl, Meerschaum Bowl")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formsExtended.shape")}</Label>
                    <Select value={bowlForm.shape} onValueChange={(v) => setBowlForm({ ...bowlForm, shape: v })}>
                      <SelectTrigger><SelectValue placeholder={t("formsExtended.selectShape")} /></SelectTrigger>
                      <SelectContent>
                        {SHAPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formsExtended.material", "Material")}</Label>
                    <Select value={bowlForm.bowl_material} onValueChange={(v) => setBowlForm({ ...bowlForm, bowl_material: v })}>
                      <SelectTrigger><SelectValue placeholder={t("formsExtended.selectMaterial")} /></SelectTrigger>
                      <SelectContent>
                        {BOWL_MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formsExtended.chamberVolume")}</Label>
                    <Select value={bowlForm.chamber_volume} onValueChange={(v) => setBowlForm({ ...bowlForm, chamber_volume: v })}>
                      <SelectTrigger><SelectValue placeholder={t("formsExtended.selectVolume")} /></SelectTrigger>
                      <SelectContent>
                        {CHAMBER_VOLUMES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formsExtended.bowlHeight")} ({useMetric ? t("units.mm") : t("units.in")})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={
                        bowlForm.bowl_height_mm 
                          ? useMetric ? bowlForm.bowl_height_mm : convertToImperial(bowlForm.bowl_height_mm)
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBowlForm({ ...bowlForm, bowl_height_mm: '' });
                        } else {
                          const metricVal = useMetric ? val : (parseFloat(val) * 25.4).toFixed(1);
                          setBowlForm({ ...bowlForm, bowl_height_mm: metricVal });
                        }
                      }}
                      placeholder={useMetric ? "e.g., 50" : "e.g., 2.0"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formsExtended.bowlWidth")} ({useMetric ? t("units.mm") : t("units.in")})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={
                        bowlForm.bowl_width_mm 
                          ? useMetric ? bowlForm.bowl_width_mm : convertToImperial(bowlForm.bowl_width_mm)
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBowlForm({ ...bowlForm, bowl_width_mm: '' });
                        } else {
                          const metricVal = useMetric ? val : (parseFloat(val) * 25.4).toFixed(1);
                          setBowlForm({ ...bowlForm, bowl_width_mm: metricVal });
                        }
                      }}
                      placeholder={useMetric ? "e.g., 38" : "e.g., 1.5"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formsExtended.chamberDiameter")} ({useMetric ? t("units.mm") : t("units.in")})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={
                        bowlForm.bowl_diameter_mm 
                          ? useMetric ? bowlForm.bowl_diameter_mm : convertToImperial(bowlForm.bowl_diameter_mm)
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBowlForm({ ...bowlForm, bowl_diameter_mm: '' });
                        } else {
                          const metricVal = useMetric ? val : (parseFloat(val) * 25.4).toFixed(1);
                          setBowlForm({ ...bowlForm, bowl_diameter_mm: metricVal });
                        }
                      }}
                      placeholder={useMetric ? "e.g., 20" : "e.g., 0.8"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("formsExtended.chamberDepth")} ({useMetric ? t("units.mm") : t("units.in")})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={
                        bowlForm.bowl_depth_mm 
                          ? useMetric ? bowlForm.bowl_depth_mm : convertToImperial(bowlForm.bowl_depth_mm)
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBowlForm({ ...bowlForm, bowl_depth_mm: '' });
                        } else {
                          const metricVal = useMetric ? val : (parseFloat(val) * 25.4).toFixed(1);
                          setBowlForm({ ...bowlForm, bowl_depth_mm: metricVal });
                        }
                      }}
                      placeholder={useMetric ? "e.g., 40" : "e.g., 1.6"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("bowls.bowlSpecialization", "Bowl Specialization (Focus)")}</Label>
                  <Input
                    value={bowlForm.focus?.join(", ") || ""}
                    onChange={(e) => {
                      const focuses = e.target.value.split(",").map((f) => f.trim()).filter(Boolean);
                      setBowlForm({ ...bowlForm, focus: focuses });
                    }}
                    placeholder={t("bowls.specializationPlaceholder", "e.g., English, Virginia/Perique")}
                  />
                  <p className="text-xs text-stone-500">{t("bowls.separateCommas", "Separate multiple types with commas")}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t("bowls.bowlPhoto", "Bowl Photo")}</Label>
                  {bowlForm.photo && (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span className="text-xs font-semibold text-amber-900">{t("bowls.preview", "Preview")}</span>
                      </div>
                      <div className="flex justify-center">
                        <img src={bowlForm.photo} alt="Bowl preview" className="w-24 h-24 object-cover rounded-lg border-2 border-amber-400" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 items-start">
                    {bowlForm.photo ? (
                      <div className="relative">
                        <img src={bowlForm.photo} alt="Bowl" className="w-20 h-20 object-cover rounded-lg border border-amber-200" />
                        <button
                          type="button"
                          onClick={() => setBowlForm({ ...bowlForm, photo: "" })}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null}
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="bowl-photo-camera"
                        />
                        <label htmlFor="bowl-photo-camera">
                          <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} asChild>
                            <span className="cursor-pointer">
                              <Camera className="w-4 h-4 mr-2" />
                              {uploadingPhoto ? t("photos.uploading", "Uploading...") : t("photos.camera")}
                            </span>
                          </Button>
                        </label>
                        
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="bowl-photo-gallery"
                        />
                        <label htmlFor="bowl-photo-gallery">
                          <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} asChild>
                            <span className="cursor-pointer">
                              📷 {t("photos.gallery")}
                            </span>
                          </Button>
                        </label>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">{t("bowls.squarePhotosNote", "Square photos work best")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("formsExtended.notes")}</Label>
                  <Input
                    value={bowlForm.notes}
                    onChange={(e) => setBowlForm({ ...bowlForm, notes: e.target.value })}
                    placeholder={t("bowls.notesPlaceholder", "Any additional notes about this bowl...")}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button onClick={handleSaveBowl} className="bg-amber-600 hover:bg-amber-700">
                    {editingIndex !== null ? t("common.update") : t("common.add")} {t("bowls.bowl", "Bowl")}
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {interchangeableBowls.length === 0 ? (
          <div className="text-center py-6 text-stone-500">
            <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("bowls.noBowlsYet", "No additional bowls added yet")}</p>
            <p className="text-xs mt-1">{t("bowls.trackBowlOptions", "Track different bowl options for this pipe system")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interchangeableBowls.map((bowl, idx) => (
              <div key={bowl.bowl_variant_id || idx} className="flex items-start justify-between p-4 bg-white rounded-lg border border-amber-200 hover:border-amber-300 transition-colors">
                <div className="flex gap-3 flex-1">
                  {bowl.photo ? (
                    <img src={bowl.photo} alt={bowl.name || "Bowl"} className="w-16 h-16 object-cover rounded-lg border border-amber-200 flex-shrink-0" />
                  ) : null}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-stone-800">{bowl.name || `Bowl ${idx + 1}`}</h4>
                      {bowl.shape ? <Badge variant="outline" className="text-xs">{bowl.shape}</Badge> : null}
                    </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {bowl.bowl_material ? <Badge className="bg-stone-100 text-stone-700">{bowl.bowl_material}</Badge> : null}
                    {bowl.chamber_volume ? <Badge className="bg-amber-100 text-amber-800">{bowl.chamber_volume}</Badge> : null}
                    {formatMeasurement(bowl.bowl_height_mm, "H") ? <span className="text-stone-600">{formatMeasurement(bowl.bowl_height_mm, "H")}</span> : null}
                    {formatMeasurement(bowl.bowl_width_mm, "W") ? <span className="text-stone-600">{formatMeasurement(bowl.bowl_width_mm, "W")}</span> : null}
                    {formatMeasurement(bowl.bowl_diameter_mm, "Ø") ? <span className="text-stone-600">{formatMeasurement(bowl.bowl_diameter_mm, "Ø")}</span> : null}
                    {formatMeasurement(bowl.bowl_depth_mm, "D") ? <span className="text-stone-600">{formatMeasurement(bowl.bowl_depth_mm, "D")}</span> : null}
                    {Array.isArray(bowl.focus) && bowl.focus.length > 0 ? (
                      <span className="text-amber-700 font-medium">🎯 {bowl.focus.join(", ")}</span>
                    ) : null}
                  </div>

                    {bowl.notes ? <p className="text-xs text-stone-600 mt-2">{bowl.notes}</p> : null}
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(bowl, idx)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteBowl(idx)} className="text-rose-600 hover:text-rose-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}