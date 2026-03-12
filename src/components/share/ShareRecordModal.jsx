import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Share2, Copy, Eye, Download } from 'lucide-react';
import { 
  createOrGetShareRecord, 
  updateShareConfig, 
  copyShareUrlToClipboard, 
  exportShareCardAsImage 
} from './shareUtils';
import { 
  getDefaultShareConfig, 
  validateShareConfig,
  buildPublicPipeShareView,
  buildPublicTobaccoShareView
} from './shareFieldSelectors';
import { PipeShareCard, TobaccoShareCard } from './ShareCardRenderer';

export default function ShareRecordModal({
  isOpen,
  onOpenChange,
  moduleType,
  record,
  userProfile = {},
  privacySettings = {}
}) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [shareRecord, setShareRecord] = useState(null);
  const [config, setConfig] = useState(() => getDefaultShareConfig(moduleType));
  const cardRef = useRef(null);
  const [previewMode, setPreviewMode] = useState('options'); // 'options' or 'card'

  // Validate config against user privacy settings
  const validatedConfig = validateShareConfig(config, userProfile, privacySettings);

  const handleCreateShare = async () => {
    setIsLoading(true);
    try {
      const share = await createOrGetShareRecord(
        moduleType,
        record.id,
        userProfile.email,
        validatedConfig
      );
      setShareRecord(share);
      toast.success(t('share.shareCreated'));
    } catch (error) {
      console.error('Failed to create share:', error);
      toast.error(t('share.failedToCreate'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async (newConfig) => {
    const validated = validateShareConfig(newConfig, userProfile, privacySettings);
    setConfig(validated);
    
    if (shareRecord) {
      setIsLoading(true);
      try {
        await updateShareConfig(shareRecord.id, validated);
        toast.success(t('share.configUpdated'));
      } catch (error) {
        console.error('Failed to update config:', error);
        toast.error(t('share.failedToUpdate'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopyLink = async () => {
    if (!shareRecord) {
      await handleCreateShare();
      return;
    }

    setIsLoading(true);
    try {
      const success = await copyShareUrlToClipboard(moduleType, shareRecord.share_token);
      if (success) {
        toast.success(t('share.linkCopied'));
      } else {
        toast.error(t('share.failedToCopyLink'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPreview = () => {
    if (!shareRecord) {
      handleCreateShare();
      return;
    }
    const url = `${window.location.origin}/share/${moduleType}/${shareRecord.share_token}`;
    window.open(url, '_blank');
  };

  const handleExportCard = async () => {
    if (!cardRef.current) {
      toast.error(t('share.failedToExport'));
      return;
    }

    setIsLoading(true);
    try {
      const fileName = `${moduleType}-${record.id || 'share'}.png`;
      await exportShareCardAsImage(cardRef.current, fileName);
      toast.success(t('share.cardExported'));
    } catch (error) {
      console.error('Failed to export card:', error);
      toast.error(t('share.failedToExport'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{
        background: 'linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)',
        border: '1px solid rgba(180, 140, 75, 0.25)'
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Share2 className="w-5 h-5" />
            {t('share.shareRecord')}
          </DialogTitle>
          <DialogDescription style={{ color: 'rgba(224, 216, 200, 0.7)' }}>
            {t('share.shareDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Toggle */}
          <div className="flex gap-2">
            <Button
              variant={previewMode === 'options' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('options')}
              className="flex-1"
            >
              {t('share.options')}
            </Button>
            <Button
              variant={previewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('card')}
              className="flex-1"
            >
              {t('share.preview')}
            </Button>
          </div>

          {previewMode === 'card' ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pb-4">
              {moduleType === 'pipe' && (
                <PipeShareCard
                  ref={cardRef}
                  pipe={{
                    ...record,
                    photos: validatedConfig.include_photos ? record.photos : undefined,
                    notes: validatedConfig.include_notes ? record.notes : undefined,
                    estimated_value: validatedConfig.include_value ? record.estimated_value : undefined
                  }}
                  userProfile={userProfile}
                />
              )}
              {moduleType === 'tobacco' && (
                <TobaccoShareCard
                  ref={cardRef}
                  tobacco={{
                    ...record,
                    photo: validatedConfig.include_photos ? record.photo : undefined,
                    notes: validatedConfig.include_notes ? record.notes : undefined,
                    flavor_notes: validatedConfig.include_notes ? record.flavor_notes : undefined,
                    estimated_value: validatedConfig.include_value ? record.manual_market_value || record.ai_estimated_value : undefined,
                    total_quantity_oz: validatedConfig.include_inventory ? ((record.tin_total_quantity_oz || 0) + (record.bulk_total_quantity_oz || 0) + (record.pouch_total_quantity_oz || 0)) : undefined
                  }}
                  userProfile={userProfile}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Privacy Settings */}
              <div className="space-y-3 bg-[rgba(40,30,20,0.4)] p-4 rounded-lg border border-[rgba(180,140,75,0.15)]">
                <h3 style={{ color: '#E0D8C8', fontWeight: '600', fontSize: '14px' }}>
                  {t('share.privacy')}
                </h3>

                <div className="space-y-3">
                  {/* Photos Toggle */}
                  <div className="flex items-center justify-between">
                    <label style={{ color: 'rgba(224, 216, 200, 0.8)', fontSize: '14px' }}>
                      {t('share.includePhotos')}
                    </label>
                    <Switch
                      checked={validatedConfig.include_photos}
                      onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_photos: checked })}
                      disabled={isLoading}
                    />
                  </div>

                  {/* Notes Toggle */}
                  <div className="flex items-center justify-between">
                    <label style={{ color: 'rgba(224, 216, 200, 0.8)', fontSize: '14px' }}>
                      {t('share.includeNotes')}
                    </label>
                    <Switch
                      checked={validatedConfig.include_notes}
                      onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_notes: checked })}
                      disabled={isLoading}
                    />
                  </div>

                  {/* Value Toggle */}
                  <div className="flex items-center justify-between">
                    <label style={{ color: 'rgba(224, 216, 200, 0.8)', fontSize: '14px' }}>
                      {t('share.includeValue')}
                    </label>
                    <Switch
                      checked={validatedConfig.include_value}
                      onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_value: checked })}
                      disabled={isLoading || userProfile?.privacy_hide_values}
                    />
                  </div>

                  {/* Inventory Toggle (tobacco only) */}
                  {moduleType === 'tobacco' && (
                    <div className="flex items-center justify-between">
                      <label style={{ color: 'rgba(224, 216, 200, 0.8)', fontSize: '14px' }}>
                        {t('share.includeInventory')}
                      </label>
                      <Switch
                        checked={validatedConfig.include_inventory}
                        onCheckedChange={(checked) => handleUpdateConfig({ ...config, include_inventory: checked })}
                        disabled={isLoading || userProfile?.privacy_hide_inventory}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Share Actions */}
              <div className="space-y-2">
                <Button
                  onClick={handleCopyLink}
                  disabled={isLoading}
                  className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]"
                  style={{ color: '#E0D8C8' }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('share.copyLink')}
                </Button>

                <Button
                  onClick={handleOpenPreview}
                  disabled={isLoading}
                  className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]"
                  style={{ color: '#E0D8C8' }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('share.openPreview')}
                </Button>

                <Button
                  onClick={handleExportCard}
                  disabled={isLoading}
                  className="w-full justify-start bg-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.3)] border border-[rgba(180,140,75,0.3)]"
                  style={{ color: '#E0D8C8' }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('share.downloadCard')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}