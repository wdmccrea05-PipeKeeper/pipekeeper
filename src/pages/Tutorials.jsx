import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getModuleDocumentation, getAllDocumentedModules } from '@/components/help/documentationRegistry';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, HelpCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';

export default function TutorialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const moduleParam = useMemo(() => searchParams.get('module') || '', [searchParams]);
  const tutorialParam = useMemo(() => searchParams.get('tutorial') || '', [searchParams]);
  
  const allModules = useMemo(() => getAllDocumentedModules(), []);
  
  const docs = useMemo(() => {
    if (!moduleParam) return null;
    return getModuleDocumentation(moduleParam);
  }, [moduleParam]);
  
  const tutorial = useMemo(() => {
    if (!docs?.tutorials) return null;
    if (!tutorialParam) return docs.tutorials[0] || null;
    return docs.tutorials.find(t => t.id === tutorialParam) || docs.tutorials[0] || null;
  }, [docs, tutorialParam]);

  if (!tutorial || !docs) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" onClick={() => navigate(createPageUrl('HelpCenter'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold" style={{ color: '#F5F1E7' }}>
            {t('help.tutorials')}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allModules.map((module) => {
            const modDocs = getModuleDocumentation(module);
            if (!modDocs?.tutorials || modDocs.tutorials.length === 0) return null;
            
            const firstTutorial = modDocs.tutorials[0];
            const moduleTitle = {
              hub: t('nav.hub'),
              pipekeeper: t('nav.pipekeeper'),
              whiskeykeeper: t('nav.whiskeykeeper'),
              bundle: t('help.bundle'),
            }[module] || module;
            
            return (
              <button
                key={module}
                onClick={() => navigate(`/Tutorials?module=${module}&tutorial=${firstTutorial.id}`)}
                className="rounded-2xl p-6 text-left transition-all hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(42,31,24,0.6), rgba(31,21,16,0.8))',
                  border: '1px solid rgba(180,140,75,0.2)',
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <BookOpen className="w-5 h-5 flex-shrink-0" style={{ color: 'rgba(180,140,75,0.8)' }} />
                  <h3 style={{ color: '#F5F1E7' }} className="text-lg font-bold">
                    {moduleTitle}
                  </h3>
                </div>
                <p style={{ color: 'rgba(224,216,200,0.6)' }} className="text-sm">
                  {modDocs.tutorials.length} {modDocs.tutorials.length === 1 ? 'tutorial' : 'tutorials'}
                </p>
              </button>
            );
          })}
        </div>

        {allModules.length === 0 && (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.15)' }}>
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p style={{ color: 'rgba(224,216,200,0.5)' }}>{t('help.noTutorials')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="outline" onClick={() => navigate(createPageUrl('Tutorials'))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('help.allTutorials')}
        </Button>
      </div>

      <div>
        <h1 style={{ color: '#F5F1E7' }} className="text-3xl font-bold mb-2">
          {tutorial.title}
        </h1>
        <p style={{ color: 'rgba(224,216,200,0.65)' }} className="text-base">
          {tutorial.description}
        </p>
      </div>

      {docs.tutorials.length > 1 && (
        <div className="space-y-2">
          <p style={{ color: 'rgba(180,140,75,0.7)' }} className="text-xs uppercase tracking-wider font-semibold">
            {t('help.otherTutorials')}
          </p>
          <div className="flex flex-wrap gap-2">
            {docs.tutorials.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/Tutorials?module=${moduleParam}&tutorial=${t.id}`)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: t.id === tutorial.id ? 'rgba(163,92,92,0.3)' : 'rgba(180,140,75,0.1)',
                  border: `1px solid ${t.id === tutorial.id ? 'rgba(163,92,92,0.5)' : 'rgba(180,140,75,0.2)'}`,
                  color: t.id === tutorial.id ? '#F5F1E7' : 'rgba(224,216,200,0.7)',
                }}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {tutorial.sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h2 style={{ color: '#F5F1E7' }} className="text-xl font-bold">
              {section.heading}
            </h2>
            <p style={{ color: 'rgba(224,216,200,0.75)' }} className="text-base leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t" style={{ borderColor: 'rgba(180,140,75,0.15)' }}>
        <Button onClick={() => navigate(createPageUrl('HelpCenter'))} variant="outline">
          {t('help.backToHelp')}
        </Button>
      </div>
    </div>
  );
}