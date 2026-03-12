import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n/index.jsx";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm", className)}
      {...props}
    />
  );
});

const DialogContent = React.forwardRef(function DialogContent({ className, children, ...props }, ref) {
  const { t } = useTranslation();
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] max-h-[90vh] overflow-y-auto p-0",
          "rounded-2xl border border-[rgba(140,105,65,0.35)] bg-[linear-gradient(145deg,rgba(40,28,20,0.98),rgba(32,22,15,0.99))] text-[#F5F1E7] shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-md",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4 rounded-lg p-2 text-[#D8C7A6]/70 hover:text-[#F5F1E7] hover:bg-[rgba(255,255,255,0.05)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t("common.close")}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 border-b border-[rgba(140,105,65,0.18)] px-6 py-5 text-left", className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-[rgba(140,105,65,0.18)] px-6 py-4", className)} {...props} />
);

const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn("text-2xl font-bold text-[#F5F1E7]", className)} {...props} />;
});

const DialogDescription = React.forwardRef(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("text-sm text-[#D8C7A6]/78", className)}
      {...props}
    />
  );
});

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
