import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Leaf, TrendingUp, FileSpreadsheet, CalendarDays } from "lucide-react";
import PipeIcon from "@/components/icons/PipeIcon";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

function NavItem({ item, active }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
      style={{
        color: active ? "#F5F1E7" : "rgba(224,216,200,0.78)",
        border: active ? "1px solid rgba(180,140,75,0.35)" : "1px solid transparent",
        background: active ? "rgba(107,74,45,0.55)" : "transparent",
      }}
    >
      {item.semanticIcon === "pipe" ? (
        <PipeIcon
          className="w-4 h-4 flex-shrink-0"
          color={active ? "#D4A574" : "rgba(180,140,75,0.78)"}
        />
      ) : (
        <item.icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: active ? "#D4A574" : "rgba(180,140,75,0.78)" }}
        />
      )}
      <span>{item.label}</span>
    </Link>
  );
}

export default function PipeKeeperModuleNav({ currentPageName }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const items = [
    { page: "Pipes", label: t("nav.pipes"), semanticIcon: "pipe" },
    { page: "Tobacco", label: t("nav.tobacco"), icon: Leaf },
    { page: "SessionHistory", label: t("sessionHistory.title", "Session History"), icon: CalendarDays },
    { page: "Insights", label: t("nav.insights"), icon: TrendingUp },
  ];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        {items.map((item) => (
          <NavItem
            key={item.page}
            item={item}
            active={currentPageName === item.page}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={() => navigate('/Pipes?action=add')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('quickActions.addPipe')}
          aria-label={t('quickActions.addPipe')}
        >
          <PipeIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t('quickActions.addPipe')}</span>
        </Button>
        <Button
          onClick={() => navigate('/Tobacco?action=add')}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          title={t('quickActions.addBlend')}
          aria-label={t('quickActions.addBlend')}
        >
          <Leaf className="w-4 h-4" />
          <span className="hidden sm:inline">{t('quickActions.addBlend')}</span>
        </Button>
        <Button
          onClick={() => navigate('/Import?type=pipekeeper_pipes')}
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
