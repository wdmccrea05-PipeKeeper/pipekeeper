import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Curator answer body.
 *
 * The first block is always shown, so the direct answer is what the collector
 * reads. Everything after it in a long reply sits behind one quiet
 * "Show details" control. Tables stay compact and become stacked rows on
 * phones, so nothing needs sideways scrolling.
 */

const splitCells = (line) =>
  String(line)
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

export function splitMessageBlocks(content = '') {
  const lines = String(content || '').split('\n');
  const blocks = [];
  let buffer = [];

  const flush = () => {
    if (buffer.length) {
      blocks.push({ type: 'text', lines: buffer });
      buffer = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const isTableStart =
      /^\|.+\|/.test(line) &&
      i + 1 < lines.length &&
      /^\|[-:| ]+\|/.test(lines[i + 1]);

    if (isTableStart) {
      flush();
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      i -= 1;
      const [headerRow, , ...bodyRows] = tableLines;
      blocks.push({
        type: 'table',
        headers: splitCells(headerRow),
        rows: bodyRows.map(splitCells).filter((row) => row.length > 0),
      });
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    buffer.push(line);
  }

  flush();
  return blocks;
}

function TextBlock({ lines }) {
  return (
    <>
      {lines.map((line, index) => {
        if (/^#{1,3}\s/.test(line)) {
          return (
            <div
              key={index}
              className="font-semibold text-[15px] mt-2.5 mb-1 break-words"
              style={{ color: '#F5F5F7' }}
            >
              {line.replace(/^#{1,3}\s/, '')}
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={index} className="ml-1 my-1 break-words" style={{ color: '#E8E4DC' }}>
              {line}
            </div>
          );
        }
        if (/^[-•]\s/.test(line)) {
          return (
            <div key={index} className="ml-2 my-0.5 break-words" style={{ color: '#C8C0B0' }}>
              {line}
            </div>
          );
        }
        return (
          <div key={index} className="my-0.5 break-words">
            {line}
          </div>
        );
      })}
    </>
  );
}

function TableBlock({ headers = [], rows = [] }) {
  return (
    <div className="my-2.5">
      {/* Phones: one stacked row per record, no horizontal scrolling */}
      <div className="sm:hidden space-y-1.5">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="rounded-lg px-3 py-2 min-w-0"
            style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="text-[13px] font-semibold break-words" style={{ color: '#F5F1E7' }}>
              {row[0]}
            </div>
            {row.slice(1).map((cell, cellIndex) => (
              <div key={cellIndex} className="text-[12.5px] leading-5 break-words" style={{ color: '#C8C0B0' }}>
                {headers[cellIndex + 1] ? (
                  <span style={{ color: '#8A8578' }}>{headers[cellIndex + 1]}: </span>
                ) : null}
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tablet and up: compact fixed table */}
      <div
        className="hidden sm:block rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <table className="w-full text-[12.5px] table-fixed">
          <thead>
            <tr style={{ background: 'rgba(198,161,91,0.12)' }}>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-2.5 py-2 text-left font-semibold break-words"
                  style={{ color: '#C6A15B', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2.5 py-2 break-words" style={{ color: '#E8E4DC' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CuratorMessageContent({ content = '', collapsible = true }) {
  const blocks = useMemo(() => splitMessageBlocks(content), [content]);
  const [expanded, setExpanded] = useState(false);

  const isLong = collapsible && blocks.length > 1 && String(content).length > 420;
  const visibleBlocks = isLong && !expanded ? blocks.slice(0, 1) : blocks;
  const hiddenCount = Math.max(0, blocks.length - 1);

  return (
    <div className="min-w-0">
      {visibleBlocks.map((block, index) =>
        block.type === 'table' ? (
          <TableBlock key={`block-${index}`} headers={block.headers} rows={block.rows} />
        ) : (
          <TextBlock key={`block-${index}`} lines={block.lines} />
        )
      )}

      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
          style={{ color: '#C6A15B', minHeight: 36 }}
        >
          {expanded ? 'Show less' : `Show details (${hiddenCount} more)`}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      ) : null}
    </div>
  );
}