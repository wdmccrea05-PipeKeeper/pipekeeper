import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function CuratorHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-[#8b6239]/20 to-[#D4A574]/10 border border-[#D4A574]/30 rounded-2xl p-8 flex items-center justify-between gap-6">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-12 h-12 rounded-lg bg-[#D4A574]/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-6 h-6 text-[#D4A574]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#E0D8C8]">
            {t('hub.curatorTitle')}
          </h3>
          <p className="text-sm text-[#E0D8C8]/70 mt-1">
            {t('hub.curatorDescription')}
          </p>
        </div>
      </div>

      <Button
        onClick={() => navigate('/Curator')}
        className="flex items-center gap-2 flex-shrink-0 bg-[#D4A574] hover:bg-[#C99A66] text-[#1a1410]"
      >
        {t('hub.curatorAction')}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}