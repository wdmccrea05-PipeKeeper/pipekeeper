import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { cn } from '@/lib/utils';
import { isAppleBuild } from '@/components/utils/appVariant';
import { useTranslation } from 'react-i18next';

const CHECKLIST_KEY = 'pk_quickstart_dismissed';

export default function QuickStartChecklist({ pipes, blends, hasNotes, hasViewedInsights }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(CHECKLIST_KEY);
    setDismissed(isDismissed === 'true');
  }, []);

  const items = [
    { id: 'pipe', label: t("quickStart.addPipe"), done: pipes.length > 0, url: createPageUrl('Pipes') },
    { id: 'cellar', label: isAppleBuild ? t("quickStart.addCellarItem") : t("quickStart.addBlend"), done: blends.length > 0, url: createPageUrl('Tobacco') },
    { id: 'note', label: t("quickStart.addNote"), done: hasNotes, url: pipes.length > 0 ? createPageUrl(`PipeDetail?id=${pipes[0]?.id}`) : createPageUrl('Pipes') },
    { id: 'insights', label: t("quickStart.viewInsights"), done: hasViewedInsights, url: createPageUrl('Home') },
  ];

  const completedCount = items.filter(i => i.done).length;
  const allComplete = completedCount === items.length;

  // Auto-hide when all complete
  useEffect(() => {
    if (allComplete && !dismissed) {
      const timer = setTimeout(() => {
        localStorage.setItem(CHECKLIST_KEY, 'true');
        setDismissed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(CHECKLIST_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed || allComplete) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="bg-gradient-to-br from-[#1A2B3A]/60 to-[#112133]/60 border-[#A35C5C]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-[#E0D8C8]">{t("quickStart.title")}</CardTitle>
                <p className="text-sm text-[#E0D8C8]/60 mt-1">{t("quickStart.progress", { completed: completedCount, total: items.length })}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-[#E0D8C8]/50 hover:text-[#E0D8C8] transition-colors"
                aria-label="Dismiss checklist"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-all",
                  item.done 
                    ? "opacity-60" 
                    : "hover:bg-white/5 cursor-pointer"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-[#E0D8C8]/30 shrink-0" />
                )}
                <span className={cn(
                  "text-sm",
                  item.done ? "text-[#E0D8C8]/50 line-through" : "text-[#E0D8C8]"
                )}>
                  {item.label}
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}