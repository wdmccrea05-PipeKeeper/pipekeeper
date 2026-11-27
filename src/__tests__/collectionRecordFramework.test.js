/* eslint-disable */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  addAttachment,
  formatFileSize,
  groupAttachments,
  inferAttachmentKind,
  normaliseAttachments,
  removeAttachment,
  validateAttachment,
  MAX_ATTACHMENTS_PER_RECORD,
} from '../lib/collection/attachments.js';
import {
  DOCUMENTATION_FIELDS,
  buildDocumentationPatch,
  computeDocumentationCompleteness,
  isInactiveRecord,
  normaliseTags,
  recordDisplayName,
  resolveAcquisition,
  resolveLifecycleStatus,
} from '../lib/collection/itemRecord.js';

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

const ENTITY_FILES = [
  'base44/entities/Pipe.jsonc',
  'base44/entities/Cigar.jsonc',
  'base44/entities/Bottle.jsonc',
  'base44/entities/Wine.jsonc',
];

const SHARED_FIELDS = [
  'purchase_date',
  'purchase_price',
  'purchase_source',
  'original_owner',
  'provenance_notes',
  'serial_number',
  'batch_number',
  'production_date',
  'condition_notes',
  'tags',
  'documents',
  'lifecycle_status',
  'lifecycle_note',
  'merged_into_id',
  'merged_at',
];

describe('Shared attachment handling', () => {
  it('normalises structured attachments', () => {
    const list = normaliseAttachments({
      documents: [
        { id: 'a1', name: 'receipt.pdf', kind: 'receipt', file_uri: 'private/a1', size: 2048 },
      ],
    });
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('receipt');
    expect(list[0].file_uri).toBe('private/a1');
  });

  it('keeps legacy string attachments instead of dropping them', () => {
    const list = normaliseAttachments({ documents: ['private/old-scan.jpg'] });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('old-scan.jpg');
    expect(list[0].file_uri).toBe('private/old-scan.jpg');
  });

  it('drops entries with no file reference', () => {
    expect(normaliseAttachments({ documents: [{ name: 'nothing' }, null] })).toHaveLength(0);
    expect(normaliseAttachments({})).toHaveLength(0);
  });

  it('appends without mutating and caps the list', () => {
    const original = [];
    const next = addAttachment(original, { name: 'cert.pdf', file_uri: 'private/cert', kind: 'certificate' });
    expect(original).toHaveLength(0);
    expect(next).toHaveLength(1);

    let many = [];
    for (let i = 0; i < MAX_ATTACHMENTS_PER_RECORD + 5; i += 1) {
      many = addAttachment(many, { name: `f${i}.pdf`, file_uri: `private/f${i}` });
    }
    expect(many).toHaveLength(MAX_ATTACHMENTS_PER_RECORD);
  });

  it('removes by id without mutating', () => {
    const list = [
      { id: 'x', file_uri: 'private/x' },
      { id: 'y', file_uri: 'private/y' },
    ];
    expect(removeAttachment(list, 'x')).toHaveLength(1);
    expect(list).toHaveLength(2);
  });

  it('rejects oversized files and over-full records', () => {
    expect(validateAttachment({ size: 20 * 1024 * 1024 }, [])).toMatch(/15 MB/);
    expect(
      validateAttachment({ size: 100 }, new Array(MAX_ATTACHMENTS_PER_RECORD).fill({}))
    ).toMatch(/up to/);
    expect(validateAttachment({ size: 100 }, [])).toBeNull();
  });

  it('infers a kind from the file name', () => {
    expect(inferAttachmentKind({ name: 'purchase-receipt.pdf' })).toBe('receipt');
    expect(inferAttachmentKind({ name: 'certificate-of-authenticity.pdf' })).toBe('certificate');
    expect(inferAttachmentKind({ name: 'bowl.jpg' })).toBe('photograph');
  });

  it('groups and formats', () => {
    const groups = groupAttachments([
      { id: '1', kind: 'receipt', file_uri: 'a' },
      { id: '2', kind: 'photograph', file_uri: 'b' },
    ]);
    expect(groups.map((g) => g.kind)).toEqual(['receipt', 'photograph']);
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(0)).toBe('');
  });
});

describe('Shared record documentation', () => {
  it('resolves acquisition from whichever field the module uses', () => {
    expect(resolveAcquisition({ purchase_date: '2019-04-02', purchase_price: 120 })).toEqual({
      date: '2019-04-02',
      cost: 120,
      source: null,
    });
    expect(resolveAcquisition({ purchase_location: 'Inherited from my father' }).source).toBe(
      'Inherited from my father'
    );
    expect(resolveAcquisition({}).cost).toBeNull();
  });

  it('normalises tags and removes case-insensitive duplicates', () => {
    expect(normaliseTags('Estate, estate, Unsmoked ,')).toEqual(['Estate', 'Unsmoked']);
    expect(normaliseTags(['a', 'A', 'b'])).toEqual(['a', 'b']);
  });

  it('only writes fields that actually changed', () => {
    const original = { id: '1', name: 'Peterson 106', purchase_source: 'Inherited', tags: ['a'] };
    const patch = buildDocumentationPatch(original, {
      ...original,
      purchase_source: 'Inherited',
      original_owner: 'My grandfather',
      tags: ['a', 'b'],
    });
    expect(patch.purchase_source).toBeUndefined();
    expect(patch.original_owner).toBe('My grandfather');
    expect(patch.tags).toEqual(['a', 'b']);
  });

  it('reports documentation completeness', () => {
    const empty = computeDocumentationCompleteness({});
    expect(empty.score).toBe(0);
    const filled = computeDocumentationCompleteness({
      purchase_date: '2020-01-01',
      purchase_source: 'Estate',
    });
    expect(filled.score).toBeGreaterThan(0);
    expect(filled.missing.length).toBe(DOCUMENTATION_FIELDS.length - 2);
  });

  it('honours the legacy archive flag in lifecycle state', () => {
    expect(resolveLifecycleStatus({ is_archived: true })).toBe('archived');
    expect(resolveLifecycleStatus({ lifecycle_status: 'gifted' })).toBe('gifted');
    expect(isInactiveRecord({ lifecycle_status: 'sold' })).toBe(true);
    expect(isInactiveRecord({})).toBe(false);
  });

  it('builds a display name from name and maker', () => {
    expect(recordDisplayName({ name: 'Serie V', brand: 'Oliva' }, 'Cigar')).toBe('Serie V — Oliva');
    expect(recordDisplayName({ name: 'Château X' }, 'Wine')).toBe('Château X');
  });
});

describe('Schema guard-rails — shared fields across all four modules', () => {
  it.each(ENTITY_FILES)('%s declares every shared documentation field', (file) => {
    const source = read(file);
    for (const field of SHARED_FIELDS) {
      expect(source).toContain(`"${field}"`);
    }
  });

  it.each(ENTITY_FILES)('%s keeps the shared fields optional', (file) => {
    const schema = JSON.parse(read(file));
    for (const field of SHARED_FIELDS) {
      expect(schema.required || []).not.toContain(field);
    }
    expect(schema.properties.documents.items.properties.file_uri).toBeDefined();
  });

  it('declares the append-only activity entity with owner-or-admin read rules', () => {
    const source = read('base44/entities/CollectionActivity.jsonc');
    expect(source).toContain('"CollectionActivity"');
    expect(source).toContain('"record_entity"');
    expect(source).toContain('"{{user.id}}"');
    expect(source).toContain('"role": "admin"');
    expect(source).toContain('"merged"');
  });
});

describe('Shared backend contract', () => {
  it('keeps one allowlist of writable documentation fields per module', () => {
    const source = read('base44/shared/collectionRecords.ts');
    for (const entity of ['Pipe', 'Cigar', 'Bottle', 'Wine']) {
      expect(source).toContain(`${entity}: {`);
    }
    expect(source).toContain('documentationFields');
    expect(source).toContain('isAuthorizedForRecord');
    expect(source).toContain('planMerge');
    expect(source).toContain('findDuplicateGroups');
  });

  it('authorizes every record operation before writing', () => {
    const bulk = read('base44/functions/collectionItemBulkUpdate/entry.ts');
    const merge = read('base44/functions/collectionItemMerge/entry.ts');
    const duplicates = read('base44/functions/collectionItemDuplicates/entry.ts');

    for (const source of [bulk, merge, duplicates]) {
      expect(source).toContain('isAuthorizedForRecord');
      expect(source).toContain("status: 401");
    }
    expect(bulk).toContain('sanitisePatch');
    expect(merge).toContain('confirm');
    expect(merge).toContain('merged_into_id');
  });

  it('never introduces retailer links or purchasing surfaces', () => {
    const sources = [
      read('base44/shared/collectionRecords.ts'),
      read('src/components/collection/DuplicateReviewPanel.jsx'),
      read('src/components/collection/BulkEditPanel.jsx'),
      read('src/pages/CollectionTools.jsx'),
    ].join('\n');
    expect(sources.toLowerCase()).not.toContain('buy now');
    expect(sources.toLowerCase()).not.toContain('affiliate');
    expect(sources).not.toContain('restock');
  });
});

describe('Curator authorization', () => {
  it('grants descriptive record access and requires approval before any update', () => {
    const prompt = read('src/lib/curator/curatorSystemPrompt.js');
    expect(prompt).toContain('RECORD ACCESS');
    expect(prompt).toContain('descriptive analysis');
    expect(prompt).toContain('never report');
    expect(prompt).toContain('CURATOR_BOUNDARY_CLAUSE');
  });
});