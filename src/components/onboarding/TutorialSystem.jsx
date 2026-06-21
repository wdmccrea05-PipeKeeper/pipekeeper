import React, { useState, useEffect } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useNavigate } from "@/components/utils/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { safeLocalStorage, safeSetLocalStorage } from "@/components/utils/safeOperations";

export default function TutorialSystem({ user, pipes = [], blends = [], forceTutorial = false, onTutorialClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Determine if tutorial should show
  useEffect(() => {
    if (!user?.email) return;

    // Force show if called from FAQ
    if (forceTutorial) {
      setIsVisible(true);
      setCurrentStep(0);
      return;
    }

    // Check if user has skipped tutorial
    const skipKey = `pk_quickstart_skipped_${user.email}`;
    const completeKey = `pk_quickstart_completed_${user.email}`;
    const hasSkipped = safeLocalStorage(skipKey) === 'true';
    const hasCompleted = safeLocalStorage(completeKey) === 'true';

    // Show tutorial ONLY on first login (user created today)
    const isNewAccount = user?.created_date ? 
      new Date(user.created_date).toDateString() === new Date().toDateString() 
      : false;

    // Show tutorial if: user is brand new (created today), hasn't skipped, and hasn't completed
    if (isNewAccount && !hasSkipped && !hasCompleted) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [user?.email, user?.created_date, forceTutorial]);

  const steps = [
    {
      id: "add-pipe",
      title: t("tutorial.quickstart.steps.addPipe.title"),
      description: t("tutorial.quickstart.steps.addPipe.description"),
      content: t("tutorial.quickstart.steps.addPipe.content"),
      tip: t("tutorial.quickstart.steps.addPipe.tip"),
      action: () => {
        navigate(createPageUrl("Pipes?action=add"));
      },
      actionLabel: t("common.next"),
    },
    {
      id: "add-tobacco",
      title: t("tutorial.quickstart.steps.addTobacco.title"),
      description: t("tutorial.quickstart.steps.addTobacco.description"),
      content: t("tutorial.quickstart.steps.addTobacco.content"),
      tip: t("tutorial.quickstart.steps.addTobacco.tip"),
      action: () => {
        navigate(createPageUrl("Tobacco?action=add"));
      },
      actionLabel: t("common.next"),
    },
    {
      id: "log-session",
      title: t("tutorial.quickstart.steps.logSession.title"),
      description: t("tutorial.quickstart.steps.logSession.description"),
      content: t("tutorial.quickstart.steps.logSession.content"),
      tip: t("tutorial.quickstart.steps.logSession.tip"),
      action: () => {
        setIsVisible(false);
        onTutorialClose?.();
      },
      actionLabel: t("common.done"),
    },
  ];

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gradient-to-br from-[#2a1f18] to-[#1f1510] rounded-2xl border border-[rgba(140,105,65,0.35)] overflow-hidden shadow-2xl">
        {/* Header with step indicator */}
        <div 
          className="px-8 py-6 border-b border-[rgba(140,105,65,0.25)]"
          style={{ background: "linear-gradient(135deg, rgba(60,45,25,0.5), rgba(50,35,20,0.7))" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-[#D8C7A6]/70 mb-2">
                {t("tutorial.quickstart.title")} · {currentStep + 1} {t("common.of")} {steps.length}
              </div>
              <h2 className="text-2xl font-bold text-[#F5F1E7] mb-1">{step.title}</h2>
              <p className="text-sm text-[#D8C7A6]/80">{step.description}</p>
            </div>
            <button
              onClick={() => {
                if (user?.email) {
                  safeSetLocalStorage(`pk_quickstart_skipped_${user.email}`, 'true');
                }
                setIsVisible(false);
                onTutorialClose?.();
              }}
              className="text-[#D8C7A6]/60 hover:text-[#F5F1E7] transition-colors text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-6">
          <p className="text-base leading-relaxed text-[#D8C7A6]/90">{step.content}</p>
          
          {step.tip && (
            <div 
              className="p-4 rounded-lg border border-[rgba(180,140,75,0.3)]"
              style={{ background: "linear-gradient(135deg, rgba(80,60,35,0.3), rgba(60,45,25,0.5))" }}
            >
              <p className="text-sm text-[#D8C7A6]/85">
                <span className="font-semibold text-[#D8C7A6]">{t("common.tip")}</span> {step.tip}
              </p>
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div 
          className="px-8 py-6 flex items-center justify-between border-t border-[rgba(140,105,65,0.25)]"
          style={{ background: "linear-gradient(135deg, rgba(50,35,20,0.4), rgba(40,28,18,0.6))" }}
        >
          {/* Progress dots */}
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep 
                    ? 'bg-[#D8C7A6] w-6' 
                    : 'bg-[#D8C7A6]/30 hover:bg-[#D8C7A6]/50'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="border-[rgba(140,105,65,0.35)] text-[#F5F1E7] gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("common.back")}
              </Button>
            )}
            <Button
              onClick={() => {
                if (currentStep < steps.length - 1) {
                  step.action?.();
                  // Increment after action completes
                  requestAnimationFrame(() => setCurrentStep(currentStep + 1));
                } else {
                  step.action?.();
                  if (user?.email) {
                    safeSetLocalStorage(`pk_quickstart_completed_${user.email}`, 'true');
                  }
                }
              }}
              className="bg-amber-700 hover:bg-amber-600 text-[#F5F1E7] gap-1"
            >
              {step.actionLabel}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}