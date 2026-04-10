import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';

export default function ModuleSelectionModal({ onComplete, isOpen = true }) {
  const { saveModulePreferences, isLoading } = useModuleVisibility();
  const [selected, setSelected] = useState({ pipekeeper: false, whiskeykeeper: false });
  const [saving, setSaving] = useState(false);

  const handleToggle = (moduleId) => {
    setSelected((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleContinue = async () => {
    if (!selected.pipekeeper && !selected.whiskeykeeper) {
      toast.error('Please select at least one module');
      return;
    }

    setSaving(true);
    try {
      // Save module selections through canonical UserProfile path
      await saveModulePreferences(selected);
      toast.success('Modules configured successfully');
      // Pass selected modules to onComplete so OnboardingRouter can act on them
      onComplete?.(selected);
    } catch (error) {
      console.error('[ModuleSelection] Error:', error);
      toast.error('Failed to save module preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        className="max-w-2xl w-full rounded-2xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(42,30,20,0.98), rgba(28,18,12,0.98))',
          border: '1px solid rgba(180,140,75,0.2)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        <h2 className="text-2xl font-bold mb-2 text-[#F5F1E7]">Welcome to CollectionKeeper</h2>
        <p className="text-sm text-[#E0D8C8]/70 mb-6">
          Choose which collection modules you'd like to start with. You can enable or upgrade these anytime.
        </p>

        <div className="space-y-3 mb-8">
          {/* PipeKeeper */}
          <button
            onClick={() => handleToggle('pipekeeper')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected.pipekeeper ? 'bg-stone-800/60 border-[#D4A574]' : 'bg-stone-800/20 border-stone-700'}`}
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selected.pipekeeper}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggle('pipekeeper');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 mt-1 cursor-pointer"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-[#F5F1E7] flex items-center gap-2">
                  <img
                    src={MODULE_ICONS.pipekeeper}
                    alt="PipeKeeper"
                    className="w-5 h-5 object-contain"
                  />
                  PipeKeeper
                </h3>
                <p className="text-xs text-[#E0D8C8]/60 mt-1">
                  Organize and track your pipe and tobacco collection. Free tier: 5 pipes, 10 blends.
                </p>
              </div>
              <Badge className="flex-shrink-0 bg-green-900/30 text-green-300 border-0 text-xs">
                Free
              </Badge>
            </div>
          </button>

          {/* WhiskeyKeeper */}
          <button
            onClick={() => handleToggle('whiskeykeeper')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected.whiskeykeeper ? 'bg-stone-800/60 border-[#D4A574]' : 'bg-stone-800/20 border-stone-700'}`}
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selected.whiskeykeeper}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggle('whiskeykeeper');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 mt-1 cursor-pointer"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-[#F5F1E7] flex items-center gap-2">
                  <img
                    src={MODULE_ICONS.whiskeykeeper}
                    alt="WhiskeyKeeper"
                    className="w-5 h-5 object-contain"
                  />
                  WhiskeyKeeper
                </h3>
                <p className="text-xs text-[#E0D8C8]/60 mt-1">
                  Track your whiskey collection with tasting notes and inventory. Free tier: 10 bottles.
                </p>
              </div>
              <Badge className="flex-shrink-0 bg-green-900/30 text-green-300 border-0 text-xs">
                Free
              </Badge>
            </div>
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={() => onComplete?.()}
            disabled={saving}
            className="text-[#E0D8C8]"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={saving || (!selected.pipekeeper && !selected.whiskeykeeper)}
            className="bg-[#A35C5C] hover:bg-[#8F4E4E]"
          >
            {saving ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }) {
  return <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>{children}</span>;
}