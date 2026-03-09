import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/components/i18n/safeTranslation";

export function Combobox({ 
  value, 
  onValueChange, 
  options = [], 
  placeholder,
  searchPlaceholder,
  emptyText,
  allowCustom = true,
  className
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("ui.selectPlaceholder");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("ui.searchPlaceholder");
  const resolvedEmptyText = emptyText ?? t("ui.noResultsFound");
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const handleSelect = (currentValue) => {
    const newValue = currentValue === value ? "" : currentValue;
    onValueChange(newValue);
    setOpen(false);
    setSearch("");
  };

  const handleCustomValue = () => {
    if (search.trim() && allowCustom && !options.includes(search.trim())) {
      onValueChange(search.trim());
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || resolvedPlaceholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={resolvedSearchPlaceholder} 
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter" && allowCustom) {
                e.preventDefault();
                handleCustomValue();
              }
            }}
          />
          <CommandEmpty>
            {allowCustom && search.trim() ? (
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={handleCustomValue}
                >
                  {t("ui.useCustomValue", 'Use "{value}"', { value: search.trim() })}
                </Button>
              </div>
            ) : (
              <div className="p-2 text-xs text-center text-muted-foreground">
                {resolvedEmptyText}
              </div>
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={handleSelect}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option ? "opacity-100" : "opacity-0"
                  )}
                />
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}