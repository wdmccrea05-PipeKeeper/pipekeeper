import React from "react";
import { Link } from "react-router-dom";
import { TEXT_CAPTION, TEXT_PRIMARY } from "@/lib/theme/tokens";

function formatValue(value, column) {
  if (value == null || value === "") return "—";
  if (column?.format === "currency") {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(value);
  }
  if (column?.format === "percent") return `${value}%`;
  if (column?.format === "rating") return `${value} ★`;
  if (column?.format === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  }
  if (column?.format === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
  }
  return String(value);
}

/** A report table. Rows that carry a record id open that record. */
export default function ReportTable({ table }) {
  if (!table || table.rows.length === 0) {
    return (
      <div className="rounded-xl p-5 text-sm" style={{ border: "1px solid rgba(180,140,75,0.16)", color: TEXT_CAPTION }}>
        {table?.title}: nothing to show in the current filter.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(180,140,75,0.16)" }}>
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(180,140,75,0.14)" }}>
        <h3 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{table.title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-3 py-2 font-semibold whitespace-nowrap"
                  style={{ color: TEXT_CAPTION, textAlign: column.align === "right" ? "right" : "left", fontSize: 12 }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr key={`${table.id}-${row.id || index}-${index}`} style={{ borderTop: "1px solid rgba(180,140,75,0.10)" }}>
                {table.columns.map((column, columnIndex) => {
                  const value = formatValue(row[column.key], column);
                  const isName = columnIndex === 0 && row.detailPath;
                  return (
                    <td
                      key={column.key}
                      className="px-3 py-2 align-top"
                      style={{ color: TEXT_PRIMARY, textAlign: column.align === "right" ? "right" : "left", minWidth: 70 }}
                    >
                      {isName ? (
                        <Link to={row.detailPath} className="underline decoration-dotted underline-offset-2" style={{ color: "#D4A574" }}>
                          {value}
                        </Link>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && (
        <p className="px-4 py-2 text-xs" style={{ color: TEXT_CAPTION, borderTop: "1px solid rgba(180,140,75,0.10)" }}>
          {table.note}
        </p>
      )}
    </div>
  );
}