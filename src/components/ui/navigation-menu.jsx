import React from "react";
import { Link, useLocation } from "react-router-dom";
import { isModuleEnabled } from "@/components/utils/moduleGuard";

export default function MainNav({ user }) {
  const location = useLocation();

  if (!user) return null;

  const modules = [
    { key: "pipe", label: "PipeKeeper", path: "/pipes" },
    { key: "whiskey", label: "WhiskeyKeeper", path: "/whiskey" },
  ];

  const activeModules = modules.filter(m =>
    isModuleEnabled(user, m.key)
  );

  return (
    <div className="flex items-center gap-4">
      {/* HUB */}
      <Link
        to="/"
        className={`nav-link ${
          location.pathname === "/" ? "active" : ""
        }`}
      >
        Hub
      </Link>

      {/* MODULE LINKS */}
      {activeModules.map(m => (
        <Link
          key={m.key}
          to={m.path}
          className={`nav-link ${
            location.pathname.startsWith(m.path)
              ? "active"
              : ""
          }`}
        >
          {m.label}
        </Link>
      ))}

      {/* STATIC NAV */}
      <Link to="/curator" className="nav-link">Curator</Link>
      <Link to="/community" className="nav-link">Community</Link>
      <Link to="/profile" className="nav-link">Profile</Link>
      <Link to="/help" className="nav-link">Help</Link>
      <Link to="/admin" className="nav-link">Admin Reports</Link>
      <Link to="/subscriptions" className="nav-link">Subscription Requests</Link>
      <Link to="/tools" className="nav-link">Subscription Tools</Link>
      <Link to="/reports" className="nav-link">User Report</Link>
    </div>
  );
}
