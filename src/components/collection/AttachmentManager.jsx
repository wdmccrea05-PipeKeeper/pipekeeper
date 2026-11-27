import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Paperclip, FileText, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import {
  addAttachment,
  formatFileSize,
  groupAttachments,
  inferAttachmentKind,
  normaliseAttachments,
  removeAttachment,
  validateAttachment,
} from '@/lib/collection/attachments';

/**
 * Multiple attachments per record: receipts, certificates, photographs and
 * supporting documents.
 *
 * Each file is uploaded to private storage and the returned private reference is
 * saved on the record itself, so attachments persist across saves, refreshes,
 * reinstalls and devices. A reference is resolved to a short-lived signed URL
 * only when the collector opens it.
 */
export default function AttachmentManager({ entityName, record, onDocumentsChange, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attachments = normaliseAttachments(record);

  const persist = async (next) => {
    await base44.entities[entityName].update(record.id, { documents: next });
    if (onDocumentsChange) onDocumentsChange(next);
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setError('');
    setBusy(true);
    try {
      let next = attachments;
      for (const file of files) {
        const validationError = validateAttachment(file, next);
        if (validationError) {
          setError(validationError);
          continue;
        }
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        next = addAttachment(next, {
          name: file.name,
          kind: inferAttachmentKind(file),
          file_uri,
          size: file.size,
        });
      }
      await persist(next);
    } catch (uploadError) {
      setError(uploadError?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (attachment) => {
    setError('');
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: attachment.file_uri,
      });
      window.open(signed_url, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      setError(openError?.message || 'Could not open this file');
    }
  };

  const handleRemove = async (attachment) => {
    setError('');
    setBusy(true);
    try {
      await persist(removeAttachment(attachments, attachment.id));
    } catch (removeError) {
      setError(removeError?.message || 'Could not remove this file');
    } finally {
      setBusy(false);
    }
  };

  const groups = groupAttachments(attachments);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
          Receipts, certificates, photographs and supporting documents (stored privately).
        </p>
        <label
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer"
          style={{
            background: 'rgba(180,140,75,0.15)',
            border: '1px solid rgba(180,140,75,0.3)',
            color: '#D4A574',
            opacity: disabled || busy ? 0.6 : 1,
          }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          Add files
          <input
            type="file"
            multiple
            className="hidden"
            disabled={disabled || busy}
            onChange={handleFiles}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.csv,.xlsx"
          />
        </label>
      </div>

      {error && <p className="text-xs" style={{ color: '#E39A9A' }}>{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-sm py-3" style={{ color: 'rgba(224,216,200,0.45)' }}>
          No documents attached yet.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.kind} className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.45)' }}>
              {group.kind}
            </p>
            {group.items.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.15)' }}
              >
                <FileText className="w-4 h-4 shrink-0" style={{ color: '#D4A574' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate" style={{ color: '#F5F1E7' }}>{attachment.name}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.5)' }}>
                    {[formatFileSize(attachment.size), attachment.uploaded_at ? new Date(attachment.uploaded_at).toLocaleDateString() : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleOpen(attachment)} title="Open">
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(attachment)}
                  disabled={disabled || busy}
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" style={{ color: '#B35F5F' }} />
                </Button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}