import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { getShareByToken } from '@/components/share/shareUtils';
import { buildPublicPipeShareView, buildPublicTobaccoShareView } from '@/components/share/shareFieldSelectors';
import { PipeShareCard, TobaccoShareCard } from '@/components/share/ShareCardRenderer';

const PIPEKEEPER_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png';

export default function PublicSharedRecord() {
  const { t } = useTranslation();
  const { moduleType, shareToken } = useParams();
  const navigate = useNavigate();

  const [shareRecord, setShareRecord] = useState(null);
  const [record, setRecord] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadShare = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get the share record
        const share = await getShareByToken(shareToken);
        if (!share) {
          setError('notFound');
          setIsLoading(false);
          return;
        }

        setShareRecord(share);

        // Load the actual record
        const entityName = moduleType === 'pipe' ? 'Pipe' : 'TobaccoBlend';
        const records = await base44.entities[entityName].filter({ id: share.record_id });
        const foundRecord = records && records.length > 0 ? records[0] : null;

        if (!foundRecord) {
          setError('recordNotFound');
          setIsLoading(false);
          return;
        }

        setRecord(foundRecord);

        // Load user profile if available
        try {
          const profiles = await base44.entities.UserProfile.filter({
            user_email: share.owner_email
          });
          if (profiles && profiles.length > 0) {
            setUserProfile(profiles[0]);
          }
        } catch (err) {
          // Profile not critical for display
          console.warn('Failed to load user profile:', err);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load share:', err);
        setError('loadFailed');
        setIsLoading(false);
      }
    };

    loadShare();
  }, [moduleType, shareToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(circle at 30% 20%, rgba(120,85,55,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(70,50,35,0.2), transparent 50%), #0f0b08'
      }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[rgba(180,140,75,0.3)] border-t-[#D4A574] rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'rgba(224, 216, 200, 0.7)' }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(circle at 30% 20%, rgba(120,85,55,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(70,50,35,0.2), transparent 50%), #0f0b08'
      }}>
        <div className="max-w-md mx-auto p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12" style={{ color: '#D45C5C' }} />
          </div>
          <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            {t(`share.error.${error}.title`)}
          </h1>
          <p style={{ color: 'rgba(224, 216, 200, 0.7)', marginBottom: '24px' }}>
            {t(`share.error.${error}.message`)}
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-[#A35C5C] hover:bg-[#8F4E4E]"
          >
            {t('share.backHome')}
          </Button>
        </div>
      </div>
    );
  }

  if (!record || !shareRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(circle at 30% 20%, rgba(120,85,55,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(70,50,35,0.2), transparent 50%), #0f0b08'
      }}>
        <div className="max-w-md mx-auto p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#D45C5C' }} />
          <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            {t('share.error.notFound.title')}
          </h1>
          <Button
            onClick={() => navigate('/')}
            className="mt-6 bg-[#A35C5C] hover:bg-[#8F4E4E]"
          >
            {t('share.backHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(circle at 30% 20%, rgba(120,85,55,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(70,50,35,0.2), transparent 50%), #0f0b08'
    }}>
      {/* Header */}
      <nav className="border-b" style={{
        background: 'linear-gradient(to bottom, rgba(28, 20, 14, 0.97), rgba(24, 16, 12, 0.99))',
        borderBottomColor: 'rgba(120, 90, 65, 0.35)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-[#E0D8C8]"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="h-6 object-contain" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Share Card */}
        <div className="flex justify-center mb-12">
          {moduleType === 'pipe' && (
            <PipeShareCard
              pipe={record}
              userProfile={userProfile}
            />
          )}
          {moduleType === 'tobacco' && (
            <TobaccoShareCard
              tobacco={record}
              userProfile={userProfile}
            />
          )}
        </div>

        {/* Footer CTA */}
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gradient-to-br from-[#2a1f18] to-[#1f1510] border border-[rgba(180,140,75,0.25)] rounded-lg p-6">
            <p style={{ color: 'rgba(224, 216, 200, 0.8)', marginBottom: '12px', fontSize: '14px' }}>
              {t('share.startOwnCollection')}
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-[#A35C5C] hover:bg-[#8F4E4E]"
            >
              {t('share.openPipeKeeper')}
            </Button>
            <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '11px', marginTop: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('share.poweredByPipeKeeper')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}