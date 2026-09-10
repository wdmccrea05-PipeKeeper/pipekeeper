import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Wine, Plus, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { buildArchivePayload, buildUnarchivePayload } from '@/lib/collection/inventoryLifecycle';

/**
 * WineLifecycleControls — non-destructive inventory lifecycle for WineKeeper.
 *
 * Actions:
 *   Consume Bottle — quantity = max(0, quantity - 1). Does NOT delete the record.
 *   Add Bottle    — quantity = quantity + 1. Auto-unarchives if archived.
 *   Archive      — is_archived = true (non-destructive, reversible).
 *   Unarchive    — is_archived = false (restores to active collection).
 *
 * All buttons use ≥44px touch targets for mobile accessibility.
 */
export default function WineLifecycleControls({ wine, onUpdated, onDelete }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null);

  if (!wine) return null;

  const qty = Number(wine.quantity) || 0;
  const isArchived = wine.is_archived === true;

  const update = async (payload, label) => {
    setBusy(label);
    try {
      await base44.entities.Wine.update(wine.id, payload);
      onUpdated?.(payload);
    } finally {
      setBusy(null);
    }
  };

  const handleConsume = () => {
    const newQty = Math.max(0, qty - 1);
    update({ quantity: newQty }, 'consume');
  };

  const handleAdd = () => {
    const payload = { quantity: qty + 1 };
    if (isArchived) {
      payload.is_archived = false;
      payload.archived_at = null;
    }
    update(payload, 'add');
  };

  const handleArchive = () => {
    update(buildArchivePayload(), 'archive');
  };

  const handleUnarchive = () => {
    update(buildUnarchivePayload(), 'unarchive');
  };

  const handleDelete = () => {
    if (!window.confirm(t('wine.deleteConfirm', { name: wine.name }))) return;
    setBusy('delete');
    base44.entities.Wine.delete(wine.id).then(() => {
      onDelete?.();
    }).finally(() => setBusy(null));
  };

  const btnBase = {
    minHeight: 44,
    minWidth: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    fontSize: '0.8125rem',
    fontWeight: 600,
    transition: 'opacity 0.15s',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Consume Bottle — only when in stock */}
      <button
        type="button"
        onClick={handleConsume}
        disabled={busy !== null || qty <= 0}
        style={{
          ...btnBase,
          background: 'rgba(139,58,58,0.18)',
          border: '1px solid rgba(139,58,58,0.3)',
          color: '#C47070',
          opacity: busy !== null || qty <= 0 ? 0.4 : 1,
          padding: '0 14px',
        }}
      >
        <Wine className="w-4 h-4" />
        {t('wine.consumeBottle', 'Consume Bottle')}
      </button>

      {/* Add Bottle */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={busy !== null}
        style={{
          ...btnBase,
          background: 'rgba(46,125,92,0.15)',
          border: '1px solid rgba(46,125,92,0.3)',
          color: '#4EAD80',
          opacity: busy !== null ? 0.5 : 1,
          padding: '0 14px',
        }}
      >
        <Plus className="w-4 h-4" />
        {t('wine.addBottle', 'Add Bottle')}
      </button>

      {/* Archive / Unarchive */}
      {isArchived ? (
        <button
          type="button"
          onClick={handleUnarchive}
          disabled={busy !== null}
          style={{
            ...btnBase,
            background: 'rgba(180,140,75,0.12)',
            border: '1px solid rgba(180,140,75,0.25)',
            color: '#D4A574',
            opacity: busy !== null ? 0.5 : 1,
            padding: '0 14px',
          }}
        >
          <ArchiveRestore className="w-4 h-4" />
          {t('wine.unarchive', 'Restore')}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleArchive}
          disabled={busy !== null}
          style={{
            ...btnBase,
            background: 'rgba(120,120,120,0.12)',
            border: '1px solid rgba(120,120,120,0.25)',
            color: 'rgba(224,216,200,0.7)',
            opacity: busy !== null ? 0.5 : 1,
            padding: '0 14px',
          }}
        >
          <Archive className="w-4 h-4" />
          {t('wine.archive', 'Archive')}
        </button>
      )}

      {/* Delete — destructive, separate from archive */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy !== null}
        style={{
          ...btnBase,
          background: 'transparent',
          border: '1px solid rgba(163,92,92,0.25)',
          color: '#A35C5C',
          opacity: busy !== null ? 0.5 : 1,
          padding: '0 14px',
        }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}