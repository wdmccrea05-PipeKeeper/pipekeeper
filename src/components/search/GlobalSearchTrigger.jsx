import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function GlobalSearchTrigger() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const items = useMemo(() => [
    { label: t('search.sectionPipes'), href: '/Pipes' },
    { label: t('search.sectionTobacco'), href: '/Tobacco' },
    { label: t('search.actionViewStats'), href: '/Insights' },
    { label: t('search.actionExportData'), href: '/Reports' },
    { label: t('search.actionAddPipe'), href: '/PipeForm' },
    { label: t('search.actionAddBlend'), href: '/TobaccoForm' },
  ], [t]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('search.openAria')}
        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
      >
        <Search className="h-4 w-4" />
        <span className="truncate">{t('search.trigger')}</span>
        <span className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">⌘ K</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t('search.commandInputPlaceholder')} />
        <CommandList>
          <CommandEmpty>
            <div className="p-4">
              <div className="text-sm font-medium">{t('search.noResultsFound')}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t('search.noResultsMessage')}</div>
            </div>
          </CommandEmpty>
          <CommandGroup heading={t('search.sectionQuickActions')}>
            {items.map((item) => (
              <CommandItem key={item.href} value={item.label} onSelect={() => {
                setOpen(false);
                navigate(item.href);
              }}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
