import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function FoundingMemberPopup({ isOpen, onClose }) {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#A35C5C]/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-[#A35C5C] fill-current" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {t("foundingMember.title")}
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-4">
            <p>
              {t("foundingMember.para1")}
            </p>
            <p>
              {t("foundingMember.para2")}
            </p>
            <p>
              {t("foundingMember.para3")}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="px-8">
            {t("foundingMember.gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}