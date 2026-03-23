import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n/safeTranslation";
import {
  Home,
  User,
  HelpCircle,
  Target,
  Users,
  Shield,
  FileBarChart2,
  ClipboardList,
  Wrench,
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
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
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
      <span>{item.label}</span>
    </Link>
  );
}

export default function ModuleNav({ currentPageName }) {
  const { t } = useTranslation();
  const { enabledModules, isModuleEnabled } = useEnabledKeeperModules();
  const { isAdmin } = useCurrentUser();

  const enabledKeys = new Set((enabledModules || []).map((m) => m.moduleKey));
  const whiskeyOpenable = isModuleEnabled?.("whiskeykeeper") === true;

  const primaryItems = [
    { page: "CollectionHub", label: t("nav.hub", "Hub"), icon: Home },

    ...(enabledKeys.has("pipekeeper")
      ? [
          {
            page: "PipeKeeper",
            label: t("nav.pipekeeper", "PipeKeeper"),
            image: MODULE_ICONS.pipekeeper,
            assetKey: "pipekeeper",
          },
        ]
      : []),

    ...(whiskeyOpenable
      ? [
          {
            page: "WhiskeyKeeper",
            label: t("nav.whiskeykeeper", "WhiskeyKeeper"),
            image: MODULE_ICONS.whiskeykeeper,
            assetKey: "whiskeykeeper",
          },
        ]
      : []),

    { page: "Curator", label: t("nav.curator", "Curator"), icon: Target },
    { page: "Community", label: t("nav.community", "Community"), icon: Users },
    { page: "Profile", label: t("nav.profile", "Profile"), icon: User },
    { page: "HelpCenter", label: t("nav.help", "Help"), icon: HelpCircle },
  ];

  const adminItems = isAdmin
    ? [
        {
          page: "AdminReports",
          label: t("nav.adminReports", "Admin Reports"),
          icon: Shield,
        },
        {
          page: "AdminSubscriptionRequests",
          label: t("nav.subRequests", "Subscription Requests"),
          icon: ClipboardList,
        },
        {
          page: "AdminSubscriptionTools",
          label: t("nav.subTools", "Subscription Tools"),
          icon: Wrench,
        },
        {
          page: "UserReport",
          label: t("nav.userReport", "User Report"),
          icon: FileBarChart2,
        },
        {
          page: "CuratorAnalyticsDashboard",
          label: t("nav.curatorAnalytics", "Curator Analytics"),
          icon: BarChart3,
        },
        {
          page: "SubscriptionE2ETest",
          label: t("nav.e2eTest", "Sub E2E Test"),
          icon: TestTube2,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {primaryItems.map((item) => (
          <NavItem
            key={item.page}
            item={item}
            currentPageName={currentPageName}
          />
        ))}
      </div>

      {adminItems.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-t border-white/10 pt-2">
          {adminItems.map((item) => (
            <NavItem
              key={item.page}
              item={item}
              currentPageName={currentPageName}
            />
          ))}
        </div>
      )}
    </div>
  );
}