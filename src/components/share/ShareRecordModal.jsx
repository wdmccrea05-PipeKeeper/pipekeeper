import React, { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Share2, Copy, Eye, Download } from "lucide-react";
import {
  createOrGetShareRecord,
  updateShareConfig,
  copyShareUrlToClipboard,
  exportShareCardAsImage,
  generatePublicShareUrl,
} from "./shareUtils";
import { getDefaultShareConfig, validateShareConfig } from "./shareFieldSelectors";
import { PipeShareCard, TobaccoShareCard, WhiskeyShareCard } from "./ShareCardRenderer";

export default function ShareRecordModal({
  isOpen,
  onOpenChange,
  moduleType,
  record,
  userProfile = {},
  privacySettings = {},
}) {
  const { t } = useTranslation();
  const cardRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shareRecord, setShareRecord] = useState(null);
  const [config, setConfig] = useState(() => getDefaultShareConfig(moduleType));
  const [previewMode, setPreviewMode] = useState("options");

  const validatedConfig = useMemo(
    () => validateShareConfig(config, userProfile, privacySettings),
    [config, userProfile, privacySettings]
  );

  const ensureShareRecord = async (cfg = validatedConfig) => {
    if (!record?.id) throw new Error("Missing record id");
    if (shareRecord?.share_token) return shareRecord;
    const ownerEmail = userProfile?.email || userProfile?.user_email || record?.created_by;
    if (!ownerEmail) throw new Error("Missing owner email");
    const created = await createOrGetShareRecord(moduleType, record.id, ownerEmail, cfg);
    setShareRecord(created);
    return created;
  };

  const handleUpdateConfig = async (newConfig) => {
    const validated = validateShareConfig(newConfig, userProfile, privacySettings);
    setConfig(validated);
    if (!shareRecord?.id) return;
    setIsLoading(true);
    try {
      const updated = await updateShareConfig(shareRecord.id, validated);
      setShareRecord(updated || shareRecord);
    } catch (error) {
      console.error("Failed to update share config:", error);
      toast.error(t("share.failedToUpdate", { defaultValue: "Failed to update sharing options" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    setIsLoading(true);
    try {
      const share = await ensureShareRecord();
      const success = await copyShareUrlToClipboard(moduleType, share.share_token);
      if (!success) throw new Error("Clipboard failed");
      toast.success(t("share.linkCopied", { defaultValue: "Link copied" }));
    } catch (error) {
      console.error(error);
      toast.error(t("share.failedToCopyLink", { defaultValue: "Failed to copy link" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPreview = async () => {
    setIsLoading(true);
    try {
      const share = await ensureShareRecord();
      const url = generatePublicShareUrl(moduleType, share.share_token);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error(t("share.failedToOpenPreview", { defaultValue: "Failed to open preview" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCard = async () => {
    if (!cardRef.current) {
      toast.error(t("share.failedToExport", { defaultValue: "Failed to export share card" }));
      return;
    }
    setIsLoading(true);
    try {
      const fileName = `${moduleType}-${record?.id || "record"}.png`;
      const ok = await exportShareCardAsImage(cardRef.current, fileName);
      if (!ok) throw new Error("Export failed");
      toast.success(t("share.cardExported", { defaultValue: "Share card downloaded" }));
    } catch (error) {
      console.error(error);
      toast.error(t("share.failedToExport", { defaultValue: "Failed to export share card" }));
    } finally {
      setIsLoading(false);
    }
  };

  const recordForPreview =
    moduleType === "pipe"
      ? {
          ...record,
          photos: validatedConfig.include_photos ? record?.photos : undefined,
          notes: validatedConfig.include_notes ? record?.notes : undefined,
          estimated_value: validatedConfig.include_value ? record?.estimated_value : undefined,
        }
      : moduleType === "whiskey"
        ? {
            ...record,
            photo: validatedConfig.include_photos ? record?.photo : undefined,
            notes: validatedConfig.include_notes ? record?.notes : undefined,
            estimated_value: validatedConfig.include_value
              ? record?.collector_value || record?.aftermarket_price || record?.retail_price || record?.purchase_price
              : undefined,
          }
        : {
            ...record,
            photo: validatedConfig.include_photos ? record?.photo : undefined,
            logo: validatedConfig.include_photos ? record?.logo : undefined,
            notes: validatedConfig.include_notes ? record?.notes : undefined,
            flavor_notes: validatedConfig.include_notes ? record?.flavor_notes : undefined,
            estimated_value: validatedConfig.include_value
              ? record?.manual_market_value || record?.ai_estimated_value
              : undefined,
            total_quantity_oz: validatedConfig.include_inventory
              ? (record?.tin_total_quantity_oz || 0) + (record?.bulk_total_quantity_oz || 0) + (record?.pouch_total_quantity_oz || 0)
              : undefined,
          };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)", border: "1px solid rgba(180, 140, 75, 0.25)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "#FFFFFF" }}>
            <Share2 className="w-5 h-5" />
            {t("share.shareRecord", { defaultValue: "Share Record" })}
          </DialogTitle>
          <DialogDescription style={{ color: "rgba(224, 216, 200, 0.7)" }}>
            {t("share.shareDescription", { defaultValue: "Choose what to include and how you want to share it." })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <Button variant={previewMode === "options" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("options")} className="flex-1">
              {t("share.options", { defaultValue: "Options" })}
            </Button>
            <Button variant={previewMode === "card" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("card")} className="flex-1">
              {t("share.preview", { defaultValue: "Preview" })}
            </Button>
          </div>

          {previewMode === "card" ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pb-4">
              {moduleType === "pipe" ? <PipeShareCard ref={cardRef} pipe={recordForPreview} userProfile={userProfile} /> : null}
              {moduleType === "tobacco" ? <TobaccoShareCard ref={cardRef} tobacco={recordForPreview} userProfile={userProfile} /> : null}
              {moduleType === "whiskey" ? <WhiskeyShareCard ref={cardRef} bottle={recordForPreview} userProfile={userProfile} /> : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 bg-[rgba(40,30,20,0.4)] p-4 rounded-lg border border-[rgba(180,140,75,0.15)]">
                <h3 style={{ color: "#E0D8C8", fontWeight: 600, fontSize: 14 }}>{t("share.privacy", { defaultValue: "Privacy" })}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label style={{ color: "rgba(224, 216, 200, 0.8)", fontSize: 14 }}>{t("share.includePhotos", { defaultValue: "Include photos" })}</label>
                    <Switch checked={validatedConfig.include_photos} onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_photos: checked })} disabled={isLoading} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label style={{ color: "rgba(224, 216, 200, 0.8)", fontSize: 14 }}>{t("share.includeNotes", { defaultValue: "Include notes" })}</label>
                    <Switch checked={validatedConfig.include_notes} onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_notes: checked })} disabled={isLoading} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label style={{ color: "rgba(224, 216, 200, 0.8)", fontSize: 14 }}>{t("share.includeValue", { defaultValue: "Include value" })}</label>
                    <Switch checked={validatedConfig.include_value} onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_value: checked })} disabled={isLoading || userProfile?.privacy_hide_values} />
                  </div>
                  {moduleType === "tobacco" ? (
                    <div className="flex items-center justify-between">
                      <label style={{ color: "rgba(224, 216, 200, 0.8)", fontSize: 14 }}>{t("share.includeInventory", { defaultValue: "Include inventory" })}</label>
                      <Switch checked={validatedConfig.include_inventory} onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_inventory: checked })} disabled={isLoading || userProfile?.privacy_hide_inventory} />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={handleCopyLink} disabled={isLoading} className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]" style={{ color: "#E0D8C8" }}>
                  <Copy className="w-4 h-4 mr-2" />
                  {t("share.copyLink", { defaultValue: "Copy Public Link" })}
                </Button>
                <Button onClick={handleOpenPreview} disabled={isLoading} className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]" style={{ color: "#E0D8C8" }}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t("share.openPreview", { defaultValue: "Open Public Preview" })}
                </Button>
                <Button onClick={() => setPreviewMode("card")} disabled={isLoading} className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]" style={{ color: "#E0D8C8" }}>
                  <Download className="w-4 h-4 mr-2" />
                  {t("share.downloadCard", { defaultValue: "Download Collector Card" })}
                </Button>
              </div>

              {previewMode === "card" ? null : (
                <div className="pt-2 text-xs text-[rgba(224,216,200,0.55)]">
                  {t("share.previewTip", { defaultValue: "Use Preview to review the card before downloading it." })}
                </div>
              )}
            </div>
          )}

          {previewMode === "card" ? (
            <div className="flex gap-2">
              <Button onClick={() => setPreviewMode("options")} variant="outline" className="flex-1">
                {t("common.back", { defaultValue: "Back" })}
              </Button>
              <Button onClick={handleExportCard} disabled={isLoading} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                {t("share.downloadCard", { defaultValue: "Download Collector Card" })}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}