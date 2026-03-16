import React, { useMemo, useState } from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { detectActiveModules, getRecommendedTutorials } from './moduleDetection';
import { getModuleDocumentation } from './documentationRegistry';
import TutorialViewer from './TutorialViewer';

export default function TutorialSelector({ user, subscription }) {
  const { t } = useTranslation();
  const [selectedTutorial, setSelectedTutorial] = useState(null);

  const activeModules = useMemo(() => {
    return detectActiveModules(user, subscription);
  }, [user, subscription]);

  const recommendedTutorials = useMemo(() => {
    return getRecommendedTutorials(activeModules);
  }, [activeModules]);

  if (selectedTutorial) {
    return (
      <TutorialViewer
        moduleId={selectedTutorial.module}
        tutorialId={selectedTutorial.id}
        onBack={() => setSelectedTutorial(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#F5F1E7] mb-2 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('help.tutorials', 'Available Tutorials')}
        </h3>
        <p className="text-sm text-[#D7C9B2]/70">
          {t('help.tutorialsDesc', 'Learn about features available in your subscription')}
        </p>
      </div>

      <div className="space-y-3">
        {recommendedTutorials.map((tutorial) => (
          <button
            key={`${tutorial.module}-${tutorial.id}`}
            onClick={() => setSelectedTutorial(tutorial)}
            className="w-full text-left p-4 rounded-lg border border-[rgba(180,140,75,0.2)] bg-[rgba(180,140,75,0.05)] hover:bg-[rgba(180,140,75,0.1)] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-[#F5F1E7] group-hover:text-[#FFE5C9] transition-colors">
                  {tutorial.title}
                </h4>
                <p className="text-xs text-[#D7C9B2]/60 mt-1">
                  {tutorial.module.charAt(0).toUpperCase() + tutorial.module.slice(1)}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#D7C9B2]/40 group-hover:text-[#D7C9B2] transition-colors flex-shrink-0 ml-2" />
            </div>
          </button>
        ))}
      </div>

      {recommendedTutorials.length === 0 && (
        <p className="text-sm text-[#D7C9B2]/70 text-center py-4">
          {t('help.noTutorialsAvailable', 'No tutorials available for your subscription')}
        </p>
      )}
    </div>
  );
}