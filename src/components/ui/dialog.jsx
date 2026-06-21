import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from '@/components/i18n/safeTranslation';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(function DialogOverlay(
  { className, ...props },
  ref
) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/72 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
});

const DialogContent = React.forwardRef(function DialogContent(
  { className, children, ...props },
  ref
) {
  const { t } = useTranslation();
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-[calc(100%-2rem)] max-w-2xl max-h-[92vh] overflow-y-auto",
          "rounded-3xl border border-[rgba(180,140,75,0.22)]",
          "bg-[linear-gradient(180deg,rgba(30,22,16,0.98),rgba(20,15,12,0.99))]",
          "p-7 shadow-[0_32px_80px_rgba(0,0,0,0.65)]",
          "outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            "absolute right-5 top-5 rounded-xl p-1.5",
            "border border-[rgba(180,140,75,0.22)] bg-[rgba(0,0,0,0.20)]",
            "text-[rgba(224,216,200,0.65)] hover:text-[#F5F1E7] hover:bg-[rgba(255,255,255,0.06)]",
            "focus:outline-none transition-colors"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t("auto.components_ui_dialog.close_3lk8qj")}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-2 mb-6", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
        "mt-7 pt-5 border-t border-[rgba(180,140,75,0.12)]",
        className
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef(function DialogTitle(
  { className, ...props },
  ref
) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "text-xl font-semibold leading-snug tracking-tight text-[#F5F1E7]",
        className
      )}
      {...props}
    />
  );
});

const DialogDescription = React.forwardRef(function DialogDescription(
  { className, ...props },
  ref
) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("text-sm leading-relaxed text-[rgba(224,216,200,0.68)]", className)}
      {...props}
    />
  );
});

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

export default Dialog;