import React from "react";

const TAGS = ["Pipe Club", "Restaurant / Bar", "Friend's House", "Event", "Lounge / Shop", "Other"];

export default function SessionContextTags({ value, onChange }) {
  return (
    <div>
      <p className="text-sm font-medium text-[#E0D8C8]/80 mb-2">Session Context <span className="text-xs text-[#E0D8C8]/40 font-normal">(optional)</span></p>
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