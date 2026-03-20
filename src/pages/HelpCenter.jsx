import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { BookOpen, MessageSquare, AlertCircle, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TutorialSelector from '@/components/help/TutorialSelector';
import DocumentationSearch from '@/components/help/DocumentationSearch';
import SelfDiagnosticPanel from '@/components/help/SelfDiagnosticPanel';
import AiHelpAssistant from '@/components/help/AiHelpAssistant';

export default function HelpCenter() {
  const { t } = useTranslation();
  const { user, subscription } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('tutorials');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,58,30,0.18),transparent_28%),linear-gradient(180deg,#140f0b_0%,#0b0908_100%)]">
      <div className="max-w-[1000px] mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#F5F1E7] mb-2">
            {t('help.center', 'Help Center')}
          </h1>
          <p className="text-[#D7C9B2]/80 mb-6">
            {t('help.centerDesc', 'Tutorials, documentation, and support for CollectionKeeper')}
          </p>

          {/* Quick Search */}
          <div className="max-w-md mx-auto mb-8">
            <DocumentationSearch />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-[rgba(20,15,10,0.5)] border border-[rgba(180,140,75,0.15)]">
            <TabsTrigger value="tutorials" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t('help.tutorials', 'Tutorials')}</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{t('help.search', 'Search')}</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{t('help.ai', 'AI Help')}</span>
            </TabsTrigger>
            <TabsTrigger value="diagnostic" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('help.diagnostic', 'Diagnostic')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-6">
            <Card className="border-[rgba(180,140,75,0.15)] bg-gradient-to-br from-[#2a1f18] to-[#1f1510]">
              <CardHeader>
                <CardTitle className="text-[#F5F1E7]">
                  {t('help.moduleAwareTutorials', 'Module-Specific Tutorials')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user && subscription ? (
                  <TutorialSelector user={user} subscription={subscription} />
                ) : (
                  <p className="text-[#D7C9B2]/70">
                    {t('help.loginForTutorials', 'Sign in to access personalized tutorials')}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[rgba(180,140,75,0.15)] bg-gradient-to-br from-[#2a1f18] to-[#1f1510]">
              <CardHeader>
                <CardTitle className="text-[#F5F1E7]">
                  {t('help.quickLinks', 'Quick Links')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={createPageUrl('HowTo')}>
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('help.howToGuides', 'How-To Guides')}
                  </Button>
                </Link>
                <Link to={createPageUrl('FAQFull')}>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('help.faq', 'FAQ')}
                  </Button>
                </Link>
                <Link to={createPageUrl('TroubleshootingFull')}>
                  <Button variant="outline" className="w-full justify-start">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {t('help.troubleshooting', 'Troubleshooting')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-6">
            <Card className="border-[rgba(180,140,75,0.15)] bg-gradient-to-br from-[#2a1f18] to-[#1f1510]">
              <CardHeader>
                <CardTitle className="text-[#F5F1E7]">
                  {t('help.searchDocumentation', 'Search Documentation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentationSearch fullPage />
                <p className="text-xs text-[#D7C9B2]/50 mt-3">
                  {t('help.searchTip', 'Search across tutorials, features, and how-to guides')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Help Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card className="border-[rgba(180,140,75,0.15)] bg-gradient-to-br from-[#2a1f18] to-[#1f1510]">
              <CardHeader>
                <CardTitle className="text-[#F5F1E7]">
                  {t('help.aiAssistant', 'AI Help Assistant')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AiHelpAssistant />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnostic Tab */}
          <TabsContent value="diagnostic" className="space-y-6">
            <Card className="border-[rgba(180,140,75,0.15)] bg-gradient-to-br from-[#2a1f18] to-[#1f1510]">
              <CardHeader>
                <CardTitle className="text-[#F5F1E7]">
                  {t('help.systemDiagnostic', 'System Diagnostic')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SelfDiagnosticPanel />
                <div className="mt-6 p-4 rounded-lg bg-[rgba(100,150,200,0.05)] border border-[rgba(100,150,200,0.2)]">
                  <p className="text-sm text-[#D7C9B2]/80">
                    {t('help.diagnosticInfo', 'The diagnostic system checks for common issues like stale data, cached UI, outdated insights, and missing pairing regeneration. Run the diagnostic to identify and fix problems automatically.')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}