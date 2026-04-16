import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { BookOpen, TrendingUp, Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhiskeyBottleIcon from "@/components/icons/WhiskeyBottleIcon";

export default function WhiskeyKeeperModuleNav({ currentPageName }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    { page: "Whiskey", label: t("whiskey.bottles", "Bottles"), semanticIcon: "bottle" },
    { page: "Tastings", label: t("whiskey.tastings", "Tastings"), icon: BookOpen },
    { page: "WhiskeyInsights", label: t("nav.insights", "Insights"), icon: TrendingUp },
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
          title={t('whiskey.addBottle', 'Add Bottle')}
          aria-label={t('whiskey.addBottle', 'Add Bottle')}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('whiskey.addBottle', 'Add Bottle')}</span>
        </Button>
        <Button
          onClick={() => navigate('/Tastings')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('whiskey.logTasting', 'Log Tasting')}
          aria-label={t('whiskey.logTasting', 'Log Tasting')}
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">{t('whiskey.logTasting', 'Log Tasting')}</span>
        </Button>
        <Button
          onClick={() => navigate('/Import?type=whiskeykeeper_bottles')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('import.bulkImport', 'Bulk Import')}
          aria-label={t('import.bulkImport', 'Bulk Import')}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline">{t('import.bulkImport', 'Bulk Import')}</span>
        </Button>
      </div>
    </div>
  );
}
