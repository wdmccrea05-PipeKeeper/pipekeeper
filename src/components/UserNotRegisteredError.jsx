import React from 'react';
import { useTranslation } from "@/components/i18n/safeTranslation";
import BrandLogo from '@/components/branding/BrandLogo';

const UserNotRegisteredError = () => {
  const { t } = useTranslation();
  
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6"
      style={{ background: 'linear-gradient(135deg, #0f0b08 0%, #1a1410 50%, #0f0b08 100%)' }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8"
        style={{
          background: 'linear-gradient(145deg, rgba(42,30,20,0.96), rgba(28,18,12,0.98))',
          border: '1px solid rgba(120,90,65,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div className="text-center">
          <BrandLogo compact showWordmark={false} imageClassName="w-12 h-12 mx-auto mb-4 opacity-80" />
          <p className="text-xs uppercase tracking-[0.12em] font-bold mb-4" style={{ color: '#B48C4B' }}>{t("auto.components_UserNotRegisteredError.collectionkeeper_1ukoz8")}</p>
          <div className="inline-flex items-center justify-center w-14 h-14 mb-5 rounded-full" style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}>
            <svg className="w-7 h-7" style={{ color: 'rgba(180,140,75,0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{t("userNotRegistered.title")}</h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.65)' }}>
            {t("userNotRegistered.description")}
          </p>
          <div className="p-4 rounded-xl text-sm text-left" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.15)' }}>
            <p style={{ color: 'rgba(224,216,200,0.7)' }}>{t("userNotRegistered.ifError")}</p>
            <ul className="list-disc list-inside mt-2 space-y-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              <li>{t("userNotRegistered.verifyAccount")}</li>
              <li>{t("userNotRegistered.contactAdmin")}</li>
              <li>{t("userNotRegistered.tryRelogin")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;