import React from "react";
import { Link, useLocation } from "react-router-dom";
import { isModuleEnabled } from "@/components/utils/moduleGuard";

export default function ModuleNav({ user }) {
  const location = useLocation();

  if (!user) return null;

  const modules = [
    {
      key: "pipe",
      label: "PipeKeeper",
      path: "/pipes",
    },
    {
      key: "whiskey",
      label: "WhiskeyKeeper",
      path: "/whiskey",
    },
  ];

  const activeModules = modules.filter(m =>
    isModuleEnabled(user, m.key)
  );

  return (
    <div className="flex items-center gap-2">
      {/* HUB ALWAYS FIRST */}
      <Link
        to="/"
        className={`nav-link ${
          location.pathname === "/" ? "active" : ""
        }`}
      >
        Hub
      </Link>

      {/* ACTIVE MODULES ONLY */}
      {activeModules.map(module => (
        <Link
          key={module.key}
          to={module.path}
          className={`nav-link ${
            location.pathname.startsWith(module.path)
              ? "active"
              : ""
          }`}
        >
          {module.label}
        </Link>
      ))}
    </div>
  );
}
