import React, { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { getModuleDocumentation } from './documentationRegistry';

export default function TutorialViewer({ moduleId, tutorialId, onBack }) {
  const { t } = useTranslation();

  const tutorial = useMemo(() => {
    const docs = getModuleDocumentation(moduleId);
    if (!docs || !docs.tutorials) return null;
    return docs.tutorials.find(tut => tut.id === tutorialId);
  }, [moduleId, tutorialId]);

  if (!tutorial) {
    return (
      <div className="text-center py-8">
        <p className="text-[#D7C9B2]/70">{t('help.tutorialNotFound', 'Tutorial not found')}</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#D7C9B2]/70 hover:text-[#F5F1E7] transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('help.backToTutorials', 'Back to Tutorials')}
      </button>

      <div>
        <h2 className="text-2xl font-bold text-[#F5F1E7] mb-2">{tutorial.title}</h2>
        <p className="text-[#D7C9B2]/80">{tutorial.description}</p>
      </div>

      <div className="space-y-6">
        {tutorial.sections?.map((section, idx) => (
          <div key={idx} className="border-l-2 border-[rgba(180,140,75,0.3)] pl-4">
            <h3 className="text-lg font-semibold text-[#F5F1E7] mb-2">{section.heading}</h3>
            <p className="text-[#D7C9B2]/80 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}