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
  TestTube2,
  List,
} from "lucide-react";
import PipeIcon from "@/components/icons/PipeIcon";
import WhiskeyKeeperIcon from "@/components/icons/WhiskeyKeeperIcon";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";

function NavItem({ item, isActive }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        isActive ? "bg-[#6b4a2d]/55" : "hover:bg-white/5"
      )}
      style={{
        color: isActive ? "#F5F1E7" : "rgba(224,216,200,0.78)",
        border: isActive
          ? "1px solid rgba(180,140,75,0.35)"
          : "1px solid transparent",
      }}
    >
      {item.icon ? (
        <item.icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: isActive ? "#D4A574" : "rgba(180,140,75,0.78)" }}
        />
      ) : null}
      <span className="line-clamp-1">{item.label}</span>
    </Link>
  );
}

export default function ModuleNav({ currentPageName, user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const access = useAccessSummary();

  const isAdmin =
    user?.role === "admin" ||
    user?.is_admin === true ||
    user?.isAdmin === true;

  const activeModules = access?.activeModules || [];

  const moduleItems = useMemo(() => {
    const items = [];

    if (activeModules.includes("pipekeeper")) {
      items.push({
        page: "PipeKeeper",
        label: "PipeKeeper",
        icon: PipeIcon,
        path: "/PipeKeeper",
      });
    }

    if (activeModules.includes("whiskeykeeper")) {
      items.push({
        page: "WhiskeyKeeper",
        label: "WhiskeyKeeper",
        icon: WhiskeyKeeperIcon,
        path: "/WhiskeyKeeper",
      });
    }

    return items;
  }, [activeModules]);

  const baseItems = [
    { page: "CollectionHub", label: "Hub", icon: Home, path: "/" },
    ...moduleItems,
    { page: "WantList", label: "Want List", icon: List, path: "/WantList" },
    { page: "Curator", label: "Curator", icon: Target, path: "/Curator" },
    { page: "Community", label: "Community", icon: Users, path: "/Community" },
    { page: "Profile", label: "Profile", icon: User, path: "/Profile" },
    { page: "HelpCenter", label: "Help", icon: HelpCircle, path: "/HelpCenter" },
  ];

  const adminItems = isAdmin
    ? [
        {
          page: "AdminReports",
          label: "Admin Reports",
          icon: Shield,
          path: "/AdminReports",
        },
        {
          page: "AdminSubscriptionRequests",
          label: "Subscription Requests",
          icon: ClipboardList,
          path: "/AdminSubscriptionRequests",
        },
        {
          page: "AdminSubscriptionTools",
          label: "Subscription Tools",
          icon: Wrench,
          path: "/AdminSubscriptionTools",
        },
        {
          page: "UserReport",
          label: "User Report",
          icon: FileBarChart2,
          path: "/UserReport",
        },
        {
          page: "CuratorAnalyticsDashboard",
          label: "Curator Analytics",
          icon: BarChart3,
          path: "/CuratorAnalyticsDashboard",
        },
        {
          page: "SubscriptionE2ETest",
          label: "Sub E2E Test",
          icon: TestTube2,
          path: "/SubscriptionE2ETest",
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: "rgba(224,216,200,0.78)" }}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

        {mobileOpen && (
          <div className="absolute top-10 left-0 bg-[#1d1511] border border-[rgba(180,140,75,0.35)] rounded-lg shadow-lg z-50 min-w-[200px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto">
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