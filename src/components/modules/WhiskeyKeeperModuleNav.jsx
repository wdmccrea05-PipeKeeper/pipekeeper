import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Home, Wine, TrendingUp } from "lucide-react";
import {
  MODULE_ICONS,
  getAssetImageStyle,
} from "@/components/branding/moduleAssets";

function NavItem({ item, currentPageName }) {
  const active = currentPageName === item.page;

  return (
    <Link
      to={createPageUrl(item.page)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        active ? "bg-[#6b4a2d]/55" : "hover:bg-white/5"
      )}
      style={{
        color: active ? "#F5F1E7" : "rgba(224,216,200,0.78)",
        border: active ? "1px solid rgba(180,140,75,0.35)" : "1px solid transparent",
      }}
    >
      {item.image ? (
        <img
          src={item.image}
          alt={item.label}
          className="w-4 h-4 object-contain bg-transparent flex-shrink-0"
          style={getAssetImageStyle(item.assetKey, "small")}
          draggable={false}
        />
      ) : item.icon ? (
        <item.icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: active ? "#D4A574" : "rgba(180,140,75,0.78)" }}
        />
      ) : null}
      <span>{item.label}</span>
    </Link>
  );
}

export default function WhiskeyKeeperModuleNav({ currentPageName }) {
  const { t } = useTranslation();

  const items = [
    { page: "WhiskeyKeeper", label: t("nav.whiskeykeeper", "WhiskeyKeeper"), image: MODULE_ICONS.whiskeykeeper, assetKey: "whiskeykeeper" },
    { page: "Whiskey", label: t("whiskey.bottles", "Bottles"), icon: Wine },
    { page: "Tastings", label: t("whiskey.tastings", "Tastings"), icon: Home },
    { page: "WhiskeyInsights", label: t("nav.insights", "Insights"), icon: TrendingUp },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => (
        <NavItem key={item.page} item={item} currentPageName={currentPageName} />
      ))}
    </div>
  );
}