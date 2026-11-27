import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GOLD_PALETTE, TEXT_CAPTION, TEXT_PRIMARY } from "@/lib/theme/tokens";

/**
 * One chart renderer for the Reporting Center.
 * Every bar and slice is clickable and opens the records behind it.
 */
export default function ReportChart({ chart, onDrill }) {
  const data = (chart?.data || []).filter((row) => Number.isFinite(Number(row.value)));
  if (data.length === 0) {
    return (
      <div className="rounded-xl p-6 text-sm" style={{ border: "1px solid rgba(180,140,75,0.16)", color: TEXT_CAPTION }}>
        {chart?.title}: no data in the current filter.
      </div>
    );
  }

  const drill = (entry) => {
    const name = entry?.name || entry?.payload?.name || entry?.payload?.payload?.name;
    if (!name) return;
    const ids = chart?.drillIds?.[name] || [];
    if (typeof onDrill === "function") onDrill({ title: `${chart.title} · ${name}`, ids });
  };

  const isInteractive = Boolean(chart?.drillIds) && typeof onDrill === "function";
  const axisProps = {
    stroke: "rgba(224,216,200,0.35)",
    tick: { fill: "rgba(224,216,200,0.62)", fontSize: 11 },
    tickLine: false,
  };

  return (
    <figure className="rounded-xl p-4" style={{ border: "1px solid rgba(180,140,75,0.16)" }}>
      <figcaption className="text-sm font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>
        {chart.title}
      </figcaption>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          {chart.type === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                onClick={(entry) => isInteractive && drill(entry)}
                cursor={isInteractive ? "pointer" : "default"}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={GOLD_PALETTE[index % GOLD_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#241913", border: "1px solid rgba(180,140,75,0.3)", fontSize: 12 }} />
            </PieChart>
          ) : chart.type === "line" ? (
            <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="rgba(180,140,75,0.12)" vertical={false} />
              <XAxis dataKey="name" {...axisProps} interval="preserveStartEnd" />
              <YAxis {...axisProps} width={44} />
              <Tooltip contentStyle={{ background: "#241913", border: "1px solid rgba(180,140,75,0.3)", fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="#D4A574" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="rgba(180,140,75,0.12)" vertical={false} />
              <XAxis dataKey="name" {...axisProps} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 58 : 30} />
              <YAxis {...axisProps} width={44} />
              <Tooltip contentStyle={{ background: "#241913", border: "1px solid rgba(180,140,75,0.3)", fontSize: 12 }} />
              <Bar
                dataKey="value"
                fill="#B48C4B"
                radius={[4, 4, 0, 0]}
                cursor={isInteractive ? "pointer" : "default"}
                onClick={(entry) => isInteractive && drill(entry)}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {isInteractive && (
        <p className="mt-2 text-xs" style={{ color: TEXT_CAPTION }}>
          Select a bar or slice to open the records behind it.
        </p>
      )}
    </figure>
  );
}