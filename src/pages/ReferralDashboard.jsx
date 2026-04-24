/**
 * ReferralDashboard - subscriber referral program page
 * Shows referral link, invite form, stats, and progress toward rewards.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { ArrowLeft, UserPlus, X, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import ReferralSharePanel from '@/components/referral/ReferralSharePanel';
import ReferralStats from '@/components/referral/ReferralStats';
import ReferralProgressBar from '@/components/referral/ReferralProgressBar';
import ReferralRewardCards from '@/components/referral/ReferralRewardCards';
import { Link } from 'react-router-dom';

export default function ReferralDashboard() {
  const { user, hasPaid, isLoading } = useCurrentUser();
  const [program, setProgram] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [emailFields, setEmailFields] = useState(['']);
  const [personalMessage, setPersonalMessage] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    if (!hasPaid) { setLoadingProgram(false); return; }
    setLoadingProgram(true);
    try {
      const [programRes, rewardsRes] = await Promise.all([
        base44.functions.invoke('getOrCreateReferralProgram', {}),
        base44.functions.invoke('getReferralRewards', {}),
      ]);
      setProgram(programRes?.data?.program || null);
      setRewards(rewardsRes?.data?.rewards || []);
    } catch {
      toast.error('Failed to load referral data');
    } finally {
      setLoadingProgram(false);
    }
  }, [hasPaid]);

  useEffect(() => {
    if (isLoading || !user) return;
    loadData();
  }, [user, hasPaid, isLoading, loadData]);

  const handleSendInvites = async (e) => {
    e.preventDefault();
    const validEmails = emailFields.filter(e => e.trim());
    if (!validEmails.length || !program?.referral_code) return;

    setSending(true);
    try {
      const res = await base44.functions.invoke('sendReferralInvite', {
        emails: validEmails,
        personalMessage,
        module: selectedModule,
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
        // Refresh program stats
        await loadData();
      }

      for (const err of errors) {
        if (err.error === 'already_user') toast.info(`${err.email} is already a member`);
        else if (err.error === 'self_referral') toast.error('You cannot refer yourself');
        else if (err.error !== 'invalid email') toast.warning(`${err.email}: ${err.error}`);
      }
    } catch (err) {
      toast.error('Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  if (isLoading || loadingProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#140f0c' }}>
        <div className="w-8 h-8 border-4 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin" />
      </div>
    );
  }

  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))',
    border: '1px solid rgba(180,140,75,0.18)',
    borderRadius: '1rem',
  };

  // Not a subscriber — show locked state
  if (!hasPaid) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#140f0c' }}>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Link to="/CollectionHub">
            <Button variant="ghost" className="text-[#E0D8C8]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <div className="p-10 text-center rounded-2xl" style={cardStyle}>
            <Lock className="w-12 h-12 mx-auto mb-4 text-[#E0D8C8]/30" />
            <h2 className="text-xl font-bold text-[#F5F1E7] mb-2">Referrals are for subscribers</h2>
            <p className="text-[#E0D8C8]/60 text-sm mb-6">
              Subscribe to CollectionKeeper to get your personal referral link and start earning free months.
            </p>
            <Link to="/Subscription">
              <Button style={{ background: '#A35C5C', color: '#fff' }}>View Plans</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#140f0c' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/CollectionHub">
            <Button variant="ghost" className="text-[#E0D8C8]">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#F5F1E7]" style={{ fontFamily: 'Georgia, serif' }}>
            Refer a Friend
          </h1>
          <p className="text-[#E0D8C8]/60 text-sm mt-1">
            Earn free months when friends you invite become paid subscribers.
          </p>
        </div>

        {/* How it works */}
        <div className="p-5 rounded-2xl" style={cardStyle}>
          <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide mb-3">How it works</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { step: '1', text: 'Share your personal link' },
              { step: '2', text: 'Friend signs up and subscribes' },
              { step: '3', text: 'You earn 1 free month' },
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
          <p className="text-xs text-[#E0D8C8]/40 text-center mt-3">
            12 qualified referrals = 1 free year
          </p>
        </div>

        {/* Stats */}
        <ReferralStats program={program} />

        {/* Share panel */}
        <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
          <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide">Your Referral Link</h3>
          <ReferralSharePanel
            program={program}
            onInviteClick={() => setShowInviteForm(true)}
          />
        </div>

        {/* Progress toward milestones */}
        <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
          <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide">Your Progress</h3>
          <ReferralProgressBar program={program} />
        </div>

        {/* Reward history */}
        {rewards.length > 0 && (
          <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
            <h3 className="text-sm font-semibold text-[#D4A574] uppercase tracking-wide">Your Rewards</h3>
            <ReferralRewardCards rewards={rewards} onRefresh={loadData} />
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
    </div>
  );
}