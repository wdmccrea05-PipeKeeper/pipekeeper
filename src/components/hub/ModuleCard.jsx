import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n/safeTranslation";

function ModuleImageIcon({ src, alt }) {
  return (
    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-transparent">
      <img
        src={src}
        alt={alt}
        className="w-12 h-12 object-contain bg-transparent"
        style={{
          backgroundColor: "transparent",
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.28))",
          mixBlendMode: "normal",
        }}
        draggable={false}
      />
    </div>
  );
}

export default function ModuleCard({
  module,
  icon,
  itemCount,
  summary,
  action,
  isComingSoon,
  stats = [],
  bgImage = null,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleOpen = () => {
    if (!isComingSoon && action) navigate(`/${action}`);
  };

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden transition-all duration-300 relative",
        isComingSoon ? "opacity-90 cursor-default" : "cursor-pointer hover:shadow-xl"
      )}
      style={{
        background: "linear-gradient(145deg, rgba(50, 35, 22, 0.92), rgba(32, 22, 14, 0.97))",
        border: isComingSoon
          ? "1px solid rgba(139,98,57,0.2)"
          : "1px solid rgba(139,98,57,0.4)",
        boxShadow: isComingSoon
          ? "0 4px 16px rgba(0,0,0,0.35)"
          : "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,164,116,0.08)",
      }}
    >
      {bgImage ? (
        <>
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(3px)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 40%, rgba(212,164,116,0.08) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(100,70,45,0.08) 0%, transparent 40%, rgba(0,0,0,0.25) 100%)",
          pointerEvents: "none",
        }}
      />

      <div className="p-6 space-y-4 relative z-10">
        <div className="flex items-start gap-3">
          {icon ? (
            typeof icon === "string" ? (
              <ModuleImageIcon src={icon} alt={module} />
            ) : typeof icon === "function" ? (
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                {React.createElement(icon, {
                  className: "w-6 h-6",
                  style: { color: "rgba(212,164,116,0.9)" },
                })}
              </div>
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-transparent">
                <span className="text-2xl">{icon}</span>
              </div>
            )
          ) : null}

          <div className="min-w-0 flex-1">
            <h3
              className="text-lg font-semibold break-words"
              style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}
            >
              {module}
            </h3>

            {isComingSoon ? (
              <p
                className="text-xs font-medium mt-1"
                style={{ color: "rgba(180,140,75,0.7)", letterSpacing: "0.08em" }}
              >
                {t("hub.comingSoon")}
              </p>
            ) : null}
          </div>
        </div>

        {!isComingSoon ? (
          <div
            className="space-y-1.5 rounded-lg p-3"
            style={{
              background: "rgba(15,10,6,0.5)",
              border: "1px solid rgba(139,98,57,0.2)",
            }}
          >
            {stats.length > 0 ? (
              stats.map((stat, i) => (
                <div
                  key={`${stat.label}-${i}`}
                  className={cn("flex flex-col gap-1", i > 0 && "pt-1.5 border-t border-[#8b6239]/20")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm" style={{ color: "rgba(224,216,200,0.65)" }}>
                      {stat.label}
                    </span>
                    <span
                      className={cn("font-semibold", i === 0 ? "text-lg" : "text-sm")}
                      style={{ color: i === 0 ? "#D4A574" : "#E0D8C8" }}
                    >
                      {stat.value}
                    </span>
                  </div>

                  {stat.sub ? (
                    <span className="text-xs" style={{ color: "rgba(224,216,200,0.5)" }}>
                      {stat.sub}
                    </span>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "rgba(224,216,200,0.65)" }}>
                  {t("hub.items")}
                </span>
                <span className="text-lg font-semibold" style={{ color: "#D4A574" }}>
                  {itemCount}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "rgba(224,216,200,0.5)" }}>
            {t("hub.expandingEcosystem")}
          </p>
        )}

        {!isComingSoon ? (
          <Button
            onClick={handleOpen}
            className="w-full justify-between group"
            style={{
              background: "linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))",
              border: "1px solid rgba(139,98,57,0.4)",
              color: "#E0D8C8",
            }}
          >
            <span>{t("hub.openModule")}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
