import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ArrowLeft, Check, X, Sparkles, 
  Camera, Search, Star, Users, ChevronRight, Leaf, HelpCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from 'react-i18next';
const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/d2be37fcd_IMG_4833.jpeg';

export default function OnboardingFlow({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const {t} = useTranslation()
  const steps = [
    {
      title: t("onboarding.welcomeTitle"),
      description: t("onboarding.welcomeDescription"),
      icon: PIPE_ICON,
      content: (
        <div className="space-y-4 text-center">
          <img 
            src={PIPE_ICON}
            alt="PipeKeeper"
            className="w-24 h-24 mx-auto object-contain mix-blend-multiply"
          />
          <p className="text-[#E0D8C8]/70 text-lg">
            {t("onboarding.welcomeBody")}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-6 text-left">
            <Card>
              <CardContent className="p-4">
                <Camera className="w-6 h-6 text-amber-400 mb-2" />
                <h4 className="font-semibold text-sm">{t("onboarding.photoIDTitle")}</h4>
                <p className="text-xs text-[#E0D8C8]/70">{t("onboarding.photoIDDesc")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Search className="w-6 h-6 text-emerald-400 mb-2" />
                <h4 className="font-semibold text-sm">{t("onboarding.aiSearchTitle")}</h4>
                <p className="text-xs text-[#E0D8C8]/70">{t("onboarding.aiSearchDesc")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Star className="w-6 h-6 text-violet-400 mb-2" />
                <h4 className="font-semibold text-sm">{t("onboarding.pairingsTitle")}</h4>
                <p className="text-xs text-[#E0D8C8]/70">{t("onboarding.pairingsDesc")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Sparkles className="w-6 h-6 text-blue-400 mb-2" />
                <h4 className="font-semibold text-sm">{t("onboarding.optimizeTitle")}</h4>
                <p className="text-xs text-[#E0D8C8]/70">{t("onboarding.optimizeDesc")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: t("onboarding.preferencesTitle"),
      description: t("onboarding.preferencesDescription"),
      icon: Users,
      content: (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("onboarding.userProfile")}
              </h4>
              <p className="text-[#E0D8C8]/70 mb-4">
                {t("onboarding.userProfileDesc")}
              </p>
              <ul className="space-y-2 text-sm text-[#E0D8C8]/70">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{t("onboarding.profileItem1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{t("onboarding.profileItem2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{t("onboarding.profileItem3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{t("onboarding.profileItem4")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{t("onboarding.profileItem5")}</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  {t("onboarding.profileTip")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: t("onboarding.priorityTitle"),
      description: t("onboarding.priorityDescription"),
      icon: Star,
      content: (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                   <Badge className="bg-amber-600 text-white shrink-0">1</Badge>
                   <div>
                     <h4 className="font-semibold">{t("onboarding.priorityProfileTitle")}</h4>
                     <p className="text-sm text-[#E0D8C8]/70">
                       {t("onboarding.priorityProfileDesc")}
                     </p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Badge className="bg-amber-500 text-white shrink-0">2</Badge>
                   <div>
                     <h4 className="font-semibold">{t("onboarding.priorityPipeFocusTitle")}</h4>
                     <p className="text-sm text-[#E0D8C8]/70">
                       {t("onboarding.priorityPipeFocusDesc")}
                     </p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Badge className="bg-slate-500 text-white shrink-0">3</Badge>
                   <div>
                     <h4 className="font-semibold">{t("onboarding.priorityPipeCharsTitle")}</h4>
                     <p className="text-sm text-[#E0D8C8]/70">
                       {t("onboarding.priorityPipeCharsDesc")}
                     </p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Badge className="bg-slate-400 text-white shrink-0">4</Badge>
                   <div>
                     <h4 className="font-semibold">{t("onboarding.priorityBlendCharsTitle")}</h4>
                     <p className="text-sm text-[#E0D8C8]/70">
                       {t("onboarding.priorityBlendCharsDesc")}
                     </p>
                   </div>
                 </div>
               </div>
               <div className="mt-6 p-4 rounded-lg border border-[#E0D8C8]/15 bg-[#1A2B3A]/50">
                 <p className="text-sm font-medium mb-2">
                   {t("onboarding.personalizationTitle")}
                 </p>
                 <p className="text-xs text-[#E0D8C8]/70">
                   {t("onboarding.personalizationDesc")}
                 </p>
               </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: t("onboarding.helpTitle"),
      description: t("onboarding.helpDescription"),
      icon: HelpCircle,
      content: (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{t("onboarding.helpSectionTitle")}</h4>
                    <p className="text-sm text-[#E0D8C8]/70 mb-3">
                      {t("onboarding.helpSectionDesc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 ml-13 pl-4 border-l-2 border-[#E0D8C8]/20">
                  <div>
                    <h5 className="font-medium text-sm mb-1">{t("onboarding.faqTitle")}</h5>
                    <p className="text-xs text-[#E0D8C8]/70">
                      {t("onboarding.faqDesc")}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm mb-1">{t("onboarding.howToTitle")}</h5>
                    <p className="text-xs text-[#E0D8C8]/70">
                      {t("onboarding.howToDesc")}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm mb-1">{t("onboarding.troubleshootingTitle")}</h5>
                    <p className="text-xs text-[#E0D8C8]/70">
                      {t("onboarding.troubleshootingDesc")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    {t("onboarding.helpTip")}
                    </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: t("onboarding.featuresTitle"),
      description: t("onboarding.featuresDescription"),
      icon: Sparkles,
      content: (
        <div className="space-y-3">
          <Card className="hover:border-amber-300/30 transition-colors">
             <CardContent className="p-4">
               <div className="flex items-start gap-3">
                 <Camera className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
                 <div>
                   <h4 className="font-semibold">{t("onboarding.feature1Title")}</h4>
                   <p className="text-sm text-[#E0D8C8]/70">
                     {t("onboarding.feature1Desc")}
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="hover:border-emerald-300/30 transition-colors">
             <CardContent className="p-4">
               <div className="flex items-start gap-3">
                 <Search className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
                 <div>
                   <h4 className="font-semibold">{t("onboarding.feature2Title")}</h4>
                   <p className="text-sm text-[#E0D8C8]/70">
                     {t("onboarding.feature2Desc")}
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="hover:border-violet-300/30 transition-colors">
             <CardContent className="p-4">
               <div className="flex items-start gap-3">
                 <Star className="w-6 h-6 text-violet-400 shrink-0 mt-1" />
                 <div>
                   <h4 className="font-semibold">{t("onboarding.feature3Title")}</h4>
                   <p className="text-sm text-[#E0D8C8]/70">
                     {t("onboarding.feature3Desc")}
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="hover:border-blue-300/30 transition-colors">
             <CardContent className="p-4">
               <div className="flex items-start gap-3">
                 <Sparkles className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                 <div>
                   <h4 className="font-semibold">{t("onboarding.feature4Title")}</h4>
                   <p className="text-sm text-[#E0D8C8]/70">
                     {t("onboarding.feature4Desc")}
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="hover:border-purple-300/30 transition-colors">
             <CardContent className="p-4">
               <div className="flex items-start gap-3">
                 <Leaf className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
                 <div>
                   <h4 className="font-semibold">{t("onboarding.feature5Title")}</h4>
                   <p className="text-sm text-[#E0D8C8]/70">
                     {t("onboarding.feature5Desc")}
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>
      )
    },
    {
      title: t("onboarding.readyTitle"),
      description: t("onboarding.readyDescription"),
      icon: Check,
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
            <Check className="w-10 h-10 text-amber-700" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">{t("onboarding.allSetTitle")}</h3>
             <p className="text-[#E0D8C8]/70">
               {t("onboarding.allSetDesc")}
             </p>
          </div>
          <div className="grid gap-3 max-w-md mx-auto">
            <Button 
               className="w-full justify-between group"
               onClick={() => { onComplete(); navigate(createPageUrl('Profile')); }}
             >
              <span>{t("onboarding.setupProfile")}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-between group"
              onClick={() => { onComplete(); navigate(createPageUrl('Pipes')); }}
            >
              <span>{t("onboarding.addPipes")}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-between group"
              onClick={() => { onComplete(); navigate(createPageUrl('Tobacco')); }}
            >
              <span>{t("onboarding.addTobacco")}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="min-h-screen w-full flex items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="shadow-2xl">
            <CardHeader className="border-b border-[#E0D8C8]/15">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentStep 
                          ? 'w-8 bg-amber-600' 
                          : idx < currentStep 
                          ? 'w-2 bg-amber-400' 
                          : 'w-2 bg-[#E0D8C8]/20'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-[#E0D8C8]/60 hover:text-[#E0D8C8]"
                >
                  {t("onboarding.skip")} <X className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <CardTitle className="text-xl sm:text-2xl">{currentStepData.title}</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {currentStepData.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 max-h-[60vh] sm:max-h-none overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStepData.content}
                </motion.div>
              </AnimatePresence>
            </CardContent>
            <div className="p-4 sm:p-6 border-t border-[#E0D8C8]/15 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                size="sm"
                className="sm:size-default"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("common.back")}</span>
              </Button>
              <div className="text-xs sm:text-sm text-[#E0D8C8]/60">
                {currentStep + 1}/{steps.length}
              </div>
              <Button
                onClick={handleNext}
                size="sm"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <span className="hidden sm:inline">{t("onboarding.getStarted")}</span>
                    <span className="sm:hidden">{t("onboarding.start")}</span>
                    <Check className="w-4 h-4 sm:ml-2" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">{t("common.next")}</span>
                    <ArrowRight className="w-4 h-4 sm:ml-2" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}