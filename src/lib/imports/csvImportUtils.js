const COMPACT_SPACE = /\s+/g;
const MIN_RATING = 0;
const MAX_RATING = 5;

export function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.length > 1 || String(row[0] || '').trim() !== '') rows.push(row);

  if (!rows.length) {
    return {
      headers: [],
      rawHeaders: [],
      rows: [],
      duplicateHeaders: [],
      parseErrors: ['No CSV data found.'],
    };
  }

  const rawHeaders = rows[0].map((h) => String(h || '').trim());
  const headers = rawHeaders.map(normalizeHeader);

  const dupCounts = headers.reduce((acc, header) => {
    if (!header) return acc;
    acc[header] = (acc[header] || 0) + 1;
    return acc;
  }, {});

  const duplicateHeaders = Object.entries(dupCounts)
    .filter(([, count]) => count > 1)
    .map(([header]) => header);

  const bodyRows = rows
    .slice(1)
    .map((cells, idx) => ({
      rowNumber: idx + 2,
      values: cells.map((cell) => String(cell ?? '').trim()),
    }))
    .filter((rowData) => rowData.values.some((cell) => cell !== ''));

  return {
    headers,
    rawHeaders,
    rows: bodyRows,
    duplicateHeaders,
    parseErrors: [],
  };
}

export function parseBoolean(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: undefined };
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return { ok: true, value: true };
  if (['false', 'no', 'n', '0'].includes(normalized)) return { ok: true, value: false };
  return { ok: false };
}

export function parseNumber(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: undefined };
  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const parsed = Number(cleaned);
  if (Number.isFinite(parsed)) return { ok: true, value: parsed };
  return { ok: false };
}

export function parseInteger(value) {
  const result = parseNumber(value);
  if (!result.ok || result.value === undefined) return result;
  if (!Number.isInteger(result.value)) return { ok: false };
  return result;
}

export function parseRating(value) {
  const result = parseNumber(value);
  if (!result.ok || result.value === undefined) return result;
  if (result.value < MIN_RATING || result.value > MAX_RATING) return { ok: false };
  return result;
}

export function parseDate(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: undefined };
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ok: true, value: raw };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  const yyyy = parsed.getUTCFullYear();
  const mm = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
  const dd = `${parsed.getUTCDate()}`.padStart(2, '0');
  return { ok: true, value: `${yyyy}-${mm}-${dd}` };
}

export function parseStringList(value) {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseEnum(value, allowedValues = []) {
  if (value === undefined || value === null || value === '') return { ok: true, value: undefined };
  const raw = String(value).trim();
  const found = allowedValues.find((entry) => entry.toLowerCase() === raw.toLowerCase());
  if (!found) return { ok: false };
  return { ok: true, value: found };
}

export function compactString(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(COMPACT_SPACE, ' ');
}

export function toNoteLines(extraFields = {}) {
  const entries = Object.entries(extraFields).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '';
  return entries.map(([key, value]) => `${key}: ${value}`).join(' | ');
}
