import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ShoppingListTypeSelect({ value, onChange }) {
  return (
    <div className="space-y-3">
      <Label className="text-[#E0D8C8] font-medium">Item Type</Label>
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="flex items-center space-x-2 p-3 rounded border border-[#b48c4b]/20 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer">
          <RadioGroupItem value="buy_new_item" id="buy_new" />
          <label htmlFor="buy_new" className="cursor-pointer flex-1 m-0">
            <div className="font-medium text-[#E0D8C8]">Buy New Item</div>
            <div className="text-xs text-[#E0D8C8]/60">Item I don't own yet</div>
          </label>
        </div>
        <div className="flex items-center space-x-2 p-3 rounded border border-[#b48c4b]/20 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer">
          <RadioGroupItem value="restock" id="restock" />
          <label htmlFor="restock" className="cursor-pointer flex-1 m-0">
            <div className="font-medium text-[#E0D8C8]">Restock</div>
            <div className="text-xs text-[#E0D8C8]/60">Item I already own, need more</div>
          </label>
        </div>
      </RadioGroup>
    </div>
  );
}