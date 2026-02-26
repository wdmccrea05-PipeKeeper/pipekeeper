import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SupportFull() {
  const { t } = useTranslation();
  
  const SUPPORT_TOPICS = [
    t("supportFull.topicGeneral"),
    t("supportFull.topicAccount"),
    t("supportFull.topicFeature"),
    t("supportFull.topicError"),
    t("supportFull.topicBilling"),
    t("supportFull.topicTechnical"),
    t("supportFull.topicOther")
  ];
  const [formData, setFormData] = useState({
    topic: "",
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const emailBody = `
New Support Request from PipeKeeper

Topic: ${formData.topic}
From: ${formData.name}
Email: ${formData.email}
User Account: ${user?.email || 'Not logged in'}

Message:
${formData.message}
      `;

      await base44.integrations.Core.SendEmail({
        to: 'admin@pipekeeperapp.com',
        subject: `PipeKeeper Support - ${formData.topic}`,
        body: emailBody,
        from_name: 'PipeKeeper Support'
      });

      setSubmitted(true);
      setFormData({ topic: "", name: "", email: "", message: "" });
    } catch (error) {
      console.error('Support email error:', error);
      alert(`Failed to send support request: ${error?.message || 'Unknown error'}. Please try again or email admin@pipekeeperapp.com directly.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a href={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("supportFull.backToHome","Back to Home")}
            </Button>
          </a>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">{t("supportFull.requestSubmitted","Request Submitted!")}</h2>
              <p className="text-green-700 mb-6">
                {t("supportFull.thankYou","Thank you for contacting us. We'll get back to you as soon as possible.")}
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline">
                {t("supportFull.submitAnother","Submit Another Request")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("supportFull.backToHome","Back to Home")}
          </Button>
        </a>

        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-3xl text-[#E0D8C8] flex items-center gap-3">
              <Mail className="w-8 h-8 text-[#A35C5C]" />
              {t("supportFull.contactSupport","Contact Support")}
            </CardTitle>
            <CardDescription className="text-[#E0D8C8]/80">
              {t("supportFull.description","Have a question or need help? Send us a message and we'll get back to you soon.")}
            </CardDescription>
            <div className="mt-4 p-4 bg-[#A35C5C]/10 border border-[#A35C5C]/30 rounded-lg">
              <h3 className="font-semibold text-[#E0D8C8] mb-2">{t("supportFull.emailVerifIssues","Email Verification Issues?")}</h3>
              <p className="text-sm text-[#E0D8C8]/70 mb-3">
                {t("supportFull.verificationHelp","If you're having trouble with email verification or can't log in, please contact us directly at:")}
              </p>
              <a
                href="mailto:admin@pipekeeperapp.com"
                className="block text-center px-4 py-2 bg-[#A35C5C] text-[#E0D8C8] rounded-lg hover:bg-[#8F4E4E] transition-colors font-semibold"
              >
                {t("supportFull.adminEmail","admin@pipekeeperapp.com")}
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="topic" className="text-[#E0D8C8] font-medium">
                  {t("supportFull.whatCanWeHelp","What can we help you with?")} *
                </Label>
                <Select
                  value={formData.topic}
                  onValueChange={(value) => setFormData({ ...formData, topic: value })}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={t("supportFull.selectTopic","Select a topic...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_TOPICS.map(topic => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name" className="text-[#E0D8C8] font-medium">
                  {t("supportFull.yourName","Your Name")} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("supportFull.namePlaceholder","John Doe")}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-[#E0D8C8] font-medium">
                  {t("supportFull.yourEmail","Your Email")} *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("supportFull.emailPlaceholder","john@example.com")}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-[#E0D8C8] font-medium">
                  {t("supportFull.message","Message")} *
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t("supportFull.messagePlaceholder","Please describe your question or issue in detail...")}
                  className="mt-2 min-h-[150px]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.topic || !formData.name || !formData.email || !formData.message}
                className="w-full bg-[#8b3a3a] hover:bg-[#6d2e2e]"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSubmitting ? t("supportFull.sending","Sending...") : t("supportFull.sendMessage","Send Message")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <a href={createPageUrl('BulkLogoUpload')} className="text-sm text-amber-400 hover:text-amber-300 underline">
            {t("supportFull.bulkLogoLink","→ Bulk Logo Upload Tool")}
          </a>
        </div>
      </div>
    </div>
  );
}