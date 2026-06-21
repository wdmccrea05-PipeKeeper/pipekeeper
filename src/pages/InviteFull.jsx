/**
 * InviteFull — upgraded to use referral-tracked invites.
 * Loads the user's ReferralProgram, sends tracked emails via sendReferralInvite.
 * Falls back to generic invite if not a paid subscriber.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, UserPlus, CheckCircle, X, Gift } from "lucide-react";
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { REFERRAL_BASE_URL } from '@/lib/config/referralConfig';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function InviteFull() {
  const { t } = useTranslation();
  const { user, hasPaid, isLoading } = useCurrentUser();
  const [emailFields, setEmailFields] = useState(['']);
  const [personalMessage, setPersonalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [program, setProgram] = useState(null);

  // Load referral program for paid subscribers
  useEffect(() => {
    if (isLoading || !user || !hasPaid) return;
    base44.functions.invoke('getOrCreateReferralProgram', {})
      .then(res => setProgram(res?.data?.program || null))
      .catch(() => null);
  }, [user, hasPaid, isLoading]);

  const addEmailField = () => setEmailFields([...emailFields, '']);

  const removeEmailField = (index) => {
    setEmailFields(emailFields.filter((_, i) => i !== index));
  };

  const updateEmailField = (index, value) => {
    const newFields = [...emailFields];
    newFields[index] = value;
    setEmailFields(newFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validEmails = emailFields.filter(email => email.trim() !== '');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = validEmails.filter(email => !emailRegex.test(email.trim()));
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email address: ${invalidEmails[0]}`);
        setIsSubmitting(false);
        return;
      }

      if (hasPaid && program?.referral_code) {
        // Use referral-tracked invite
        const res = await base44.functions.invoke('sendReferralInvite', {
          emails: validEmails,
          personalMessage,
          referralCode: program.referral_code,
        });
        const data = res?.data;
        const sent = data?.sent || 0;
        const errors = (data?.results || []).filter(r => !r.ok);

        for (const err of errors) {
          if (err.error === 'already_user') toast.info(`${err.email} is already a member`);
          else if (err.error === 'self_referral') toast.error(t("auto.pages_InviteFull.you_cannot_refer_yourself_5p9ab6"));
        }

        if (sent > 0) {
          setSubmitted(true);
          setEmailFields(['']);
          setPersonalMessage('');
        } else if (errors.length > 0) {
          toast.error(t("auto.pages_InviteFull.no_invites_were_sent_please_check_1yzzje"));
        }
      } else {
        // Fallback: generic invite (non-subscriber)
        const inviterName = user?.full_name || 'A CollectionKeeper member';
        for (const email of validEmails) {
          const emailBody = `Hello,

${inviterName} has invited you to join CollectionKeeper — a purpose-built app for managing and understanding your pipe, tobacco, and whiskey collection.

Get started here:
${REFERRAL_BASE_URL}

Welcome aboard,
The CollectionKeeper Team

If you didn't expect this invitation, you can safely ignore this email.`;

          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `You've been invited to CollectionKeeper`,
            body: emailBody,
            from_name: 'CollectionKeeper'
          });
        }
        setSubmitted(true);
        setEmailFields(['']);
        setPersonalMessage('');
      }
    } catch (error) {
      toast.error(t("auto.pages_InviteFull.failed_to_send_invites_please_try_1bgyis"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageWrapper = (children) => (
    <div className="min-h-screen" style={{ backgroundColor: '#140f0c' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-6 text-[#E0D8C8]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("auto.pages_InviteFull.back_to_home_cx6if6")}
          </Button>
        </Link>
        {children}
      </div>
    </div>
  );

  if (submitted) {
    return pageWrapper(
      <div className="rounded-2xl p-10 text-center" style={{
        background: 'linear-gradient(145deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))',
        border: '1px solid rgba(180,140,75,0.2)',
      }}>
        <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: '#2e7d5c' }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          {t("auto.pages_InviteFull.invites_sent_7ty4hu")}
        </h2>
        <p className="mb-2" style={{ color: 'rgba(224,216,200,0.75)' }}>
          {t("auto.pages_InviteFull.your_friends_will_receive_a_personalized_1mld3s")}
        </p>
        {hasPaid && (
          <p className="text-sm mb-6" style={{ color: 'rgba(212,165,116,0.75)' }}>
            {t("auto.pages_InviteFull.you_ll_earn_1_free_month_1w9bmu")}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={() => setSubmitted(false)} style={{ background: '#A35C5C', color: '#fff' }}>
            {t("auto.pages_InviteFull.invite_more_6fgfl3")}
          </Button>
          {hasPaid && (
            <Link to="/ReferralDashboard">
              <Button variant="outline" className="border-[#D4A574]/30 text-[#D4A574] gap-1">
                <Gift className="w-4 h-4" /> {t("auto.pages_InviteFull.view_rewards_qnax14")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return pageWrapper(
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(145deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))',
      border: '1px solid rgba(180,140,75,0.18)',
    }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ borderBottomColor: 'rgba(180,140,75,0.15)' }}>
        <div className="flex items-center gap-3 mb-1">
          <UserPlus className="w-7 h-7" style={{ color: '#D4A574' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {t("auto.pages_InviteFull.invite_friends_to_collectionkeeper_17dlar")}
          </h1>
        </div>
        <p style={{ color: 'rgba(224,216,200,0.7)' }}>
          {t("auto.pages_InviteFull.share_collectionkeeper_with_fellow_collectors_1a9h71")}{' '}
          {hasPaid && program && (
            <span style={{ color: '#D4A574' }}>
              {t("auto.pages_InviteFull.earn_1_free_month_for_every_5spokf")}
            </span>
          )}
        </p>
      </div>

      {/* Referral banner for paid subscribers */}
      {hasPaid && program && (
        <div className="px-8 py-3 border-b flex items-center justify-between gap-3"
          style={{ borderBottomColor: 'rgba(180,140,75,0.1)', background: 'rgba(212,165,116,0.06)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#D4A574' }}>
            <Gift className="w-4 h-4" />
            <span>{t("auto.pages_InviteFull.your_referral_code_1coavw")} <span className="font-mono font-bold">{program.referral_code}</span></span>
          </div>
          <Link to="/ReferralDashboard">
            <Button size="sm" variant="ghost" className="text-[#D4A574] text-xs gap-1 hover:bg-[#D4A574]/10">
              {t("auto.pages_InviteFull.view_dashboard_1x3168")}
            </Button>
          </Link>
        </div>
      )}

      {/* Form */}
      <div className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="font-medium mb-2 block" style={{ color: '#E0D8C8' }}>
              {t("auto.pages_InviteFull.email_addresses_kjemd1")}
            </Label>
            <div className="space-y-3">
              {emailFields.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmailField(index, e.target.value)}
                    placeholder="friend@example.com"
                    required
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] placeholder:text-[#E0D8C8]/40"
                  />
                  {emailFields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeEmailField(index)}
                      style={{ borderColor: 'rgba(180,140,75,0.2)', color: '#E0D8C8' }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmailField}
              className="mt-3"
              style={{ borderColor: 'rgba(180,140,75,0.25)', color: '#E0D8C8' }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t("auto.pages_InviteFull.add_another_16akfd")}
            </Button>
          </div>

          <div>
            <Label htmlFor="message" className="font-medium" style={{ color: '#E0D8C8' }}>
              {t("auto.pages_InviteFull.personal_message_optional_112ill")}
            </Label>
            <Textarea
              id="message"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder={t("auto.pages_InviteFull.add_a_personal_note_to_your_10dxpx")}
              className="mt-2 min-h-[120px] bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7] placeholder:text-[#E0D8C8]/40"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || emailFields.every(email => email.trim() === '')}
            className="w-full"
            style={{ background: '#A35C5C', color: '#fff' }}
          >
            <Mail className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Sending…' : hasPaid ? 'Send Referral Invites' : 'Send Invitations'}
          </Button>
        </form>
      </div>
    </div>
  );
}