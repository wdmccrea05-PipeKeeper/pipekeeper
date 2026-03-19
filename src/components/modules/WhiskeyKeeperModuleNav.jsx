import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { BookOpen, TrendingUp } from "lucide-react";
import WhiskeyBottleIcon from "@/components/icons/WhiskeyBottleIcon";

export default function WhiskeyKeeperModuleNav({ currentPageName }) {
  const { t } = useTranslation();

  const items = [
    { page: "Whiskey", label: t("whiskey.bottles", "Bottles"), semanticIcon: "bottle" },
    { page: "Tastings", label: t("whiskey.tastings", "Tastings"), icon: BookOpen },
    { page: "WhiskeyInsights", label: t("nav.insights", "Insights"), icon: TrendingUp },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {items.map((item) => {
        const active = currentPageName === item.page;
        return (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{
              color: active ? "#F5F1E7" : "rgba(224,216,200,0.78)",
              background: active ? "rgba(107,74,45,0.42)" : "transparent",
              border: active
                ? "1px solid rgba(180,140,75,0.35)"
                : "1px solid transparent",
            }}
          >
            {item.semanticIcon === "bottle" ? (
              <WhiskeyBottleIcon
                className="w-4 h-4"
                color={active ? "#D4A574" : "rgba(180,140,75,0.78)"}
              />
            ) : (
              <item.icon
                className="w-4 h-4"
                style={{ color: active ? "#D4A574" : "rgba(180,140,75,0.78)" }}
              />
            )}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
