import React from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { formatCurrency } from '@/components/utils/localeFormatters';

const PIPEKEEPER_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png';

/**
 * Premium branded share card for pipes
 */
export const PipeShareCard = React.forwardRef(({ pipe, userProfile }, ref) => {
  const { t } = useTranslation();

  return (
    <div
      ref={ref}
      className="w-full max-w-sm mx-auto p-8"
      style={{
        background: 'linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(180, 140, 75, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      {/* Header Branding */}
      <div className="flex items-center justify-between mb-6">
        <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="h-6 object-contain" />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(180, 140, 75, 0.7)' }}>
          {t('share.collectorCard')}
        </span>
      </div>

      {/* Main Image */}
      {pipe.photos && pipe.photos.length > 0 && (
        <div className="mb-6 -mx-8 -mt-2 -mb-4 relative h-64 overflow-hidden rounded-t-lg">
          <img
            src={pipe.photos[0]}
            alt={pipe.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Pipe Details */}
      <div className="space-y-4">
        {/* Name and Maker */}
        <div className="border-b border-[rgba(180,140,75,0.15)] pb-4">
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: '#FFFFFF', wordBreak: 'break-word' }}
          >
            {pipe.name}
          </h2>
          {pipe.maker && (
            <p
              className="text-sm font-semibold"
              style={{ color: 'rgba(224, 216, 200, 0.8)', wordBreak: 'break-word' }}
            >
              {pipe.maker}
            </p>
          )}
        </div>

        {/* Key Attributes Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {pipe.shape && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('pipes.shape')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {pipe.shape}
              </p>
            </div>
          )}

          {pipe.bowl_material && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('pipes.material')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {pipe.bowl_material}
              </p>
            </div>
          )}

          {pipe.bend && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('pipes.bend')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {pipe.bend}
              </p>
            </div>
          )}

          {pipe.sizeClass && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('pipes.size')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {pipe.sizeClass}
              </p>
            </div>
          )}

          {pipe.country_of_origin && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('pipes.origin')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {pipe.country_of_origin}
              </p>
            </div>
          )}

          {pipe.year_made && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('pipes.year')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {pipe.year_made}
              </p>
            </div>
          )}

          {pipe.condition && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('pipes.condition')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {pipe.condition}
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {pipe.notes && (
          <div className="border-t border-[rgba(180,140,75,0.15)] pt-4">
            <p style={{ color: 'rgba(224, 216, 200, 0.8)', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
              {pipe.notes.substring(0, 150)}
              {pipe.notes.length > 150 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Value */}
        {pipe.estimated_value && (
          <div className="bg-[rgba(46,125,92,0.15)] rounded-lg p-3 border border-[rgba(46,125,92,0.25)]">
            <p style={{ color: 'rgba(150, 200, 160, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {t('share.estimatedValue')}
            </p>
            <p style={{ color: '#7dd3c0', fontSize: '18px', fontWeight: '700' }}>
              {formatCurrency(pipe.estimated_value)}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[rgba(180,140,75,0.15)] mt-6 pt-4 text-center">
        <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {t('share.sharedFromPipeKeeper')}
        </p>
        {userProfile?.display_name && (
          <p style={{ color: 'rgba(224, 216, 200, 0.6)', fontSize: '11px', marginTop: '4px' }}>
            {t('share.by')} {userProfile.display_name}
          </p>
        )}
      </div>
    </div>
  );
});
PipeShareCard.displayName = 'PipeShareCard';

/**
 * Premium branded share card for tobacco
 */
export const TobaccoShareCard = React.forwardRef(({ tobacco, userProfile }, ref) => {
  const { t } = useTranslation();

  return (
    <div
      ref={ref}
      className="w-full max-w-sm mx-auto p-8"
      style={{
        background: 'linear-gradient(135deg, #2a1f18 0%, #1f1510 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(180, 140, 75, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      {/* Header Branding */}
      <div className="flex items-center justify-between mb-6">
        <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="h-6 object-contain" />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(180, 140, 75, 0.7)' }}>
          {t('share.collectorCard')}
        </span>
      </div>

      {/* Main Image */}
      <div className="mb-6 -mx-8 -mt-2 -mb-4 relative h-64 rounded-t-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(40, 30, 20, 0.8)' }}>
        {tobacco.photo ? (
          <img
            src={tobacco.photo}
            alt={tobacco.name}
            className="w-full h-full object-cover"
          />
        ) : tobacco.logo ? (
          <img
            src={tobacco.logo}
            alt={tobacco.manufacturer}
            className="w-32 h-32 object-contain opacity-80"
          />
        ) : (
          <div style={{ color: 'rgba(180, 140, 75, 0.3)', textAlign: 'center' }}>
            <p className="text-sm">{t('common.noImage')}</p>
          </div>
        )}
      </div>

      {/* Blend Details */}
      <div className="space-y-4">
        {/* Name and Manufacturer */}
        <div className="border-b border-[rgba(180,140,75,0.15)] pb-4">
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: '#FFFFFF', wordBreak: 'break-word' }}
          >
            {tobacco.name}
          </h2>
          {tobacco.manufacturer && (
            <p
              className="text-sm font-semibold"
              style={{ color: 'rgba(224, 216, 200, 0.8)', wordBreak: 'break-word' }}
            >
              {tobacco.manufacturer}
            </p>
          )}
        </div>

        {/* Key Attributes Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {tobacco.blend_type && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('tobacco.blendType')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {tobacco.blend_type}
              </p>
            </div>
          )}

          {tobacco.cut && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('tobacco.cut')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {tobacco.cut}
              </p>
            </div>
          )}

          {tobacco.strength && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('tobacco.strength')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {tobacco.strength}
              </p>
            </div>
          )}

          {tobacco.room_note && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('tobacco.roomNote')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {tobacco.room_note}
              </p>
            </div>
          )}

          {tobacco.production_status && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('tobacco.status')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {tobacco.production_status}
              </p>
            </div>
          )}

          {tobacco.aging_potential && (
            <div>
              <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {t('tobacco.aging')}
              </p>
              <p style={{ color: '#E0D8C8', fontWeight: '600', wordBreak: 'break-word' }}>
                {tobacco.aging_potential}
              </p>
            </div>
          )}
        </div>

        {/* Tobacco Components */}
        {tobacco.tobacco_components && tobacco.tobacco_components.length > 0 && (
          <div className="border-t border-[rgba(180,140,75,0.15)] pt-4">
            <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              {t('tobacco.components')}
            </p>
            <div className="flex flex-wrap gap-2">
              {tobacco.tobacco_components.map((component, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(180, 140, 75, 0.15)',
                    color: '#E0D8C8',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    wordBreak: 'break-word'
                  }}
                >
                  {component}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Flavor Notes */}
        {tobacco.flavor_notes && tobacco.flavor_notes.length > 0 && (
          <div className="border-t border-[rgba(180,140,75,0.15)] pt-4">
            <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              {t('tobacco.flavorNotes')}
            </p>
            <p style={{ color: 'rgba(224, 216, 200, 0.8)', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
              {tobacco.flavor_notes.slice(0, 3).join(', ')}
            </p>
          </div>
        )}

        {/* Notes */}
        {tobacco.notes && (
          <div className="border-t border-[rgba(180,140,75,0.15)] pt-4">
            <p style={{ color: 'rgba(224, 216, 200, 0.8)', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
              {tobacco.notes.substring(0, 150)}
              {tobacco.notes.length > 150 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Value */}
        {tobacco.estimated_value && (
          <div className="bg-[rgba(46,125,92,0.15)] rounded-lg p-3 border border-[rgba(46,125,92,0.25)]">
            <p style={{ color: 'rgba(150, 200, 160, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {t('share.estimatedValue')}
            </p>
            <p style={{ color: '#7dd3c0', fontSize: '18px', fontWeight: '700' }}>
              {formatCurrency(tobacco.estimated_value)}
            </p>
          </div>
        )}

        {/* Inventory (if included) */}
        {tobacco.total_quantity_oz && (
          <div className="bg-[rgba(180,140,75,0.08)] rounded-lg p-3 border border-[rgba(180,140,75,0.2)]">
            <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {t('share.totalInventory')}
            </p>
            <p style={{ color: '#D4A574', fontSize: '16px', fontWeight: '700' }}>
              {tobacco.total_quantity_oz.toFixed(1)} {t('common.oz')}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[rgba(180,140,75,0.15)] mt-6 pt-4 text-center">
        <p style={{ color: 'rgba(180, 140, 75, 0.6)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {t('share.sharedFromPipeKeeper')}
        </p>
        {userProfile?.display_name && (
          <p style={{ color: 'rgba(224, 216, 200, 0.6)', fontSize: '11px', marginTop: '4px' }}>
            {t('share.by')} {userProfile.display_name}
          </p>
        )}
      </div>
    </div>
  );
});
TobaccoShareCard.displayName = 'TobaccoShareCard';