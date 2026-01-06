import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft, Mail, UserPlus, CheckCircle, X } from "lucide-react";

export default function InvitePage() {
  const [emailFields, setEmailFields] = useState(['']);
  const [personalMessage, setPersonalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const addEmailField = () => {
    setEmailFields([...emailFields, '']);
  };

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
      
      for (const email of validEmails) {
        const emailBody = `
Hello!

${user?.full_name || 'A friend'} has invited you to join PipeKeeper - the ultimate app for managing your pipe and tobacco collection.

${personalMessage ? `Personal message:\n${personalMessage}\n\n` : ''}

PipeKeeper helps you:
• Catalog your pipes and tobacco blends
• Track smoking sessions and preferences
• Get AI-powered pairing recommendations
• Identify pipes and estimate values
• Optimize your collection

Invitation link: https://base44.com/invite?ref=pipekeeper

Happy piping!
The PipeKeeper Team
        `;

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `${user?.full_name || 'Your friend'} invited you to PipeKeeper`,
          body: emailBody,
          from_name: 'PipeKeeper'
        });
      }

      setSubmitted(true);
      setEmailFields(['']);
      setPersonalMessage('');
    } catch (error) {
      alert('Failed to send invitations. Please try again.');
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
              Back to Home
            </Button>
          </a>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">Invitations Sent!</h2>
              <p className="text-green-700 mb-6">
                Your friends will receive their invitation emails shortly.
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Invite More Friends
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
            Back to Home
          </Button>
        </a>

        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-3xl text-stone-900 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-[#8b3a3a]" />
              Invite Friends to PipeKeeper
            </CardTitle>
            <CardDescription className="text-stone-600">
              Share PipeKeeper with fellow pipe enthusiasts and build your community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="text-stone-700 font-medium mb-2 block">
                  Friend's Email Addresses *
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
                      />
                      {emailFields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeEmailField(index)}
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
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Another Email
                </Button>
              </div>

              <div>
                <Label htmlFor="message" className="text-stone-700 font-medium">
                  Personal Message (Optional)
                </Label>
                <Textarea
                  id="message"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Add a personal note to your invitation..."
                  className="mt-2 min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || emailFields.every(email => email.trim() === '')}
                className="w-full bg-[#8b3a3a] hover:bg-[#6d2e2e]"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Sending Invitations...' : 'Send Invitations'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}