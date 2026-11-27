import React from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TEXT_CAPTION, TEXT_PRIMARY } from "@/lib/theme/tokens";

/**
 * Opens the exact records behind a chart bar or slice.
 * The list is the filtered population, so it always matches the number shown.
 */
export default function ReportDrilldownDialog({ open, onOpenChange, title, items = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" style={{ background: "#1d1511", border: "1px solid rgba(180,140,75,0.28)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: TEXT_PRIMARY }}>{title || "Records"}</DialogTitle>
        </DialogHeader>
        <p className="text-xs" style={{ color: TEXT_CAPTION }}>
          {items.length} record{items.length === 1 ? "" : "s"} in this group.
        </p>
        <div className="max-h-[60vh] overflow-y-auto divide-y" style={{ borderColor: "rgba(180,140,75,0.12)" }}>
          {items.length === 0 ? (
            <p className="py-4 text-sm" style={{ color: TEXT_CAPTION }}>No record in the current filter belongs to this group.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="py-2.5" style={{ borderTop: "1px solid rgba(180,140,75,0.10)" }}>
                <Link
                  to={item.detailPath || "#"}
                  onClick={() => onOpenChange(false)}
                  className="text-sm font-medium underline decoration-dotted underline-offset-2"
                  style={{ color: "#D4A574" }}
                >
                  {item.name}
                </Link>
                <p className="text-xs mt-0.5" style={{ color: TEXT_CAPTION }}>
                  {[item.moduleLabel, item.maker, item.category, item.condition].filter(Boolean).join(" · ")}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}