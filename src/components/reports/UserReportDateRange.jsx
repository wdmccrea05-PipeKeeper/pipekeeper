import React from 'react';

export default function UserReportDateRange({
  options,
  value,
  onChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  rangeStart,
  rangeEnd,
}) {
  return (
    <div className="rounded-xl border border-[#8b6239]/25 bg-[#1f1712]/70 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-[#D4A574] whitespace-nowrap">Reporting period:</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-2 min-w-[160px]"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {rangeStart && rangeEnd && (
          <span className="text-xs text-[#E0D8C8]/50">
            ({new Date(rangeStart).toLocaleDateString()} → {new Date(rangeEnd).toLocaleDateString()})
          </span>
        )}
      </div>
      {value === 'custom' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[#E0D8C8]/70">Start:</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-2"
          />
          <label className="text-sm text-[#E0D8C8]/70">End:</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="rounded-lg border border-[#8b6239]/40 bg-[#140f0c] text-[#E0D8C8] text-sm px-3 py-2"
          />
        </div>
      )}
    </div>
  );
}