import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import QuickPipeIdentifier from "@/components/ai/QuickPipeIdentifier";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { isAppleBuild } from "@/components/utils/appVariant";

export default function IdentifyModal({ isOpen, onClose, pipes = [], blends = [] }) {
  const { t } = useTranslation();

  if (isAppleBuild) return null;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="mb-4">
          <SheetTitle>{t("tobacconist.identify")}</SheetTitle>
        </SheetHeader>
        <QuickPipeIdentifier pipes={pipes} blends={blends} />
      </SheetContent>
    </Sheet>
  );
}
