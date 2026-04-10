import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft, Mail, UserPlus, CheckCircle, X } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";

export default function InviteFull() {
  const { t } = useTranslation();
  const [emailFields, setEmailFields] = useState(['']);
  const [personalMessage, setPersonalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

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
        toast.error(t("inviteFull.invalidEmail", `Invalid email address: ${invalidEmails[0]}`));
        setIsSubmitting(false);
        return;
      }

      for (const email of validEmails) {
        const inviterName = user?.full_name || 'A CollectionKeeper member';
        const emailBody = `Hello,

${inviterName} has invited you to join CollectionKeeper — a purpose-built app for managing and understanding your pipe, tobacco, and whiskey collection.

This isn't just a catalog.

CollectionKeeper helps you:
- Track your pipes, blends, and bottles with precision
- Log sessions and tasting notes that inform future choices
- Understand what you own — what's redundant, what's missing, and what's worth revisiting
- Get intelligent pairing and session recommendations based on your actual collection

Get started here:
https://collectionkeeper.base44.app

If you enjoy the hobby, this gives you a clearer view of your rotation — and helps you get more out of what you already have.

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
    } catch (error) {
      toast.error(t("inviteFull.sendError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageWrapper = (children) => (
    <div className="min-h-screen" style={{ backgroundColor: '#140f0c' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6" style={{ color: '#E0D8C8' }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("inviteFull.backToHome")}
          </Button>
        </a>
        {children}
      </div>
    </div>
  );

  if (submitted) {
    return pageWrapper(
      <div className="rounded-2xl p-10 text-center" style={{
        background: 'linear-gradient(145deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))',
        border: '1px solid rgba(180,140,75,0.2)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}>
        <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: '#2e7d5c' }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          {t("inviteFull.successTitle")}
        </h2>
        <p className="mb-6" style={{ color: 'rgba(224,216,200,0.75)' }}>
          {t("inviteFull.successMessage")}
        </p>
        <Button onClick={() => setSubmitted(false)} style={{ background: '#A35C5C', color: '#fff' }}>
          {t("inviteFull.inviteMore")}
        </Button>
      </div>
    );
  }

  return pageWrapper(
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(145deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))',
      border: '1px solid rgba(180,140,75,0.18)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
    }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{
        borderBottomColor: 'rgba(180,140,75,0.15)',
        background: 'linear-gradient(to bottom, rgba(60,42,28,0.4), transparent)',
      }}>
        <div className="flex items-center gap-3 mb-1">
          <UserPlus className="w-7 h-7" style={{ color: '#D4A574' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Invite Friends to CollectionKeeper
          </h1>
        </div>
        <p style={{ color: 'rgba(224,216,200,0.7)' }}>
          Share CollectionKeeper with fellow collectors and help them discover a better way to manage their collection.
        </p>
      </div>

      {/* Form */}
      <div className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="font-medium mb-2 block" style={{ color: '#E0D8C8' }}>
              {t("inviteFull.emailLabel")} *
            </Label>
            <div className="space-y-3">
              {emailFields.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmailField(index, e.target.value)}
                    placeholder={t("inviteFull.emailPlaceholder")}
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
              {t("inviteFull.addAnother")}
            </Button>
          </div>

          <div>
            <Label htmlFor="message" className="font-medium" style={{ color: '#E0D8C8' }}>
              {t("inviteFull.personalMessage")}
            </Label>
            <Textarea
              id="message"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder={t("inviteFull.messagePlaceholder")}
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
            {isSubmitting ? t("inviteFull.sending") : t("inviteFull.sendInvitations")}
          </Button>
        </form>
      </div>
    </div>
  );
}