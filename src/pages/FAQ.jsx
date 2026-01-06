import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft, HelpCircle, Sparkles, Camera, DollarSign, Leaf, Smartphone, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FAQDownloadButton from "@/components/faq/FAQDownloadButton";
import { shouldShowPurchaseUI, isCompanionApp } from "@/components/utils/companion";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { useNavigate } from "react-router-dom";

export default function FAQPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canShowPurchaseUI = shouldShowPurchaseUI();
  const inCompanion = isCompanionApp();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const faqContent = [
    {
      title: 'Getting Started',
      items: [
        { question: 'How do I add my first pipe?', answer: 'Navigate to the Pipes page and click Add Pipe. You have three options: Quick Search & Add - Use AI to search for your pipe by maker and model. The system will auto-fill details. Photo Identification - Upload photos of stampings to identify the pipe automatically (Premium feature). Manual Entry - Fill in the form fields yourself with all the details you know.' },
        { question: 'How do I add tobacco blends?', answer: 'Go to the Tobacco page and click Add Blend. You can: Search - Type the blend name and let AI fetch all the details from the internet. Manual Entry - Add flavor notes, strength, cut type, and your personal ratings. Track inventory across Tins, Bulk, and Pouches with separate open/cellared amounts. Logos are automatically pulled from our library when you enter the manufacturer name.' },
        { question: 'What can I do with the onboarding tutorial?', answer: 'The onboarding tutorial walks you through PipeKeeper\'s main features including AI pairing recommendations, photo identification, value lookup, and collection optimization.' },
      ],
    },
    {
      title: 'Mobile & Installation',
      items: [
        { question: 'How do I install PipeKeeper on my phone?', answer: 'PipeKeeper can be installed on your mobile device for an app-like experience. iPhone/iPad (Safari): Open PipeKeeper in Safari, tap the Share button (square with arrow pointing up), select "Add to Home Screen", confirm by tapping "Add". Android (Chrome): Open PipeKeeper in Chrome, tap the three dots menu, select "Install app" or "Add to Home screen", confirm installation. Note: iPhone must use Safari browser, Android works best with Chrome.' },
        { 
          question: 'Is PipeKeeper available in the App Store or Google Play?', 
          answer: inCompanion 
            ? 'Yes — PipeKeeper is available as a companion app. The companion app is a secure web-container that displays the PipeKeeper experience.' 
            : 'PipeKeeper works as a web app and can also be installed to your home screen (PWA). Companion apps are also available for users who prefer a native wrapper.' 
        },
        { question: 'Can I use PipeKeeper offline?', answer: 'Once installed on your device, PipeKeeper caches your data so you can view your collection offline. Some features like AI search and photo identification require an internet connection, but basic browsing and editing work offline.' },
        { question: 'Will my data sync across devices?', answer: 'Yes! Your collection data is stored in the cloud and automatically syncs across all your devices. Log in with the same account on your phone, tablet, or computer to access your pipes and tobacco anywhere.' },
      ],
    },
    {
      title: 'AI Features (Premium)',
      items: [
        { question: 'How does tobacco pairing work?', answer: 'PipeKeeper uses AI to match your pipes with your tobacco blends based on pipe characteristics (shape, chamber size, material, smoking traits), blend properties (type, strength, cut, flavor profile), and your preferences saved in your profile for personalized recommendations. The pairing matrix on the home page shows your best matches with scores and reasoning. This is a Premium feature.' },
        { question: 'What is photo identification?', answer: 'Upload clear photos of your pipe\'s stampings, logos, or unique markings. Our AI will analyze them to identify the maker, model, approximate era, and provide market value estimates. This is a Premium feature available with a subscription.' },
        { question: 'How accurate is the value lookup?', answer: 'Value estimates are based on current market data, recent sales, condition, maker reputation, and rarity. They provide a good baseline but actual values may vary depending on buyer interest, specific features, and market conditions. Always verify with current listings or professional appraisers for important valuations. This is a Premium feature.' },
        { question: 'What is collection optimization?', answer: 'Collection Optimization analyzes your entire collection to suggest which blends each pipe should be specialized for, identify gaps or redundancies in your collection, recommend what collection changes to do next based on what you already have, and run "what-if" scenarios to see how a new pipe would fit. This Premium feature helps you build a well-rounded collection.' },
        { question: 'Can I dispute or modify optimization recommendations?', answer: 'Yes! Each pipe recommendation has a "Dispute / Add Info" button that lets you provide feedback. You can disagree with a suggested specialization and explain why, share additional context about how a pipe actually smokes, or provide your personal preferences for that specific pipe. After submitting feedback, the AI will re-analyze your collection taking your input into account and adjust its recommendations accordingly. This is a Premium feature.' },
        { question: 'What does "Specialized" vs "Versatility" mean for pipes?', answer: 'When you designate a pipe for specific blend types (its "focus"), it becomes Specialized and will show a "Specialized" badge instead of a versatility score. Specialized pipes are dedicated to specific tobacco types (like English blends or Virginias) and achieve much higher pairing scores (9-10) with those blends. Versatile pipes (rated on a 1-10 scale) can handle multiple blend types but won\'t achieve the same peak performance as a specialized pipe. The optimization system recommends specialization for maximum pairing scores - versatile pipes are good for variety, but specialized pipes are better for excellence.' },
      ],
    },
    {
      title: 'Managing Your Collection',
      items: [
        { question: 'What are pipe specializations and focus?', answer: 'You can designate specific blend types or tobacco categories for each pipe. This helps maintain flavor integrity and ensures optimal performance. For example, dedicate one pipe to Latakia blends and another to Virginias. The AI will suggest ideal specializations based on your pipe\'s characteristics.' },
        { question: 'How do I use the break-in schedule?', answer: 'For new pipes, the break-in schedule feature creates a custom plan to properly cake and season your pipe. It recommends which tobacco blends to use in what order, how many bowls to smoke at each stage, and when to increase or rotate blends. Track your progress directly in the pipe detail page and log sessions as you go.' },
        { question: 'Can I import my existing collection?', answer: 'Yes! Premium users can bulk import pipes and tobacco from CSV files. Download the template from the Import page, fill it with your data, and upload. The system will process and add everything to your collection automatically.' },
        { question: 'How do I track smoking sessions?', answer: 'Use the Smoking Log panel on the home page to record each session. Select the pipe and blend used, add notes, and track bowls smoked. This data helps the AI improve pairing recommendations and shows your usage patterns over time.' },
        { question: 'How do I bulk edit tobacco blends?', answer: 'On the Tobacco page, click the Quick Edit button to enter selection mode. Check the boxes next to the blends you want to update, or use "Select All" to choose all visible blends (filtered results). Then use the Quick Edit panel at the bottom to add quantity, change tin status, update ratings, or mark favorites for all selected blends at once.' },
      ],
    },
    {
      title: 'Understanding Fields',
      items: [
        { question: 'What do the pipe measurement fields mean?', answer: 'Length: Overall pipe length from stem tip to bowl bottom. Weight: Total weight of the assembled pipe. Bowl Height: Outer height of the bowl. Bowl Width: Outer diameter of the bowl at widest point. Chamber Diameter: Inner diameter of the tobacco chamber. Chamber Depth: How deep the tobacco chamber is. Chamber Volume: Overall size category (Small/Medium/Large/Extra Large). You can toggle between metric (mm, g) and imperial (inches, oz) units using the conversion button in the form.' },
        { question: 'What is the difference between bowl material and stem material?', answer: 'Bowl Material is what the tobacco chamber is made from (Briar, Meerschaum, Corncob, etc.). Stem Material is what the mouthpiece is made from (Vulcanite, Acrylic, Lucite, etc.). These affect the pipe\'s smoking characteristics, durability, and maintenance needs.' },
        { question: 'What are tobacco components?', answer: 'Tobacco components are the different types of leaf tobacco used in a blend. Common types include Virginia, Burley, Latakia, Perique, Oriental, and Cavendish. Most blends use 2-5 different components in varying proportions to create unique flavor profiles.' },
        { question: 'What does "aging potential" mean?', answer: 'Aging potential indicates how well a tobacco blend improves with storage over time. Blends high in Virginia tobacco typically age excellently, developing deeper flavors over years. Aromatic blends often don\'t age as well. This helps you decide which blends to cellar long-term.' },
      ],
    },
    {
      title: 'Account & Subscription',
      items: [
        { question: 'What\'s included in the free trial?', answer: 'New users get 7 days of full Premium access to try all features including AI pairing, photo identification, value lookup, collection optimization, bulk import, advanced reporting, insurance PDF generation, and automatic inventory tracking. After the trial, you can subscribe to continue using Premium features.' },
        { question: 'How much does Premium cost?', answer: 'PipeKeeper Premium is $1.99/month or $19.99/year (save 17% with annual billing). Both plans include all Premium features and automatic renewal until cancelled. You can cancel anytime from your Profile page.' },
        { question: 'What happens if I cancel my subscription?', answer: 'You\'ll keep Premium access until the end of your billing period. After that, Premium features will be locked but you\'ll still have access to your collection data and basic features. You can reactivate anytime to regain Premium access.' },
        {
          question: 'How do I cancel or manage my subscription?',
          answer: canShowPurchaseUI
            ? 'You can manage your subscription from your Profile page under the Subscription section. Use "Manage Subscription" to view billing details, update payment method, or cancel.'
            : 'Subscription purchases and management are not available in the companion app. If you already have Premium, sign in with the same account to access your features.'
        },
      ],
    },
    {
      title: 'Community & Sharing',
      items: [
        { question: 'What is the Community feature?', answer: 'The Community feature (Premium only) lets you connect with other pipe enthusiasts. You can create a public profile showcasing your collection, follow other collectors, comment on their pipes and tobacco blends, and discover new items through the community.' },
        { question: 'How do I make my profile public?', answer: 'Go to your Profile page from the navigation menu. Fill in your Display Name, Bio, and upload a profile picture. Check the box "Make my profile publicly searchable in Community". Click "Preview Profile" to see how it will look to others. When ready, click "Save Profile" and your profile will be public. You can make your profile private again at any time by unchecking the box.' },
        { question: 'What information is shared when I make my profile public?', answer: 'When your profile is public, other users can see: Your display name, bio, and profile picture; Your pipe collection (with photos and details); Your tobacco cellar (blends and information); Your smoking session logs. Not shared: Your email address, personal preferences (clenching, duration, etc.), estimated values, purchase prices, and any notes you\'ve marked as private.' },
        { question: 'How do I follow other users?', answer: 'Go to the Community page and use the "Discover Users" tab. You can search for users by name or browse public profiles. Click "Follow" on any profile you\'d like to follow. You can view all your followed users in the "Following" tab.' },
        { question: 'Can I disable comments on my collection?', answer: 'Yes! On your Profile page, you can uncheck "Allow comments on my pipes, tobacco, and logs" to disable commenting. You can toggle this on or off at any time.' },
        { question: 'How do I report inappropriate comments?', answer: 'If you see an inappropriate comment on any profile, click the flag icon next to the comment. You\'ll be asked to provide a reason for the report. All reports are reviewed, and action will be taken if the comment violates community guidelines.' },
        { question: 'Can I share my location to find local pipe enthusiasts?', answer: 'Yes! On your Profile page, you can optionally add: City, State/Province, Country, Zip/Postal Code. Check the box "Show my location publicly and allow others to find me by location" to opt-in. Your location will appear on your public profile, and other users can filter the Community directory by country and state to find nearby collectors. Privacy: Location sharing is completely optional. If you don\'t check the box, your location remains private even if you\'ve entered it.' },
        { question: 'What\'s the difference between Friends and Following?', answer: 'Friends: A mutual connection that requires both users to accept. Send a friend request, and if the other user accepts, you both become friends. Friends appear in your "Friends" tab. Following: A one-way connection where you can follow any public profile without their approval. Following lets you keep up with users whose collections interest you, even if they haven\'t added you as a friend. You can have both types of connections with the same user - be friends AND follow them.' },
        { question: 'How do I add friends?', answer: 'Go to the Community page and navigate to the "Discover" tab. Find a user you\'d like to be friends with (use search or location filters). Click "Add Friend" next to their profile. They\'ll receive a friend request in their "Friends" tab. Once they accept, you\'ll both appear in each other\'s friends list. You can view pending requests, accept incoming requests, and manage your friends in the "Friends" tab. A badge shows the number of pending requests waiting for your response.' },
        { question: 'How does instant messaging work?', answer: 'Instant messaging (Premium only) allows you to chat in real-time with friends. Both you and your friend must enable messaging in your Profile settings. You can see which friends are online (green dot), send instant messages, and if a friend is offline, messages are saved to their inbox. You can save important messages or delete unwanted ones. The system shows unread message counts and notifies you of new messages.' },
      ],
    },
  ];

  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status', user?.email],
    queryFn: async () => {
      const results = await base44.entities.OnboardingStatus.filter({ user_email: user?.email });
      return results[0];
    },
    enabled: !!user?.email,
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('OnboardingStatus', id, data, user?.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.email] });
      navigate(createPageUrl('Home'));
    },
  });

  const handleRestartTutorial = async () => {
    if (onboardingStatus) {
      await updateOnboardingMutation.mutateAsync({
        id: onboardingStatus.id,
        data: { completed: false, skipped: false, current_step: 0 }
      });
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </a>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">Help & FAQ</h1>
          <p className="text-[#e8d5b7]/70">Everything you need to know about PipeKeeper</p>
          <div className="mt-4">
            <FAQDownloadButton faqContent={faqContent} />
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-stone-800">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I add my first pipe?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>Navigate to the <strong>Pipes</strong> page and click <strong>Add Pipe</strong>. You have three options:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Quick Search & Add:</strong> Use AI to search for your pipe by maker and model. The system will auto-fill details.</li>
                    <li><strong>Photo Identification:</strong> Upload photos of stampings to identify the pipe automatically (Premium feature).</li>
                    <li><strong>Manual Entry:</strong> Fill in the form fields yourself with all the details you know.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>How do I add tobacco blends?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>Go to the <strong>Tobacco</strong> page and click <strong>Add Blend</strong>. You can:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Search:</strong> Type the blend name and let AI fetch all the details from the internet.</li>
                    <li><strong>Manual Entry:</strong> Add flavor notes, strength, cut type, and your personal ratings.</li>
                    <li><strong>Track Inventory:</strong> Use the Tins, Bulk, and Pouches tabs to track quantities separately with open and cellared amounts for each type.</li>
                  </ul>
                  <p>Logos are automatically pulled from our library when you enter the manufacturer name.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>What can I do with the onboarding tutorial?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-3">
                  <p>The onboarding tutorial walks you through PipeKeeper's main features including AI pairing recommendations, photo identification, value lookup, and collection optimization.</p>
                  {onboardingStatus && (
                    <Button
                      onClick={handleRestartTutorial}
                      disabled={updateOnboardingMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {updateOnboardingMutation.isPending ? 'Restarting...' : 'Restart Tutorial'}
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Mobile & Installation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-mobile-1">
                <AccordionTrigger>How do I install PipeKeeper on my phone?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-6">
                  <p className="font-medium">PipeKeeper can be installed on your mobile device for an app-like experience. Follow the step-by-step guide below for your device:</p>
                  
                  {/* iPhone Installation Guide */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border-2 border-blue-200">
                    <h4 className="font-bold text-blue-900 text-lg mb-4 flex items-center gap-2">
                      📱 iPhone / iPad Installation (Safari)
                    </h4>
                    
                    <div className="space-y-5">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Open PipeKeeper in Safari</p>
                          <p className="text-sm text-stone-600 mb-2">Make sure you're using Safari browser (not Chrome or others)</p>
                          <div className="bg-white/70 rounded-lg p-3 flex items-center justify-center">
                            <img 
                              src="https://developer.apple.com/assets/elements/icons/safari/safari-96x96_2x.png"
                              alt="Safari browser icon"
                              className="w-16 h-16"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Tap the Share Button</p>
                          <p className="text-sm text-stone-600 mb-2">Look at the bottom of Safari for the share icon (square with arrow pointing up)</p>
                          <div className="bg-white/70 rounded-lg p-3 flex items-center justify-center">
                            <svg className="w-16 h-16 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Select "Add to Home Screen"</p>
                          <p className="text-sm text-stone-600 mb-2">Scroll down in the menu and tap this option</p>
                          <div className="bg-white/70 rounded-lg p-3">
                            <div className="flex items-center gap-2 bg-blue-100 rounded-lg px-4 py-3 w-fit">
                              <span className="text-2xl">➕</span>
                              <span className="font-medium text-blue-900">Add to Home Screen</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">4</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Confirm Installation</p>
                          <p className="text-sm text-stone-600 mb-2">Tap "Add" in the top right corner</p>
                          <div className="bg-white/70 rounded-lg p-3">
                            <div className="bg-green-100 rounded-lg px-6 py-2 w-fit">
                              <span className="font-semibold text-green-900">Add</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                        <p className="text-green-800 font-medium flex items-center gap-2">
                          <span className="text-xl">✅</span>
                          Done! PipeKeeper will appear on your home screen
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Android Installation Guide */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border-2 border-green-200">
                    <h4 className="font-bold text-green-900 text-lg mb-4 flex items-center gap-2">
                      🤖 Android Installation (Chrome)
                    </h4>
                    
                    <div className="space-y-5">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">1</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Open PipeKeeper in Chrome</p>
                          <p className="text-sm text-stone-600 mb-2">Chrome browser works best for Android installation</p>
                          <div className="bg-white/70 rounded-lg p-3 flex items-center justify-center">
                            <img 
                              src="https://www.gstatic.com/images/branding/product/1x/chrome_96dp.png"
                              alt="Chrome browser icon"
                              className="w-16 h-16"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">2</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Open the Menu</p>
                          <p className="text-sm text-stone-600 mb-2">Tap the three dots (⋮) in the top right corner</p>
                          <div className="bg-white/70 rounded-lg p-3 flex items-center justify-center">
                            <span className="text-6xl text-green-700 font-light">⋮</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">3</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Select "Install app" or "Add to Home screen"</p>
                          <p className="text-sm text-stone-600 mb-3">You'll see one of these options in the menu</p>
                          <div className="bg-white/70 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 bg-green-100 rounded-lg px-4 py-3 w-fit">
                              <span className="text-2xl">📥</span>
                              <span className="font-medium text-green-900">Install app</span>
                            </div>
                            <p className="text-xs text-stone-500 text-center">or</p>
                            <div className="flex items-center gap-2 bg-green-100 rounded-lg px-4 py-3 w-fit">
                              <span className="text-2xl">➕</span>
                              <span className="font-medium text-green-900">Add to Home screen</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">4</div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800 mb-2">Confirm Installation</p>
                          <p className="text-sm text-stone-600 mb-2">A popup will appear - tap "Install" or "Add"</p>
                          <div className="bg-white/70 rounded-lg p-3">
                            <div className="bg-green-100 rounded-lg px-6 py-2 w-fit">
                              <span className="font-semibold text-green-900">Install</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                        <p className="text-green-800 font-medium flex items-center gap-2">
                          <span className="text-xl">✅</span>
                          Done! PipeKeeper icon will appear on your home screen
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting Tips */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <h5 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      💡 Troubleshooting Tips
                    </h5>
                    <ul className="space-y-2 text-sm text-amber-900">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span><strong>iPhone:</strong> Must use Safari browser - other browsers don't support PWA installation on iOS</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span><strong>Android:</strong> Chrome works best, but Firefox and Edge also support installation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>If you don't see the install option, try refreshing the page first</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>Once installed, the app works offline and loads faster than the browser version</span>
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-mobile-2">
                <AccordionTrigger>Is PipeKeeper available in the App Store or Google Play?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  {inCompanion ? (
                    <p>Yes — PipeKeeper is available as a companion app. The companion app is a secure web-container that displays the PipeKeeper experience.</p>
                  ) : (
                    <p>PipeKeeper works as a web app and can also be installed to your home screen (PWA). Companion apps are also available for users who prefer a native wrapper.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-mobile-3">
                <AccordionTrigger>Can I use PipeKeeper offline?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Once installed on your device, PipeKeeper caches your data so you can view your collection offline. Some features like AI search and photo identification require an internet connection, but basic browsing and editing work offline.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-mobile-4">
                <AccordionTrigger>Will my data sync across devices?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Yes! Your collection data is stored in the cloud and automatically syncs across all your devices. Log in with the same account on your phone, tablet, or computer to access your pipes and tobacco anywhere.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              AI Features (Premium)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-5">
                <AccordionTrigger>How does tobacco pairing work?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>PipeKeeper uses AI to match your pipes with your tobacco blends based on:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Pipe characteristics:</strong> Shape, chamber size, material, smoking traits</li>
                    <li><strong>Blend properties:</strong> Type, strength, cut, flavor profile</li>
                    <li><strong>Your preferences:</strong> Saved in your profile for personalized recommendations</li>
                  </ul>
                  <p>The pairing matrix on the home page shows your best matches with scores and reasoning.</p>
                  <p className="mt-2 text-amber-700 font-medium">🌟 This is a Premium feature</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>What is photo identification?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <p>Upload clear photos of your pipe's stampings, logos, or unique markings. Our AI will analyze them to identify the maker, model, approximate era, and provide market value estimates.</p>
                  <p className="mt-2 text-amber-700 font-medium">🌟 This is a Premium feature</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>How accurate is the value lookup?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <p>Value estimates are based on current market data, recent sales, condition, maker reputation, and rarity. They provide a good baseline but actual values may vary depending on buyer interest, specific features, and market conditions. Always verify with current listings or professional appraisers for important valuations.</p>
                  <p className="mt-2 text-amber-700 font-medium">🌟 This is a Premium feature</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger>What is collection optimization?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>Collection Optimization analyzes your entire collection to:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Suggest which blends each pipe should be specialized for</li>
                    <li>Identify gaps or redundancies in your collection</li>
                    <li>Recommend what collection changes to do next based on what you already have</li>
                    <li>Run "what-if" scenarios to see how a new pipe would fit</li>
                  </ul>
                  <p className="mt-2 text-amber-700 font-medium">🌟 This is a Premium feature</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8a">
                <AccordionTrigger>Can I dispute or modify optimization recommendations?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>Yes! Each pipe recommendation has a "Dispute / Add Info" button that lets you provide feedback. You can:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Disagree with a suggested specialization and explain why</li>
                    <li>Share additional context about how a pipe actually smokes</li>
                    <li>Provide your personal preferences for that specific pipe</li>
                  </ul>
                  <p>After submitting feedback, the AI will re-analyze your collection taking your input into account and adjust its recommendations accordingly.</p>
                  <p className="mt-2 text-amber-700 font-medium">🌟 This is a Premium feature</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8b">
                <AccordionTrigger>What does "Specialized" vs "Versatility" mean for pipes?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>When you designate a pipe for specific blend types (its "focus"), it becomes <strong>Specialized</strong> and will show a "Specialized" badge instead of a versatility score.</p>
                  <p><strong>Specialized pipes</strong> are dedicated to specific tobacco types (like English blends or Virginias) and achieve much higher pairing scores (9-10) with those blends.</p>
                  <p><strong>Versatile pipes</strong> (rated on a 1-10 scale) can handle multiple blend types but won't achieve the same peak performance as a specialized pipe.</p>
                  <p>The optimization system recommends specialization for maximum pairing scores - versatile pipes are good for variety, but specialized pipes are better for excellence.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-600" />
              Managing Your Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-8">
                <AccordionTrigger>What are pipe specializations and focus?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  You can designate specific blend types or tobacco categories for each pipe. This helps maintain flavor integrity and ensures optimal performance. For example, dedicate one pipe to Latakia blends and another to Virginias. The AI will suggest ideal specializations based on your pipe's characteristics.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger>How do I use the break-in schedule?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>For new pipes, the break-in schedule feature creates a custom plan to properly cake and season your pipe. It recommends:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Which tobacco blends to use in what order</li>
                    <li>How many bowls to smoke at each stage</li>
                    <li>When to increase or rotate blends</li>
                  </ul>
                  <p>Track your progress directly in the pipe detail page and log sessions as you go.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10">
                <AccordionTrigger>Can I import my existing collection?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Yes! Premium users can bulk import pipes and tobacco from CSV files. Download the template from the Import page, fill it with your data, and upload. The system will process and add everything to your collection automatically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11">
                <AccordionTrigger>How do I track smoking sessions?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>Use the Smoking Log panel on the home page to record each session. Select the pipe and blend used, add notes, and track bowls smoked.</p>
                  <p><strong>Features:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Pipe Rest Tracking:</strong> The system shows which pipes are ready to smoke and which need rest. Pipes need 24 hours between sessions.</li>
                    <li><strong>Tobacco Usage Estimation:</strong> Based on your pipe's bowl size, the app estimates tobacco consumption per session.</li>
                    <li><strong>Auto Inventory Reduction (Premium):</strong> Enable the toggle to automatically reduce your cellared tobacco amount when logging sessions. The system calculates usage based on pipe bowl size and updates your inventory accordingly.</li>
                  </ul>
                  <p>This data helps the AI improve pairing recommendations and shows your usage patterns over time.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11d">
                <AccordionTrigger>How do I bulk edit tobacco blends?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-3">
                  <p>The Quick Edit feature allows you to update multiple tobacco blends at once, saving time when managing your collection.</p>
                  
                  <p className="font-semibold text-stone-800">Using Quick Edit:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to the Tobacco page</li>
                    <li>Click the <strong>Quick Edit</strong> button in the top right</li>
                    <li>Check the boxes next to the blends you want to update</li>
                    <li>Use <strong>Select All</strong> to choose all visible blends (respects current filters)</li>
                    <li>The Quick Edit panel appears at the bottom with update options</li>
                    <li>Set the fields you want to change (leave others blank to skip)</li>
                    <li>Click <strong>Update X Blends</strong> to apply changes</li>
                  </ol>

                  <p className="font-semibold text-stone-800 mt-3">What you can update:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Add to Quantity:</strong> Adds tins to existing quantity (e.g., enter 3 to add 3 tins)</li>
                    <li><strong>Tin Status:</strong> Set to Sealed/Cellared, Opened, or Empty</li>
                    <li><strong>Favorite:</strong> Mark or unmark as favorite</li>
                    <li><strong>Rating:</strong> Set a rating from 1-5 stars</li>
                  </ul>

                  <p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mt-3">
                    <strong>💡 Tip:</strong> Use filters first to narrow down blends (by type, strength, manufacturer), then Quick Edit will only apply to the filtered results.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11b">
                <AccordionTrigger>How do I export my collection data?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-3">
                  <p>PipeKeeper offers several export options to back up your data or use it for insurance purposes:</p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-stone-800 mb-1">Pipe Collection Export</p>
                      <p className="text-sm">From the Pipes page, use the export buttons to generate:</p>
                      <ul className="list-disc ml-5 space-y-1 text-sm">
                        <li><strong>CSV Export:</strong> Complete collection data in spreadsheet format</li>
                        <li><strong>Insurance Report (PDF):</strong> Professional document with photos, stamping images, values, and detailed descriptions for insurance claims</li>
                      </ul>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-stone-800 mb-1">Tobacco Collection Export</p>
                      <p className="text-sm">From the Tobacco page, export your cellar as:</p>
                      <ul className="list-disc ml-5 space-y-1 text-sm">
                        <li><strong>CSV Export:</strong> All blend details, quantities, and ratings</li>
                        <li><strong>PDF Summary:</strong> Collection overview with statistics and blend details</li>
                      </ul>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-stone-800 mb-1">Pairing Reference Guide</p>
                      <p className="text-sm">From the AI Pairing Recommendations section on the Home page:</p>
                      <ul className="list-disc ml-5 space-y-1 text-sm">
                        <li><strong>CSV Export:</strong> Complete pairing matrix with scores and reasoning</li>
                        <li><strong>PDF Guide:</strong> Formatted reference document for each pipe with best tobacco matches</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11c">
                <AccordionTrigger>How do tobacco inventory alerts work?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>The Tobacco Collection Stats panel on your home page monitors your cellared tobacco levels and alerts you when supplies run low.</p>
                  <p><strong>Setting Up Alerts:</strong></p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Look for the Tobacco Collection Stats panel on your Home page</li>
                    <li>Click the settings icon (⚙️) in the panel header</li>
                    <li>Set your "Low Inventory Threshold" in ounces</li>
                    <li>Save your settings</li>
                  </ol>
                  <p>When any blend's cellared amount drops to or below your threshold, you'll see a warning banner listing all blends running low. Click any blend to view details or reorder.</p>
                  <p className="text-sm bg-amber-50 border border-amber-200 rounded p-2"><strong>💡 Tip:</strong> Default threshold is 2 oz, but adjust based on your smoking frequency and preferred stock levels.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11a">
                <AccordionTrigger>How do I add or change tobacco blend logos?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-3">
                  <p><strong>Automatic Logo Assignment:</strong> When you add a new tobacco blend and enter the manufacturer name, PipeKeeper automatically searches our logo library and assigns the matching brand logo if available.</p>
                  
                  <p><strong>Manual Logo Selection:</strong> If the automatic logo isn't correct or you want to change it:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Open the tobacco blend detail page</li>
                    <li>Click "Edit Blend"</li>
                    <li>In the form, look for the "Browse Logo Library" button</li>
                    <li>Search or browse the library of tobacco brand logos</li>
                    <li>Select the logo you want and it will be applied to your blend</li>
                  </ol>

                  <p className="mt-3"><strong>Custom Logo Upload:</strong> If your brand logo isn't in the library, you can upload your own:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Navigate to the Tobacco page</li>
                    <li>Look for the "Manage Logo Library" option</li>
                    <li>Upload a custom logo image for the brand</li>
                    <li>Once uploaded, it will be available for selection when editing blends</li>
                  </ol>

                  <p className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <strong>💡 Tip:</strong> Logo images work best when they're square or close to square aspect ratio with transparent backgrounds.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-stone-800">Understanding Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-12">
                <AccordionTrigger>What do the pipe measurement fields mean?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <ul className="space-y-2">
                    <li><strong>Length:</strong> Overall pipe length from stem tip to bowl bottom</li>
                    <li><strong>Weight:</strong> Total weight of the assembled pipe</li>
                    <li><strong>Bowl Height:</strong> Outer height of the bowl</li>
                    <li><strong>Bowl Width:</strong> Outer diameter of the bowl at widest point</li>
                    <li><strong>Chamber Diameter:</strong> Inner diameter of the tobacco chamber</li>
                    <li><strong>Chamber Depth:</strong> How deep the tobacco chamber is</li>
                    <li><strong>Chamber Volume:</strong> Overall size category (Small/Medium/Large/Extra Large)</li>
                  </ul>
                  <p className="mt-3">You can toggle between metric (mm, g) and imperial (inches, oz) units using the conversion button in the form.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-13">
                <AccordionTrigger>What is the difference between bowl material and stem material?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <strong>Bowl Material</strong> is what the tobacco chamber is made from (Briar, Meerschaum, Corncob, etc.). <strong>Stem Material</strong> is what the mouthpiece is made from (Vulcanite, Acrylic, Lucite, etc.). These affect the pipe's smoking characteristics, durability, and maintenance needs.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-14">
                <AccordionTrigger>What are tobacco components?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Tobacco components are the different types of leaf tobacco used in a blend. Common types include Virginia, Burley, Latakia, Perique, Oriental, and Cavendish. Most blends use 2-5 different components in varying proportions to create unique flavor profiles.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-15">
                <AccordionTrigger>What does "aging potential" mean?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Aging potential indicates how well a tobacco blend improves with storage over time. Blends high in Virginia tobacco typically age excellently, developing deeper flavors over years. Aromatic blends often don't age as well. This helps you decide which blends to cellar long-term.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-15a">
                <AccordionTrigger>How do I track tobacco inventory across Tins, Bulk, and Pouches?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-3">
                  <p>PipeKeeper now supports tracking tobacco in three separate formats: Tins, Bulk, and Pouches. You can track any combination of these for each blend.</p>
                  
                  <p className="font-semibold text-stone-800">In the Tobacco Form:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to the "Inventory & Status" section</li>
                    <li>Use the three tabs (Tins, Bulk, Pouches) to enter quantities for each type</li>
                    <li>For each type, track: Total quantity, Open amount, Cellared amount, Date cellared</li>
                  </ol>
                  
                  <p className="font-semibold text-stone-800 mt-3">Tins Tab:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Enter individual tin size (oz) and total number of tins</li>
                    <li>Specify how many tins are open vs. cellared</li>
                    <li>Total quantity auto-calculates based on tin size × number of tins</li>
                  </ul>
                  
                  <p className="font-semibold text-stone-800 mt-3">Bulk Tab:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Enter total bulk quantity in ounces</li>
                    <li>Break down by open and cellared amounts</li>
                    <li>Track date when bulk was cellared</li>
                  </ul>
                  
                  <p className="font-semibold text-stone-800 mt-3">Pouches Tab:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Enter individual pouch size (oz) and total number of pouches</li>
                    <li>Specify how many pouches are open vs. cellared</li>
                    <li>Total quantity auto-calculates based on pouch size × number of pouches</li>
                  </ul>
                  
                  <p className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mt-3">
                    <strong>💡 On Tobacco Cards:</strong> Each format shows as a separate badge with its total quantity, and badges for open/cellared amounts in different colors (sky blue for open, green for cellared).
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-stone-800">Account & Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-16">
                <AccordionTrigger>What's included in the free trial?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  {canShowPurchaseUI ? (
                    <p>New users get 7 days of full Premium access to try features like AI pairing, photo identification, value lookup, collection optimization, bulk import, and advanced tools. After the trial, you can subscribe to keep using Premium features.</p>
                  ) : (
                    <p>Trial availability may vary by account. Premium upgrades aren't available in the companion app. If you already have Premium, sign in with the same account to access your features.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-17">
                <AccordionTrigger>How much does Premium cost?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  {canShowPurchaseUI ? (
                    <p>PipeKeeper Premium is $1.99/month or $19.99/year. Plans include Premium features and renew until canceled.</p>
                  ) : (
                    <p>Premium upgrades aren't available in the companion app. If you already have Premium, sign in with the same account and your features will unlock automatically.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-18">
                <AccordionTrigger>What happens if I cancel my subscription?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  {canShowPurchaseUI ? (
                    <p>You'll keep Premium access until the end of your billing period. After that, Premium features lock, but you'll still have access to your collection data and basic features.</p>
                  ) : (
                    <p>If your Premium access ends, Premium features lock but your collection data remains available. Subscription management isn't available in the companion app.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-19">
                <AccordionTrigger>How do I cancel or manage my subscription?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-3">
                  {canShowPurchaseUI ? (
                    <>
                      <p>You can manage your subscription directly through the billing portal:</p>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li>Go to your Profile page</li>
                        <li>Look for the "Subscription" section</li>
                        <li>Click "Manage Subscription" to open the billing portal</li>
                      </ol>
                      <p className="mt-3">In the billing portal, you can:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Cancel your subscription</li>
                        <li>Update payment method</li>
                        <li>View billing history and invoices</li>
                        <li>Change subscription plan</li>
                      </ul>
                      <p className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mt-3">
                        <strong>💡 Note:</strong> If you cancel, you'll retain Premium access until the end of your current billing period.
                      </p>
                    </>
                  ) : (
                    <p>Subscription management is not available in companion apps. If you already have a subscription, sign in to access premium features.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-19a">
                <AccordionTrigger>How do subscriptions work on iOS and Android?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <p>
                    Subscription availability and billing methods vary by platform. In companion apps, purchase flows may be unavailable.
                    If you already have a subscription, sign in to access premium features.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Community Features */}
        <Card className="bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <span className="text-2xl">👥</span>
              Community & Sharing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="community-1">
                <AccordionTrigger className="text-left">
                  What is the Community feature?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  The Community feature (Premium only) lets you connect with other pipe enthusiasts. You can create a public profile showcasing your collection, follow other collectors, comment on their pipes and tobacco blends, and discover new items through the community.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-2">
                <AccordionTrigger className="text-left">
                  How do I make my profile public?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to your Profile page from the navigation menu</li>
                    <li>Fill in your Display Name, Bio, and upload a profile picture</li>
                    <li>Check the box "Make my profile publicly searchable in Community"</li>
                    <li>Click "Preview Profile" to see how it will look to others</li>
                    <li>When ready, click "Save Profile" and your profile will be public</li>
                  </ol>
                  <p className="mt-3">You can make your profile private again at any time by unchecking the box.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-3">
                <AccordionTrigger className="text-left">
                  What information is shared when I make my profile public?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <p className="mb-2">When your profile is public, other users can see:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your display name, bio, and profile picture</li>
                    <li>Your pipe collection (with photos and details)</li>
                    <li>Your tobacco cellar (blends and information)</li>
                    <li>Your smoking session logs</li>
                  </ul>
                  <p className="mt-3"><strong>Not shared:</strong> Your email address, personal preferences (clenching, duration, etc.), estimated values, purchase prices, and any notes you've marked as private.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-4">
                <AccordionTrigger className="text-left">
                  How do I follow other users?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Go to the Community page and use the "Discover Users" tab. You can search for users by name or browse public profiles. Click "Follow" on any profile you'd like to follow. You can view all your followed users in the "Following" tab.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-5">
                <AccordionTrigger className="text-left">
                  Can I disable comments on my collection?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Yes! On your Profile page, you can uncheck "Allow comments on my pipes, tobacco, and logs" to disable commenting. You can toggle this on or off at any time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-6">
                <AccordionTrigger className="text-left">
                  How do I report inappropriate comments?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  If you see an inappropriate comment on any profile, click the flag icon next to the comment. You'll be asked to provide a reason for the report. All reports are reviewed, and action will be taken if the comment violates community guidelines.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-7">
                <AccordionTrigger className="text-left">
                  Can I share my location to find local pipe enthusiasts?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <p className="mb-2">Yes! On your Profile page, you can optionally add:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>City</li>
                    <li>State/Province</li>
                    <li>Country</li>
                    <li>Zip/Postal Code</li>
                  </ul>
                  <p className="mt-3">Check the box "Show my location publicly and allow others to find me by location" to opt-in. Your location will appear on your public profile, and other users can filter the Community directory by country and state to find nearby collectors.</p>
                  <p className="mt-2"><strong>Privacy:</strong> Location sharing is completely optional. If you don't check the box, your location remains private even if you've entered it.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-8">
                <AccordionTrigger className="text-left">
                  What's the difference between Friends and Following?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <p className="mb-3"><strong>Friends:</strong> A mutual connection that requires both users to accept. Send a friend request, and if the other user accepts, you both become friends. Friends appear in your "Friends" tab.</p>
                  <p><strong>Following:</strong> A one-way connection where you can follow any public profile without their approval. Following lets you keep up with users whose collections interest you, even if they haven't added you as a friend.</p>
                  <p className="mt-3">You can have both types of connections with the same user - be friends AND follow them.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-9">
                <AccordionTrigger className="text-left">
                  How do I add friends?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to the Community page and navigate to the "Discover" tab</li>
                    <li>Find a user you'd like to be friends with (use search or location filters)</li>
                    <li>Click "Add Friend" next to their profile</li>
                    <li>They'll receive a friend request in their "Friends" tab</li>
                    <li>Once they accept, you'll both appear in each other's friends list</li>
                  </ol>
                  <p className="mt-3">You can view pending requests, accept incoming requests, and manage your friends in the "Friends" tab. A badge shows the number of pending requests waiting for your response.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="community-10">
                <AccordionTrigger className="text-left">
                  How does instant messaging work?
                </AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  <p className="mb-3">Instant messaging allows you to chat in real-time with friends who also have messaging enabled.</p>
                  
                  <p className="font-semibold text-stone-800 mb-2">Setting Up:</p>
                  <ol className="list-decimal pl-5 space-y-1 mb-3">
                    <li>Go to your Profile page</li>
                    <li>Check the box "Enable instant messaging with friends"</li>
                    <li>Save your profile</li>
                  </ol>
                  
                  <p className="font-semibold text-stone-800 mb-2">Using Messaging:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Friends with messaging enabled appear in the Messaging Panel on the Friends tab</li>
                    <li>Green dot indicates friend is online, gray dot means offline</li>
                    <li>Click a friend to open chat window</li>
                    <li>Type and send instant messages</li>
                    <li>If friend is offline, messages are saved to their inbox</li>
                    <li>Use the Inbox button to view unread messages and saved messages</li>
                    <li>Save important messages or delete unwanted ones</li>
                  </ul>
                  
                  <p className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mt-3">
                    <strong>💡 Privacy:</strong> Only friends who mutually accept friend requests and both enable messaging can send messages to each other.
                  </p>
                  <p className="mt-2 text-amber-700 font-medium">🌟 This is a Premium feature</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-stone-800">Need More Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-stone-600">
              If you have questions not covered here, visit our <a href={createPageUrl('Support')} className="text-amber-700 hover:text-amber-800 font-medium">Support page</a> to contact us directly.
            </p>
            <div className="flex gap-3">
              <a href={createPageUrl('Support')}>
                <Button variant="outline">Contact Support</Button>
              </a>
              <a href={createPageUrl('Home')}>
                <Button className="bg-amber-700 hover:bg-amber-800">Back to Home</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}