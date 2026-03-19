import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Leaf, TrendingUp, BookOpen, Search } from "lucide-react";
import PipeIcon from "@/components/icons/PipeIcon";

function NavItem({ item, active }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
      style={{
        color: active ? "#F5F1E7" : "rgba(224,216,200,0.78)",
        border: active ? "1px solid rgba(180,140,75,0.35)" : "1px solid transparent",
        background: active ? "rgba(107,74,45,0.55)" : "transparent",
      }}
    >
      {item.semanticIcon === "pipe" ? (
        <PipeIcon className="w-4 h-4" color={active ? "#D4A574" : "rgba(180,140,75,0.78)"} />
      ) : (
        <item.icon
          className="w-4 h-4"
          style={{ color: active ? "#D4A574" : "rgba(180,140,75,0.78)" }}
        />
      )}
      <span>{item.label}</span>
    </Link>
  );
}

export default function PipeKeeperModuleNav({ currentPageName }) {
  const items = [
    { page: "Pipes", label: "Pipes", semanticIcon: "pipe" },
    { page: "Tobacco", label: "Tobacco", icon: Leaf },
    { page: "Insights", label: "Insights", icon: TrendingUp },
    { page: "PipeSessions", label: "Sessions", icon: BookOpen },
    { page: "PipeSearch", label: "Search", icon: Search },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => (
        <NavItem
          key={item.page}
          item={item}
          active={currentPageName === item.page}
        />
      ))}
    </div>
  );
}
