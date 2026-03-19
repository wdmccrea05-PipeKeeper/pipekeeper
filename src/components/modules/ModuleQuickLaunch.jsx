import React from "react";
import PipeIcon from "@/components/icons/PipeIcon";
import WhiskeyBottleIcon from "@/components/icons/WhiskeyBottleIcon";

export default function ModuleQuickLaunch({ actions = [] }) {
  function renderIcon(action) {
    if (action.semanticIcon === "pipe") {
      return <PipeIcon className="w-5 h-5" color="rgba(180,140,75,0.95)" />;
    }
    if (action.semanticIcon === "bottle") {
      return <WhiskeyBottleIcon className="w-5 h-5" color="rgba(180,140,75,0.95)" />;
    }
    if (action.iconImage) {
      return (
        <img
          src={action.iconImage}
          alt=""
          className="w-7 h-7 object-contain"
          style={{ backgroundColor: "transparent" }}
          draggable={false}
        />
      );
    }
    if (action.Icon) {
      const Icon = action.Icon;
      return <Icon className="w-4 h-4" style={{ color: "rgba(180,140,75,0.95)" }} />;
    }
    return <PipeIcon className="w-5 h-5" color="rgba(180,140,75,0.95)" />;
  }

  if (!actions.length) return null;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "linear-gradient(145deg, rgba(52,37,24,0.82), rgba(42,30,20,0.92))",
        border: "1px solid rgba(120,90,65,0.32)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
      }}
    >
      <h3
        className="text-xs uppercase tracking-[0.14em] font-semibold mb-5"
        style={{ color: "rgba(180,140,75,0.85)" }}
      >
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center gap-3 p-5 min-h-[118px] w-full rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
            aria-label={action.label}
            style={{
              background: "linear-gradient(145
