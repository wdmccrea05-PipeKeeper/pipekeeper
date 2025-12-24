import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, HelpCircle, Sparkles, Camera, DollarSign, Leaf, Smartphone } from "lucide-react";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">Help & FAQ</h1>
          <p className="text-[#e8d5b7]/70">Everything you need to know about PipeKeeper</p>
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
                  </ul>
                  <p>Logos are automatically pulled from our library when you enter the manufacturer name.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>What can I do with the onboarding tutorial?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  The onboarding tutorial walks you through PipeKeeper's main features including AI pairing recommendations, photo identification, value lookup, and collection optimization. You can revisit it anytime from the Help menu in the navigation bar.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3a">
                <AccordionTrigger>How do I install PipeKeeper on my phone?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-3">
                  <p>PipeKeeper works as a web app that can be installed on your mobile device for an app-like experience:</p>
                  
                  <div>
                    <p className="font-semibold mb-1">On iPhone/iPad (Safari):</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Open PipeKeeper in Safari browser</li>
                      <li>Tap the Share button (square with arrow pointing up)</li>
                      <li>Scroll down and tap "Add to Home Screen"</li>
                      <li>Tap "Add" to confirm</li>
                    </ol>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">On Android (Chrome):</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Open PipeKeeper in Chrome browser</li>
                      <li>Tap the menu (three dots) in the top right</li>
                      <li>Tap "Add to Home screen" or "Install app"</li>
                      <li>Tap "Add" or "Install" to confirm</li>
                    </ol>
                  </div>

                  <p className="text-sm italic">Once installed, PipeKeeper will appear on your home screen like a native app and can work offline with cached data.</p>
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
                <AccordionTrigger>Is PipeKeeper available in the App Store or Google Play?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  PipeKeeper is a Progressive Web App (PWA) that works directly in your browser. While it's not in the app stores, you can install it on your phone's home screen for the same experience as a native app - no downloads from the app store needed!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-mobile-2">
                <AccordionTrigger>Can I use PipeKeeper offline?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Once installed on your device, PipeKeeper caches your data so you can view your collection offline. Some features like AI search and photo identification require an internet connection, but basic browsing and editing work offline.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-mobile-3">
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
              AI Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-4">
                <AccordionTrigger>How does tobacco pairing work?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>PipeKeeper uses AI to match your pipes with your tobacco blends based on:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Pipe characteristics:</strong> Shape, chamber size, material, smoking traits</li>
                    <li><strong>Blend properties:</strong> Type, strength, cut, flavor profile</li>
                    <li><strong>Your preferences:</strong> Saved in your profile for personalized recommendations</li>
                  </ul>
                  <p>The pairing matrix on the home page shows your best matches with scores and reasoning.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>What is photo identification?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Upload clear photos of your pipe's stampings, logos, or unique markings. Our AI will analyze them to identify the maker, model, approximate era, and provide market value estimates. This is a Premium feature available with a subscription.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>How accurate is the value lookup?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  Value estimates are based on current market data, recent sales, condition, maker reputation, and rarity. They provide a good baseline but actual values may vary depending on buyer interest, specific features, and market conditions. Always verify with current listings or professional appraisers for important valuations.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>What is collection optimization?</AccordionTrigger>
                <AccordionContent className="text-stone-600 space-y-2">
                  <p>Collection Optimization analyzes your entire collection to:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Suggest which blends each pipe should be specialized for</li>
                    <li>Identify gaps or redundancies in your collection</li>
                    <li>Recommend your next pipe purchase based on what you already have</li>
                    <li>Run "what-if" scenarios to see how a new pipe would fit</li>
                  </ul>
                  <p>This Premium feature helps you build a well-rounded collection.</p>
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
                <AccordionContent className="text-stone-600">
                  Use the Smoking Log panel on the home page to record each session. Select the pipe and blend used, add notes, and track bowls smoked. This data helps the AI improve pairing recommendations and shows your usage patterns over time.
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
                  New users get 7 days of full Premium access to try all features including AI pairing, photo identification, value lookup, collection optimization, and bulk import. After the trial, you can subscribe to continue using Premium features.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-17">
                <AccordionTrigger>How much does Premium cost?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  PipeKeeper Premium is $1.99/month or $19.99/year (save 17% with annual billing). Both plans include all Premium features and automatic renewal until cancelled. You can cancel anytime from your Profile page.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-18">
                <AccordionTrigger>What happens if I cancel my subscription?</AccordionTrigger>
                <AccordionContent className="text-stone-600">
                  You'll keep Premium access until the end of your billing period. After that, Premium features will be locked but you'll still have access to your collection data and basic features. You can reactivate anytime to regain Premium access.
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
              If you have questions not covered here, visit our <Link to={createPageUrl('Support')} className="text-amber-700 hover:text-amber-800 font-medium">Support page</Link> to contact us directly.
            </p>
            <div className="flex gap-3">
              <Link to={createPageUrl('Support')}>
                <Button variant="outline">Contact Support</Button>
              </Link>
              <Link to={createPageUrl('Home')}>
                <Button className="bg-amber-700 hover:bg-amber-800">Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}