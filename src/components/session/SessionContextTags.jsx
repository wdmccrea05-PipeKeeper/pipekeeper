import React from "react";
import { useTranslation } from '@/components/i18n/safeTranslation';

const TAGS = ["Pipe Club", "Restaurant / Bar", "Friend's House", "Event", "Lounge / Shop", "Other"];

export default function SessionContextTags({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-sm font-medium text-[#E0D8C8]/80 mb-2">{t("auto.components_session_SessionContextTags.session_context_1jlv2r")} <span className="text-xs text-[#E0D8C8]/40 font-normal">{t("auto.components_session_SessionContextTags.optional_1579kp")}</span></p>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const active = value === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(active ? "" : tag)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={{
                background: active ? "rgba(180,140,75,0.22)" : "rgba(255,255,255,0.04)",
                borderColor: active ? "rgba(180,140,75,0.5)" : "rgba(180,140,75,0.15)",
                color: active ? "#D4A574" : "rgba(224,216,200,0.6)",
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}