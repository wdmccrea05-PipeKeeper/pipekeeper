import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { cn } from "@/lib/utils";
import { Home, User, HelpCircle, Target, Users } from "lucide-react";
import { MODULE_ICONS, getAssetImageStyle } from "@/components/branding/moduleAssets";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

function NavItem({ item, currentPageName }) {
  const active = currentPageName === item.page;

  return (
    <Link
      to={createPageUrl(item.page)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
        active ? "bg-[#6b4a2d]/55" : "hover:bg-white/5"
      )}
      style={{
        color: active ? "#F5F1E7" : "rgba(224,216,200,0.78)",
      }}
    >
      {item.image ? (
        <img
          src={item.image}
          className="w-4 h-4"
          style={getAssetImageStyle(item.assetKey)}
        />
      ) : (
        <item.icon className="w-4 h-4" />
      )}
      {item.label}
    </Link>
  );
}

export default function ModuleNav({ currentPageName }) {
  const { enabledModules, isModuleEnabled } = useEnabledKeeperModules();
  const { isAdmin } = useCurrentUser();

  const hasPipe = enabledModules?.some((m) => m.moduleKey === "pipekeeper");
  const whiskeyEnabled = isModuleEnabled?.("whiskeykeeper");

  const items = [
    { page: "CollectionHub", label: "Hub", icon: Home },
    ...(hasPipe
      ? [
          {
            page: "PipeKeeper",
            label: "PipeKeeper",
            image: MODULE_ICONS.pipekeeper,
            assetKey: "pipekeeper",
          },
        ]
      : []),
    ...(whiskeyEnabled
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
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto">
        {items.map((item) => (
          <NavItem key={item.page} item={item} currentPageName={currentPageName} />
        ))}
      </div>

      {isAdmin && (
        <div className="flex gap-1 border-t border-white/10 pt-2">
          <NavItem page="AdminReports" item={{ page: "AdminReports", label: "Admin Reports", icon: Target }} />
          <NavItem page="SubscriptionTools" item={{ page: "SubscriptionTools", label: "Subscription Tools", icon: Target }} />
        </div>
      )}
    </div>
  );
}