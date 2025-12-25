import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ArrowLeft, Check, X, Sparkles, 
  Camera, Search, Star, Users, ChevronRight
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/021ed482a_smoking-pipe-silhouette-vintage-accessories-icon-sign-and-symbol-tobacco-pipe-illustration-vector.jpg';

export default function OnboardingFlow({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to PipeKeeper",
      description: "Your intelligent pipe & tobacco collection manager",
      icon: PIPE_ICON,
      content: (
        <div className="space-y-4 text-center">
          <img 
            src={PIPE_ICON}
            alt="PipeKeeper"
            className="w-24 h-24 mx-auto object-contain mix-blend-multiply"
          />
          <p className="text-stone-600 text-lg">
            Manage your collection with AI-powered features for identification, 
            valuation, and personalized tobacco pairing recommendations.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-6 text-left">
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <Camera className="w-6 h-6 text-amber-600 mb-2" />
                <h4 className="font-semibold text-amber-900 text-sm">Photo ID</h4>
                <p className="text-xs text-amber-700">Identify pipes from photos</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <Search className="w-6 h-6 text-emerald-600 mb-2" />
                <h4 className="font-semibold text-emerald-900 text-sm">AI Search</h4>
                <p className="text-xs text-emerald-700">Auto-fill details from web</p>
              </CardContent>
            </Card>
            <Card className="bg-violet-50 border-violet-200">
              <CardContent className="p-4">
                <Star className="w-6 h-6 text-violet-600 mb-2" />
                <h4 className="font-semibold text-violet-900 text-sm">Pairings</h4>
                <p className="text-xs text-violet-700">Match pipes with tobacco</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <Sparkles className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-semibold text-blue-900 text-sm">Optimize</h4>
                <p className="text-xs text-blue-700">Get collection insights</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      title: "Set Your Preferences",
      description: "Tell us about your smoking style for personalized recommendations",
      icon: Users,
      content: (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
            <CardContent className="p-6">
              <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Profile
              </h4>
              <p className="text-stone-600 mb-4">
                Create your smoking profile to get personalized recommendations based on:
              </p>
              <ul className="space-y-2 text-sm text-stone-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Preferred tobacco blend types (Virginia, English, Aromatic, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Strength preference (Mild to Full)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Pipe size and shape preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Smoking session duration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Clenching style</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 Your profile influences all AI recommendations with highest priority
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: "Recommendation Priority",
      description: "How PipeKeeper ranks tobacco pairings",
      icon: Star,
      content: (
        <div className="space-y-4">
          <Card className="border-stone-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge className="bg-amber-600 text-white shrink-0">1</Badge>
                  <div>
                    <h4 className="font-semibold text-stone-900">Your Profile Preferences</h4>
                    <p className="text-sm text-stone-600">
                      Highest priority. Recommendations favor your preferred blend types and strengths.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="bg-amber-500 text-white shrink-0">2</Badge>
                  <div>
                    <h4 className="font-semibold text-stone-900">Pipe Focus</h4>
                    <p className="text-sm text-stone-600">
                      If you designate a pipe for specific blends (e.g., "English", "Aromatic"), 
                      matches are heavily prioritized.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="bg-stone-500 text-white shrink-0">3</Badge>
                  <div>
                    <h4 className="font-semibold text-stone-900">Pipe Characteristics</h4>
                    <p className="text-sm text-stone-600">
                      Bowl size, shape, material, and chamber volume determine which blends smoke best.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="bg-stone-400 text-white shrink-0">4</Badge>
                  <div>
                    <h4 className="font-semibold text-stone-900">Blend Characteristics</h4>
                    <p className="text-sm text-stone-600">
                      Cut, strength, and flavor profile of the tobacco.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900 font-medium mb-2">
                  ✨ Personalization in Action
                </p>
                <p className="text-xs text-amber-800">
                  A pipe with "English" focus + your preference for English blends = 
                  maximum boost (+3.5 points). Scores are saved and only update when you request.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: "Key Features",
      description: "Everything you can do with PipeKeeper",
      icon: Sparkles,
      content: (
        <div className="space-y-3">
          <Card className="border-stone-200 hover:border-amber-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Camera className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-stone-900">Photo Identification</h4>
                  <p className="text-sm text-stone-600">
                    Upload stamping photos and let AI identify maker, era, and authenticity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 hover:border-emerald-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Search className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-stone-900">Market Valuation</h4>
                  <p className="text-sm text-stone-600">
                    AI-powered price lookups from recent sales and market data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 hover:border-violet-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Star className="w-6 h-6 text-violet-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-stone-900">Tobacco Matching</h4>
                  <p className="text-sm text-stone-600">
                    Get personalized blend recommendations for each pipe
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 hover:border-blue-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-stone-900">Collection Optimization</h4>
                  <p className="text-sm text-stone-600">
                    Analyze your collection for gaps and get recommendations for your next pipe
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: "Ready to Start",
      description: "Begin building your collection",
      icon: Check,
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
            <Check className="w-10 h-10 text-amber-700" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">You're All Set!</h3>
            <p className="text-stone-600">
              Start by adding your first pipe or tobacco blend. 
              Visit your Profile page to set your smoking preferences.
            </p>
          </div>
          <div className="grid gap-3 max-w-md mx-auto">
            <Button 
              className="w-full bg-amber-700 hover:bg-amber-800 justify-between group"
              onClick={() => window.location.href = '/Profile'}
            >
              <span>Set Up Profile First</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-between group"
              onClick={() => window.location.href = '/Pipes'}
            >
              <span>Add Pipes</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-between group"
              onClick={() => window.location.href = '/Tobacco'}
            >
              <span>Add Tobacco</span>
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
          <Card className="border-stone-200 shadow-2xl">
            <CardHeader className="border-b border-stone-200">
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
                          : 'w-2 bg-stone-200'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-stone-500 hover:text-stone-700"
                >
                  Skip <X className="w-4 h-4 ml-1" />
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
            <div className="p-4 sm:p-6 border-t border-stone-200 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                size="sm"
                className="sm:size-default"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="text-xs sm:text-sm text-stone-500">
                {currentStep + 1}/{steps.length}
              </div>
              <Button
                onClick={handleNext}
                className="bg-amber-700 hover:bg-amber-800"
                size="sm"
                className="sm:size-default"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Start</span>
                    <Check className="w-4 h-4 sm:ml-2" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Next</span>
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