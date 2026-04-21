import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { BookOpen, TrendingUp, Plus, FileSpreadsheet, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhiskeyBottleIcon from "@/components/icons/WhiskeyBottleIcon";

export default function WhiskeyKeeperModuleNav({ currentPageName }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    { page: "Whiskey", label: t("whiskey.bottles"), semanticIcon: "bottle" },
    { page: "Tastings", label: t("whiskey.tastings"), icon: BookOpen },
    { page: "SessionHistory", label: t("sessionHistory.title", "Session History"), icon: CalendarDays },
    { page: "WhiskeyInsights", label: t("nav.insights"), icon: TrendingUp },
  ];

  return (
    <div className="flex items-center justify-between gap-3">
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
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={() => navigate('/Whiskey?action=add')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('whiskey.addBottle')}
          aria-label={t('whiskey.addBottle')}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('whiskey.addBottle')}</span>
        </Button>
        <Button
          onClick={() => navigate('/Tastings')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('whiskey.logTasting')}
          aria-label={t('whiskey.logTasting')}
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">{t('whiskey.logTasting')}</span>
        </Button>
        <Button
          onClick={() => navigate('/Import?type=whiskeykeeper_bottles')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('import.bulkImport')}
          aria-label={t('import.bulkImport')}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline">{t('import.bulkImport')}</span>
        </Button>
      </div>
    </div>
  );
}
