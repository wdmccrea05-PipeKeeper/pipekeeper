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
  Cigarette,
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
        icon: Cigarette,
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

  // Shared scroll nav for mobile + tablet (below lg)
  const scrollNav = (
    <div className="relative lg:hidden w-full">
      {/* Left fade edge */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10"
        style={{ background: 'linear-gradient(to right, rgba(20,15,12,0.9), transparent)' }} />
      {/* Right fade edge */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10"
        style={{ background: 'linear-gradient(to left, rgba(20,15,12,0.9), transparent)' }} />

      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {items.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 border",
                isActive
                  ? "bg-[rgba(100,66,34,0.55)] border-[rgba(180,140,75,0.38)]"
                  : "border-[rgba(180,140,75,0.2)] bg-[rgba(255,255,255,0.04)]"
              )}
              style={{ color: isActive ? "#F5F1E7" : "rgba(224,216,200,0.76)" }}
            >
              {item.icon ? (
                <item.icon
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: isActive ? "#D4A574" : "rgba(180,140,75,0.72)" }}
                />
              ) : null}
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-1 pb-1 min-w-0 w-full">
      {/* Desktop: wrap */}
      <div className="hidden lg:flex flex-wrap items-center gap-1">
        {items.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <NavItem
              key={item.page}
              item={item}
              isActive={isActive}
            />
          );
        })}
      </div>

      {/* Mobile + Tablet: horizontal scrollable pills */}
      {scrollNav}
    </div>
  );
}