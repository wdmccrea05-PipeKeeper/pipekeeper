import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  HelpCircle,
  Target,
  Users,
  Shield,
  ClipboardList,
  Wrench,
  FileBarChart2,
  BarChart3,
  List,
  Flame,
  Wine,
} from "lucide-react";
import PipeIcon from "@/components/icons/PipeIcon";
import WhiskeyKeeperIcon from "@/components/icons/WhiskeyKeeperIcon";
import { useEnabledModules } from "@/components/hooks/useEnabledKeeperModules";
import { useTranslation } from "@/components/i18n/safeTranslation";

function NavItem({ item, isActive }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      className={cn(
        "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-[rgba(100,66,34,0.55)] border border-[rgba(180,140,75,0.38)]"
          : "border border-transparent hover:bg-white/6 hover:border-[rgba(180,140,75,0.15)]"
      )}
      style={{ color: isActive ? "#F5F1E7" : "rgba(224,216,200,0.76)" }}
    >
      {item.icon ? (
        <item.icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: isActive ? "#D4A574" : "rgba(180,140,75,0.72)" }}
        />
      ) : null}
      <span className="line-clamp-1">{item.label}</span>
    </Link>
  );
}

export default function ModuleNav({ currentPageName, user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { enabled } = useEnabledModules();

  const isAdmin =
    user?.role === "admin" ||
    user?.is_admin === true ||
    user?.isAdmin === true;

  const moduleItems = useMemo(() => {
    const items = [];

    if (enabled.pipekeeper) {
      items.push({
        page: "PipeKeeper",
        label: t("nav.pipekeeper"),
        icon: PipeIcon,
        path: "/PipeKeeper",
      });
    }

    if (enabled.whiskeykeeper) {
      items.push({
        page: "WhiskeyKeeper",
        label: t("nav.whiskeykeeper"),
        icon: WhiskeyKeeperIcon,
        path: "/WhiskeyKeeper",
      });
    }

    if (enabled.cigarkeeper) {
      items.push({
        page: "CigarKeeper",
        label: t("nav.cigarkeeper"),
        icon: Flame,
        path: "/CigarKeeper",
      });
    }

    if (enabled.winekeeper) {
      items.push({
        page: "WineKeeper",
        label: t("nav.winekeeper", "WineKeeper"),
        icon: Wine,
        path: "/WineKeeper",
      });
    }

    return items;
  }, [enabled, t]);

  const baseItems = [
    { page: "CollectionHub", label: t("nav.hub"), icon: Home, path: "/" },
    ...moduleItems,
    { page: "WantList", label: t("nav.wantList"), icon: List, path: "/WantList" },
    { page: "Curator", label: t("nav.curator"), icon: Target, path: "/Curator" },
    { page: "Community", label: t("nav.community"), icon: Users, path: "/Community" },
    { page: "Profile", label: t("nav.profile"), icon: User, path: "/Profile" },
    { page: "HelpCenter", label: t("nav.help"), icon: HelpCircle, path: "/HelpCenter" },
  ];

  const adminItems = isAdmin
    ? [
        {
          page: "AdminReports",
          label: t("nav.adminReports"),
          icon: Shield,
          path: "/AdminReports",
        },
        {
          page: "AdminSubscriptionRequests",
          label: t("nav.subscriptionRequests"),
          icon: ClipboardList,
          path: "/AdminSubscriptionRequests",
        },
        {
          page: "AdminSubscriptionTools",
          label: t("nav.subscriptionTools"),
          icon: Wrench,
          path: "/AdminSubscriptionTools",
        },
        {
          page: "UserReport",
          label: t("nav.userReport"),
          icon: FileBarChart2,
          path: "/UserReport",
        },
        {
          page: "CuratorAnalyticsDashboard",
          label: t("nav.curatorAnalytics"),
          icon: BarChart3,
          path: "/CuratorAnalyticsDashboard",
        },
      ]
    : [];

  const items = [...baseItems, ...adminItems];

  return (
    <div className="flex items-center gap-1 pb-1 min-w-0">
      <div className="hidden md:flex flex-wrap items-center gap-1">
        {items.map((item) => (
          <NavItem
            key={item.page}
            item={item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}
      </div>

      <div className="md:hidden relative">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/6 border border-transparent hover:border-[rgba(180,140,75,0.18)]"
          style={{ color: "rgba(224,216,200,0.78)" }}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

        {mobileOpen && (
          <div className="absolute top-12 left-0 bg-[rgba(22,16,12,0.98)] border border-[rgba(180,140,75,0.28)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.65)] z-50 min-w-[220px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto py-2">
            {items.map((item) => {
              const isActive = location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/5 border-b border-[rgba(180,140,75,0.16)] last:border-b-0 whitespace-nowrap",
                    isActive && "bg-[#6b4a2d]/55"
                  )}
                  style={{
                    color: isActive ? "#F5F1E7" : "rgba(224,216,200,0.78)",
                  }}
                >
                  {item.icon ? (
                    <item.icon
                      className="w-4 h-4 flex-shrink-0"
                      style={{
                        color: isActive
                          ? "#D4A574"
                          : "rgba(180,140,75,0.78)",
                      }}
                    />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}