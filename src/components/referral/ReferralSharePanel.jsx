/**
 * ReferralSharePanel
 * Shows the user's referral link, copy/share actions, and module-aware links.
 */
import React, { useState } from 'react';
import { Copy, Check, Share2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const MODULE_OPTIONS = [
  { key: null, label: 'General' },
  { key: 'pipekeeper', label: 'PipeKeeper' },
  { key: 'whiskeykeeper', label: 'WhiskeyKeeper' },
  { key: 'cigarkeeper', label: 'CigarKeeper' },
];

export default function ReferralSharePanel({ program, onInviteClick }) {
  const [selectedModule, setSelectedModule] = useState(null);
  const [copied, setCopied] = useState(false);

  const APP_URL = 'https://collectionkeeper.base44.app';
  const baseLink = `${APP_URL}?ref=${program?.referral_code}`;
  const shareLink = selectedModule ? `${baseLink}&m=${selectedModule}` : baseLink;

  // Track referrer-side share actions (copy / share) as their own counter,
  // not as funnel ReferralEvent rows.
  const trackShare = (channel) => {
    if (!program?.referral_code) return;
    base44.functions.invoke('trackReferralClick', {
      referralCode: program.referral_code,
      module: selectedModule,
      channel,
    }).catch(() => {});
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
    trackShare('copy'); // increments links_copied on program
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CollectionKeeper',
          text: 'I use CollectionKeeper to manage my collection — you should check it out.',
          url: shareLink,
        });
        trackShare('share'); // increments shares_opened on program
      } catch {
        // User dismissed native share — do not track dismissed action
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-4">
      {/* Module selector */}
      <div>
        <p className="text-xs text-[#E0D8C8]/60 mb-2 uppercase tracking-wide">Invite for a specific module</p>
        <div className="flex flex-wrap gap-2">
          {MODULE_OPTIONS.map(opt => (
            <button
              key={opt.key || 'general'}
              onClick={() => setSelectedModule(opt.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedModule === opt.key
                  ? 'border-[#D4A574] bg-[#D4A574]/15 text-[#D4A574]'
                  : 'border-white/10 text-[#E0D8C8]/60 hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Link display */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/[0.03]">
        <span className="flex-1 text-xs text-[#E0D8C8]/70 font-mono truncate">{shareLink}</span>
        <button
          onClick={copyLink}
          className="shrink-0 p-1.5 rounded hover:bg-white/10 text-[#D4A574] transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onInviteClick}
          className="flex-1 gap-2 text-sm"
          style={{ background: '#A35C5C', color: '#fff' }}
        >
          <Mail className="w-4 h-4" />
          Send Email Invite
        </Button>
        <Button
          onClick={nativeShare}
          variant="outline"
          className="gap-2 text-sm border-white/10 text-[#E0D8C8] hover:bg-white/10"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>

      <p className="text-xs text-[#E0D8C8]/40 text-center">
        Your code: <span className="font-mono text-[#D4A574]">{program?.referral_code}</span>
      </p>
    </div>
  );
}