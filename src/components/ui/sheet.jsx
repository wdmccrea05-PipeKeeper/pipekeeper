"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n/index.jsx";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/70 backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = {
  right: "inset-y-0 right-0 h-full w-full max-w-3xl border-l",
  left: "inset-y-0 left-0 h-full w-full max-w-3xl border-r",
  top: "inset-x-0 top-0 border-b",
  bottom: "inset-x-0 bottom-0 border-t",
};

const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => {
  const { t } = useTranslation();

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 gap-4 overflow-y-auto",
          sheetVariants[side],
          "border-[rgba(140,105,65,0.32)]",
          "bg-[linear-gradient(180deg,rgba(20,15,11,0.985)_0%,rgba(14,11,9,0.99)_100%)]",
          "text-[#F5F1E7] shadow-[0_18px_60px_rgba(0,0,0,0.72)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          className
        )}
        {...props}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at top, rgba(154,102,42,0.10) 0%, transparent 28%), linear-gradient(90deg, rgba(122,83,43,0.06) 0%, transparent 30%, rgba(122,83,43,0.05) 55%, transparent 100%)",
          }}
        />
        {children}
        <SheetPrimitive.Close
          className="absolute right-4 top-4 rounded-md border border-[rgba(140,105,65,0.35)] bg-black/20 p-1 text-[#D7C9B2] transition-colors hover:bg-white/5 hover:text-white flex items-center justify-center"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t('common.close')}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-2 border-b border-[rgba(180,140,75,0.15)] px-7 py-6", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-[rgba(140,105,65,0.18)] bg-[linear-gradient(180deg,rgba(22,18,14,0.94)_0%,rgba(18,14,11,0.97)_100%)] p-6 backdrop-blur-[10px]",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-xl font-semibold leading-snug text-[#F5F1E7]", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm leading-relaxed text-[rgba(224,216,200,0.70)]", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};