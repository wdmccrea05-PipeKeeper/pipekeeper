import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import CigarForm from '@/components/cigars/CigarForm';
import { useTranslation } from '@/components/i18n/safeTranslation';

function CigarFormPageInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const [cigar, setCigar] = useState(null);
  const [loading, setLoading] = useState(false);

  const cigarId = searchParams.get('id');

  useEffect(() => {
    if (!cigarId || !user?.email) return;

    let cancelled = false;

    async function loadCigar() {
      setLoading(true);
      try {
        let record = null;

        try {
          const fetched = await base44.entities.Cigar.get(cigarId);
          if (fetched?.created_by === user.email) {
            record = fetched;
          }
        } catch {
          // fall through to scoped lookup
        }

        if (!record) {
          const found = await base44.entities.Cigar.filter({
            id: cigarId,
            created_by: user.email,
          }).catch(() => []);
          record = found?.[0] || null;
        }

        if (!cancelled) setCigar(record);
      } catch (err) {
        console.error('[CigarFormPage] load error:', err);
        if (!cancelled) setCigar(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCigar();
    return () => { cancelled = true; };
  }, [cigarId, user?.email]);

  const handleSubmit = (savedRecord) => {
    const id = savedRecord?.id || cigar?.id;
    if (id) {
      navigate(`/CigarDetail?id=${encodeURIComponent(id)}`);
    } else {
      navigate('/Cigars');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(42,31,24,0.95), rgba(31,21,16,0.98))',
            border: '1px solid rgba(140,107,63,0.22)',
          }}
        >
          <p style={{ color: 'rgba(224,216,200,0.65)' }}>{t("auto.pages_CigarFormPage.loading_1sqiar")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <CigarForm
        cigar={cigar || undefined}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}

export default function CigarFormPage() {
  return (
    <LockedModuleGuard moduleKey="cigarkeeper">
      <CigarFormPageInner />
    </LockedModuleGuard>
  );
}
