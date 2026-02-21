import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, Leaf, FileText, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { cn } from '@/lib/utils';
import { useTranslation } from "@/components/i18n/safeTranslation";

const PIPE_ICON = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

export default function GlobalSearchCommand({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load all pipes and blends
  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes-search'],
    queryFn: () => base44.entities.Pipe.list('-updated_date', 500),
    staleTime: 60000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends-search'],
    queryFn: () => base44.entities.TobaccoBlend.list('-updated_date', 500),
    staleTime: 60000,
  });

  // Fuzzy search function
  const fuzzyMatch = (str, pattern) => {
    if (!str || !pattern) return false;
    const strLower = str.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Direct substring match gets priority
    if (strLower.includes(patternLower)) return true;
    
    // Fuzzy match for typos
    let patternIdx = 0;
    for (let i = 0; i < strLower.length && patternIdx < patternLower.length; i++) {
      if (strLower[i] === patternLower[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === patternLower.length;
  };

  // Search results
  const results = React.useMemo(() => {
    if (!query.trim()) return [];

    const pipeResults = pipes
      .filter(p => 
        fuzzyMatch(p.name, query) || 
        fuzzyMatch(p.maker, query) || 
        fuzzyMatch(p.shape, query) ||
        p.focus?.some(f => fuzzyMatch(f, query))
      )
      .slice(0, 8)
      .map(p => ({
        type: 'pipe',
        id: p.id,
        title: p.name,
        subtitle: [p.maker, p.shape].filter(Boolean).join(' • '),
        icon: PIPE_ICON,
        favorite: p.is_favorite,
        url: createPageUrl('PipeDetail') + `?id=${p.id}`
      }));

    const blendResults = blends
      .filter(b => 
        fuzzyMatch(b.name, query) || 
        fuzzyMatch(b.manufacturer, query) || 
        fuzzyMatch(b.blend_type, query) ||
        b.flavor_notes?.some(f => fuzzyMatch(f, query))
      )
      .slice(0, 8)
      .map(b => ({
        type: 'blend',
        id: b.id,
        title: b.name,
        subtitle: [b.manufacturer, b.blend_type].filter(Boolean).join(' • '),
        icon: b.logo || null,
        favorite: b.is_favorite,
        url: createPageUrl('TobaccoDetail') + `?id=${b.id}`
      }));

    return [...pipeResults, ...blendResults];
  }, [query, pipes, blends]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selected]) {
        e.preventDefault();
        navigate(results[selected].url);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selected, navigate, onClose]);

  // Reset selection when query changes
  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="w-5 h-5 text-stone-400 mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.hintSubtitle", "Search pipes, tobacco, makers, shapes, and more")}
            className="border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-96">
          {results.length === 0 && query.trim() && (
            <div className="p-8 text-center text-stone-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("common.noResults", "No results found")} "{query}"</p>
            </div>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="p-8 text-center text-stone-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="mb-2">{t("search.hintTitle", "Start typing to search")}</p>
              <p className="text-sm">{t("search.hintSubtitle", "Search pipes, tobacco, makers, shapes, and more")}</p>
            </div>
          )}

          <div className="py-2">
            {results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => {
                  navigate(result.url);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-100 transition-colors",
                  selected === idx && "bg-stone-100"
                )}
              >
                <div className="w-10 h-10 rounded-lg border border-stone-200 bg-white flex items-center justify-center flex-shrink-0">
                  {result.icon ? (
                    <img 
                      src={result.icon} 
                      alt="" 
                      className="w-8 h-8 object-contain"
                      style={result.type === 'pipe' ? { filter: 'brightness(0)' } : {}}
                    />
                  ) : result.type === 'pipe' ? (
                    <img 
                      src={PIPE_ICON} 
                      alt="" 
                      className="w-8 h-8 object-contain"
                      style={{ filter: 'brightness(0)' }}
                    />
                  ) : (
                    <Leaf className="w-5 h-5 text-stone-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900">{result.title}</p>
                    {result.favorite && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                  </div>
                  {result.subtitle && (
                    <p className="text-sm text-stone-500">{result.subtitle}</p>
                  )}
                </div>
                <span className="text-xs text-stone-400 uppercase tracking-wide">
                  {result.type}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded">↑↓</kbd>
              {t("search.kbdNavigate", "Navigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded">↵</kbd>
              {t("search.kbdSelect", "Select")}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded">Esc</kbd>
            {t("search.kbdClose", "Close")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}