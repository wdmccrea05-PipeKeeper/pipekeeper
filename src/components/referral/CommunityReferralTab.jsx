/**
 * CommunityReferralTab
 * Available to ALL authenticated users — not gated to paid subscribers.
 * Free users can earn referral-earned access by inviting friends who become paid subscribers.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { UserPlus, X, Mail, Gift, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import ReferralSharePanel from '@/components/referral/ReferralSharePanel';
import ReferralStats from '@/components/referral/ReferralStats';
import ReferralProgressBar from '@/components/referral/ReferralProgressBar';
import ReferralRewardCards from '@/components/referral/ReferralRewardCards';
import ReferralModuleSelector from '@/components/referral/ReferralModuleSelector';

const cardStyle = {
  background: 'linear-gradient(145deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))',
  border: '1px solid rgba(180,140,75,0.18)',
  borderRadius: '1rem',
};

export default function CommunityReferralTab() {
  const { user, hasPaid, isLoading } = useCurrentUser();
  const [program, setProgram] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [earnedAccess, setEarnedAccess] = useState([]);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [emailFields, setEmailFields] = useState(['']);
  const [personalMessage, setPersonalMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingProgram(true);
    try {
      const [programRes, rewardsRes] = await Promise.all([
        base44.functions.invoke('getOrCreateReferralProgram', {}),
        base44.functions.invoke('getReferralRewards', {}),
      ]);
      setProgram(programRes?.data?.program || null);
      setRewards(rewardsRes?.data?.rewards || []);
      setEarnedAccess(rewardsRes?.data?.earnedAccess || []);
    } catch {
      toast.error('Failed to load referral data');
    } finally {
      setLoadingProgram(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user?.id]);

  const handleSendInvites = async (e) => {
    e.preventDefault();
    const validEmails = emailFields.filter(e => e.trim());
    if (!validEmails.length || !program?.referral_code) return;

    setSending(true);
    try {
      const res = await base44.functions.invoke('sendReferralInvite', {
        emails: validEmails,
        personalMessage,
        referralCode: program.referral_code,
      });
      const data = res?.data;
      const sent = data?.sent || 0;
      const errors = (data?.results || []).filter(r => !r.ok);

      if (sent > 0) {
        toast.success(`${sent} invite${sent !== 1 ? 's' : ''} sent!`);
        setEmailFields(['']);
        setPersonalMessage('');
        setShowInviteForm(false);
        await loadData();
      }

      for (const err of errors) {
        if (err.error === 'already_user') toast.info(`${err.email} is already a member`);
        else if (err.error === 'self_referral') toast.error('You cannot refer yourself');
        else if (err.error !== 'invalid email') toast.warning(`${err.email}: ${err.error}`);
      }
    } catch {
      toast.error('Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  if (isLoading || loadingProgram) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin" />
      </div>
    );
  }

  // Pending module selection records (free users who earned access but haven't chosen a module yet)
  const pendingAccess = earnedAccess.filter(a => a.status === 'pending_module_selection');
  const activeEarnedAccess = earnedAccess.filter(a => a.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#F5F1E7]" style={{ fontFamily: 'Georgia, serif' }}>
          Refer a Friend
        </h2>
        <p className="text-[#E0D8C8]/60 text-sm mt-1">
          {hasPaid
            ? 'Earn free months when friends you invite become paid subscribers.'
            : 'Invite friends who subscribe — earn free module access, even as a free user.'}
        </p>
      </div>

      {/* How it works */}
      <div className="p-5 rounded-2xl" style={cardStyle}>
        <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide mb-3">How it works</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { step: '1', text: 'Share your personal link' },
            { step: '2', text: 'Friend signs up and subscribes' },
            { step: '3', text: hasPaid ? 'You earn 1 free module month' : 'You earn 1 free module month — no subscription required' },
          ].map(item => (
            <div key={item.step} className="space-y-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center mx-auto text-sm font-bold"
                style={{ background: 'rgba(212,165,116,0.15)', color: '#D4A574' }}>
                {item.step}
              </div>
              <p className="text-xs text-[#E0D8C8]/70">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 text-center">
          <p className="text-xs text-[#E0D8C8]/40">1 qualified referral = 1 free module month</p>
          <p className="text-xs text-[#E0D8C8]/40">12 qualified referrals = 1 free module year</p>
          {!hasPaid && (
            <p className="text-xs text-[#D4A574]/70 mt-2">
              Free users: earned access lets you pick one module to unlock for the reward period.
            </p>
          )}
        </div>
      </div>

      {/* Pending module selection — banner for free users who've earned access */}
      {pendingAccess.length > 0 && (
        <div className="p-5 rounded-2xl space-y-4"
          style={{ ...cardStyle, borderColor: 'rgba(212,165,116,0.45)', background: 'linear-gradient(145deg, rgba(44,32,14,0.98), rgba(27,20,10,0.98))' }}>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#D4A574]" />
            <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide">
              You have {pendingAccess.length} unclaimed reward{pendingAccess.length > 1 ? 's' : ''}
            </h3>
          </div>
          <p className="text-xs text-[#E0D8C8]/60">Choose a module to unlock your earned free access.</p>
          <ReferralModuleSelector
            accessRecord={pendingAccess[0]}
            onActivated={() => loadData()}
          />
        </div>
      )}

      {/* Active earned access banner */}
      {activeEarnedAccess.map(access => (
        <div key={access.id} className="p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(46,125,92,0.12)', border: '1px solid rgba(46,125,92,0.3)' }}>
          <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-300">
              Referral-earned {access.module} access active
            </p>
            <p className="text-xs text-emerald-300/60">
              Expires {access.end_at ? new Date(access.end_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      ))}

      {/* Stats */}
      <ReferralStats program={program} />

      {/* Share panel */}
      <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
        <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide">Your Referral Link</h3>
        <ReferralSharePanel program={program} onInviteClick={() => setShowInviteForm(true)} />
      </div>

      {/* Progress */}
      <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
        <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide">Your Progress</h3>
        <ReferralProgressBar program={program} />
      </div>

      {/* Reward history */}
      {rewards.length > 0 && (
        <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
          <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide">Your Rewards</h3>
          <ReferralRewardCards rewards={rewards} earnedAccess={earnedAccess} onRefresh={loadData} />
        </div>
      )}

      {/* Inline invite form */}
      {showInviteForm && (
        <div className="p-5 rounded-2xl space-y-4" style={{ ...cardStyle, borderColor: 'rgba(163,92,92,0.35)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#F5F1E7]">Send Email Invites</h3>
            <button onClick={() => setShowInviteForm(false)} className="text-[#E0D8C8]/40 hover:text-[#E0D8C8]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSendInvites} className="space-y-4">
            <div className="space-y-2">
              {emailFields.map((email, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={e => {
                      const next = [...emailFields];
                      next[idx] = e.target.value;
                      setEmailFields(next);
                    }}
                    placeholder="friend@example.com"
                    className="bg-white/5 border-white/10 text-[#F5F1E7] placeholder:text-[#E0D8C8]/30"
                  />
                  {emailFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="text-[#E0D8C8]/40"
                      onClick={() => setEmailFields(emailFields.filter((_, i) => i !== idx))}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" className="text-[#E0D8C8]/50 text-xs gap-1"
                onClick={() => setEmailFields([...emailFields, ''])}>
                <UserPlus className="w-3.5 h-3.5" /> Add another
              </Button>
            </div>
            <Textarea
              value={personalMessage}
              onChange={e => setPersonalMessage(e.target.value)}
              placeholder="Add a personal note (optional)"
              className="min-h-[80px] bg-white/5 border-white/10 text-[#F5F1E7] placeholder:text-[#E0D8C8]/30"
            />
            <Button
              type="submit"
              disabled={sending || emailFields.every(e => !e.trim())}
              className="w-full gap-2"
              style={{ background: '#A35C5C', color: '#fff' }}
            >
              <Mail className="w-4 h-4" />
              {sending ? 'Sending…' : 'Send Invites with My Referral Link'}
            </Button>
          </form>
        </div>
      )}

      <p className="text-xs text-[#E0D8C8]/30 text-center pb-4">
        Rewards are granted after a referred friend completes a paid subscription. Self-referrals and duplicate accounts do not qualify.
      </p>
    </div>
  );
}