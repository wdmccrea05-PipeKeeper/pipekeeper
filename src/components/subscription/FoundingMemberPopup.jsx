import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart } from "lucide-react";

export default function FoundingMemberPopup({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#A35C5C]/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-[#A35C5C] fill-current" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Thank You for Being an Early Supporter
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-4">
            <p>
              Thanks for subscribing to PipeKeeper Premium and for supporting the app early on.
            </p>
            <p>
              As a founding member, you'll continue to enjoy full Premium access, including all features available today. Nothing you currently have access to will be removed or restricted.
            </p>
            <p>
              Your support truly helps shape the future of PipeKeeper.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="px-8">
            Got it — thanks!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}