import React, { useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import {
  MODULE_ICONS,
  getAssetImageStyle,
} from "@/components/branding/moduleAssets";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

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
        border: active
          ? "1px solid rgba(180,140,75,0.35)"
          : "1px solid transparent",
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
      <span className="line-clamp-1">{item.label}</span>
    </Link>
  );
}

export default function ModuleNav({ currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { enabledModules, isModuleEnabled } = useEnabledKeeperModules();
  const { isAdmin } = useCurrentUser();

  const enabledKeys = new Set((enabledModules || []).map((m) => m.moduleKey));
  const whiskeyOpenable = isModuleEnabled?.("whiskeykeeper") === true;

  const items = [
    { page: "CollectionHub", label: "Hub", icon: Home },

    ...(enabledKeys.has("pipekeeper")
      ? [
          {
            page: "PipeKeeper",
            label: "PipeKeeper",
            image: MODULE_ICONS.pipekeeper,
            assetKey: "pipekeeper",
          },
        ]
      : []),

    ...(whiskeyOpenable
      ? [
          {
            page: "WhiskeyKeeper",
            label: "WhiskeyKeeper",
            image: MODULE_ICONS.whiskeykeeper,
            assetKey: "whiskeykeeper",
          },
        ]
      : []),

    { page: "Curator", label: "Curator", icon: Target },
    { page: "Community", label: "Community", icon: Users },
    { page: "Profile", label: "Profile", icon: User },
    { page: "HelpCenter", label: "Help", icon: HelpCircle },

    ...(isAdmin
      ? [
          {
            page: "AdminReports",
            label: "Admin Reports",
            icon: Shield,
          },
          {
            page: "AdminSubscriptionRequests",
            label: "Subscription Requests",
            icon: ClipboardList,
          },
          {
            page: "AdminSubscriptionTools",
            label: "Subscription Tools",
            icon: Wrench,
          },
          {
            page: "UserReport",
            label: "User Report",
            icon: FileBarChart2,
          },
          {
            page: "CuratorAnalyticsDashboard",
            label: "Curator Analytics",
            icon: BarChart3,
          },
          {
            page: "SubscriptionE2ETest",
            label: "Sub E2E Test",
            icon: TestTube2,
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center gap-1 pb-1 min-w-0">
      {/* Desktop nav */}
      <div className="hidden md:flex flex-wrap items-center gap-1">
        {items.map((item) => (
          <NavItem
            key={item.page}
            item={item}
            currentPageName={currentPageName}
          />
        ))}
      </div>

      {/* Mobile dropdown menu */}
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
            {items.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/5 border-b border-[rgba(180,140,75,0.16)] last:border-b-0 whitespace-nowrap",
                  currentPageName === item.page && "bg-[#6b4a2d]/55"
                )}
                style={{
                  color: currentPageName === item.page ? "#F5F1E7" : "rgba(224,216,200,0.78)",
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
                    style={{ color: currentPageName === item.page ? "#D4A574" : "rgba(180,140,75,0.78)" }}
                  />
                ) : null}
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}