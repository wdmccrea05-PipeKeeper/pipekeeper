/**
 * src/lib/collection/attachments.js
 *
 * Shared attachment handling for collection records.
 *
 * Attachments are receipts, certificates, photographs and supporting
 * documents. They are stored as a private file reference (file_uri) on the
 * record itself, so they survive a save, a refresh, a reinstall and a second
 * device: the reference lives in the database, not in component state.
 *
 * A file_uri is not a URL. It is resolved to a short-lived signed URL only at
 * the moment it is opened.
 */

export const MAX_ATTACHMENTS_PER_RECORD = 20;
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export const ATTACHMENT_KINDS = [
  'receipt',
  'certificate',
  'photograph',
  'document',
  'appraisal',
  'other',
];

const KIND_BY_EXTENSION = {
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  csv: 'document',
  xlsx: 'document',
  png: 'photograph',
  jpg: 'photograph',
  jpeg: 'photograph',
  webp: 'photograph',
  gif: 'photograph',
};

function fileExtension(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

/**
 * Best-effort kind for a file the collector selected.
 *
 * @param {File|{name?: string, type?: string}} file
 * @returns {string} one of ATTACHMENT_KINDS
 */
export function inferAttachmentKind(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.includes('receipt') || name.includes('invoice')) return 'receipt';
  if (name.includes('certificate') || name.includes('cert')) return 'certificate';
  if (name.includes('appraisal')) return 'appraisal';
  const byExtension = KIND_BY_EXTENSION[fileExtension(name)];
  return byExtension || 'other';
}

/**
 * Normalise whatever is stored on a record into a list of attachment objects.
 * Accepts the current object shape and bare string file references, so records
 * saved before attachments were structured are still listed rather than lost.
 *
 * @param {object} record
 * @returns {object[]}
 */
export function normaliseAttachments(record) {
  const raw = record?.documents;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry, index) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return {
          id: `legacy-${index}`,
          name: entry.split('/').pop() || 'Document',
          kind: 'document',
          file_uri: entry,
          uploaded_at: null,
          size: null,
        };
      }
      if (typeof entry !== 'object') return null;
      const fileUri = entry.file_uri || entry.file_url || entry.url || null;
      if (!fileUri) return null;
      return {
        id: entry.id || `attachment-${index}`,
        name: entry.name || fileUri.split('/').pop() || 'Document',
        kind: ATTACHMENT_KINDS.includes(entry.kind) ? entry.kind : 'document',
        file_uri: fileUri,
        uploaded_at: entry.uploaded_at || null,
        size: Number.isFinite(Number(entry.size)) ? Number(entry.size) : null,
      };
    })
    .filter(Boolean);
}

/**
 * Validate a file before upload. Returns an error message, or null when valid.
 *
 * @param {File} file
 * @param {object[]} existing
 * @returns {string|null}
 */
export function validateAttachment(file, existing = []) {
  if (!file) return 'No file selected';
  if (existing.length >= MAX_ATTACHMENTS_PER_RECORD) {
    return `A record can hold up to ${MAX_ATTACHMENTS_PER_RECORD} attachments`;
  }
  if (Number(file.size) > MAX_ATTACHMENT_BYTES) return 'File is larger than 15 MB';
  return null;
}

/**
 * Append an attachment to a record's list without mutating the input.
 *
 * @param {object[]} existing
 * @param {{name: string, kind?: string, file_uri: string, size?: number, uploaded_at?: string}} attachment
 * @returns {object[]}
 */
export function addAttachment(existing, attachment) {
  const list = Array.isArray(existing) ? existing : [];
  if (!attachment?.file_uri) return list;

  const entry = {
    id: attachment.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: attachment.name || 'Document',
    kind: ATTACHMENT_KINDS.includes(attachment.kind) ? attachment.kind : 'document',
    file_uri: attachment.file_uri,
    uploaded_at: attachment.uploaded_at || new Date().toISOString(),
    size: Number.isFinite(Number(attachment.size)) ? Number(attachment.size) : null,
  };

  return [...list, entry].slice(0, MAX_ATTACHMENTS_PER_RECORD);
}

/**
 * Remove one attachment by id without mutating the input.
 *
 * @param {object[]} existing
 * @param {string} id
 * @returns {object[]}
 */
export function removeAttachment(existing, id) {
  const list = Array.isArray(existing) ? existing : [];
  return list.filter((entry) => entry && entry.id !== id);
}

/**
 * Group attachments by kind for display.
 *
 * @param {object[]} attachments
 * @returns {{ kind: string, items: object[] }[]}
 */
export function groupAttachments(attachments = []) {
  const groups = new Map();
  for (const entry of Array.isArray(attachments) ? attachments : []) {
    const kind = ATTACHMENT_KINDS.includes(entry?.kind) ? entry.kind : 'other';
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(entry);
  }
  return ATTACHMENT_KINDS.filter((kind) => groups.has(kind)).map((kind) => ({
    kind,
    items: groups.get(kind),
  }));
}

/**
 * Human-readable file size.
 *
 * @param {number|null} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}