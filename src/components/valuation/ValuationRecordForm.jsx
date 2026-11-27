import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { VALUATION_KINDS, convertToBase, BASE_CURRENCY } from '@/lib/valuation/valuationCenter';
import { inferAttachmentKind, MAX_ATTACHMENT_BYTES, formatFileSize } from '@/lib/collection/attachments';
import { trackedUploadPrivateFile } from '@/lib/integrationTelemetry';
import { useCurrency } from '@/lib/currency/useCurrency';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY'];
const CONFIDENCE = ['high', 'medium', 'low', 'unknown'];
const SOURCE_TYPES = ['manual', 'document', 'appraiser', 'reference', 'import', 'ai_estimate'];

const FIELD = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(180,140,75,0.28)',
  background: 'rgba(20,14,10,0.7)',
  color: '#F5F1E7',
  padding: '10px 12px',
  fontSize: 14,
  minHeight: 42,
};

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="ck-field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px]" style={{ color: 'rgba(224,216,200,0.45)' }}>{hint}</span>}
    </label>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ValuationRecordForm({ open, onClose, items = [], initialItemId = '', onSaved }) {
  const { rates } = useCurrency();
  const [recordId, setRecordId] = useState(initialItemId);
  const [kind, setKind] = useState('acquisition_cost');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(BASE_CURRENCY);
  const [valuationDate, setValuationDate] = useState(today());
  const [sourceType, setSourceType] = useState('manual');
  const [source, setSource] = useState('');
  const [methodology, setMethodology] = useState('');
  const [confidence, setConfidence] = useState('unknown');
  const [rangeLow, setRangeLow] = useState('');
  const [rangeHigh, setRangeHigh] = useState('');
  const [appraiser, setAppraiser] = useState('');
  const [appraisalReference, setAppraisalReference] = useState('');
  const [independentSource, setIndependentSource] = useState(false);
  const [referenceSourceName, setReferenceSourceName] = useState('');
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedItem = useMemo(() => items.find((item) => item.id === recordId) || null, [items, recordId]);
  const amountBase = useMemo(() => convertToBase(amount === '' ? null : amount, currency, rates), [amount, currency, rates]);
  const unconvertible = amount !== '' && amountBase === null;

  if (!open) return null;

  async function handleFiles(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`${file.name} is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}`);
          continue;
        }
        const { file_uri } = await trackedUploadPrivateFile(
          { file },
          { surface: 'valuation_center', action: 'upload_valuation_document' }
        );
        setDocuments((current) => [
          ...current,
          {
            id: `${Date.now()}-${current.length + 1}`,
            name: file.name,
            kind: inferAttachmentKind(file),
            file_uri,
            uploaded_at: new Date().toISOString(),
            size: file.size,
          },
        ]);
      }
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSave() {
    if (!selectedItem) {
      toast.error('Choose the record this valuation belongs to.');
      return;
    }
    if (amount === '' || !Number.isFinite(Number(amount))) {
      toast.error('Enter the amount as a number.');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ValuationRecord.create({
        record_entity: selectedItem.entity,
        record_id: selectedItem.id,
        record_name: selectedItem.name,
        module_key: selectedItem.moduleKey,
        kind,
        amount: Number(amount),
        currency,
        amount_base: amountBase,
        base_currency: BASE_CURRENCY,
        fx_rate: currency === BASE_CURRENCY ? 1 : rates?.[currency] ?? null,
        fx_rate_date: today(),
        valuation_date: valuationDate,
        source,
        source_type: sourceType,
        methodology,
        confidence,
        range_low: rangeLow === '' ? null : Number(rangeLow),
        range_high: rangeHigh === '' ? null : Number(rangeHigh),
        appraiser,
        appraisal_reference: appraisalReference,
        independent_source: kind === 'reference_valuation' ? independentSource : false,
        reference_source_name: kind === 'reference_valuation' ? referenceSourceName : '',
        documents,
        notes,
        created_by: (await base44.auth.me())?.email,
      });
      toast.success('Valuation entry recorded.');
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.message || 'Could not save the valuation entry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div
        className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl"
        style={{ background: '#1d1511', border: '1px solid rgba(180,140,75,0.28)', maxHeight: '92dvh' }}
      >
        <div className="flex items-center justify-between gap-2 border-b p-3" style={{ borderColor: 'rgba(180,140,75,0.18)' }}>
          <h3 className="text-base font-semibold" style={{ color: '#F5F1E7' }}>Record a valuation entry</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ minWidth: 44, minHeight: 44, color: '#E0D8C8' }}>
            <X className="mx-auto h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-3" style={{ maxHeight: 'calc(92dvh - 130px)' }}>
          <Field label="Collection record">
            <select value={recordId} onChange={(event) => setRecordId(event.target.value)} style={FIELD}>
              <option value="">Select a record…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.moduleLabel} · {item.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Entry type" hint="This is what separates a documented fact from an estimate.">
              <select value={kind} onChange={(event) => setKind(event.target.value)} style={FIELD}>
                {Object.entries(VALUATION_KINDS).map(([key, definition]) => (
                  <option key={key} value={key}>{definition.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Valuation date">
              <input type="date" value={valuationDate} onChange={(event) => setValuationDate(event.target.value)} style={FIELD} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Amount">
              <input type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} style={FIELD} />
            </Field>
            <Field label="Currency">
              <select value={currency} onChange={(event) => setCurrency(event.target.value)} style={FIELD}>
                {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </Field>
            <Field label="Confidence">
              <select value={confidence} onChange={(event) => setConfidence(event.target.value)} style={FIELD}>
                {CONFIDENCE.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
          </div>

          {unconvertible && (
            <p className="text-[11px]" style={{ color: '#C4904A' }}>
              No exchange rate is available for {currency}. The entry is saved with its original amount and no base amount — it is never counted as zero.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="How it was obtained">
              <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} style={FIELD}>
                {SOURCE_TYPES.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Source" hint="Invoice, dealer receipt, appraisal report number.">
              <input value={source} onChange={(event) => setSource(event.target.value)} style={FIELD} />
            </Field>
          </div>

          <Field label="Methodology">
            <input value={methodology} onChange={(event) => setMethodology(event.target.value)} placeholder="Comparable sales, replacement cost, appraiser method" style={FIELD} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Range low">
              <input type="number" value={rangeLow} onChange={(event) => setRangeLow(event.target.value)} style={FIELD} />
            </Field>
            <Field label="Range high">
              <input type="number" value={rangeHigh} onChange={(event) => setRangeHigh(event.target.value)} style={FIELD} />
            </Field>
          </div>

          {kind === 'appraisal' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Appraiser">
                <input value={appraiser} onChange={(event) => setAppraiser(event.target.value)} style={FIELD} />
              </Field>
              <Field label="Appraisal reference">
                <input value={appraisalReference} onChange={(event) => setAppraisalReference(event.target.value)} style={FIELD} />
              </Field>
            </div>
          )}

          {kind === 'reference_valuation' && (
            <div className="space-y-2 rounded-xl p-3" style={{ background: 'rgba(196,144,74,0.08)', border: '1px solid rgba(196,144,74,0.25)' }}>
              <label className="flex items-start gap-2 text-xs" style={{ color: '#E0D8C8' }}>
                <input type="checkbox" checked={independentSource} onChange={(event) => setIndependentSource(event.target.checked)} style={{ marginTop: 2 }} />
                The figure comes from an independently authorized source that was reviewed for compliance.
              </label>
              <Field label="Source name">
                <input value={referenceSourceName} onChange={(event) => setReferenceSourceName(event.target.value)} style={FIELD} />
              </Field>
              <p className="text-[10px]" style={{ color: 'rgba(224,216,200,0.5)' }}>
                Without an authorized source a reference figure is shown as unknown confidence, never as a verified price.
              </p>
            </div>
          )}

          <Field label="Notes">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} style={{ ...FIELD, minHeight: 64 }} />
          </Field>

          <div>
            <span className="ck-field-label">Supporting documents and photographs</span>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs"
                style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574', minHeight: 40 }}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? 'Uploading…' : 'Add files'}
                <input type="file" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
              </label>
              <span className="text-[10px]" style={{ color: 'rgba(224,216,200,0.45)' }}>Stored privately</span>
            </div>
            {documents.length > 0 && (
              <ul className="mt-2 space-y-1">
                {documents.map((document) => (
                  <li key={document.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[11px]" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.8)' }}>
                    <span className="min-w-0 flex-1 truncate" title={document.name}>{document.name}</span>
                    <button type="button" onClick={() => setDocuments((current) => current.filter((entry) => entry.id !== document.id))} style={{ minWidth: 28, minHeight: 28, color: '#B66565' }} aria-label={`Remove ${document.name}`}>
                      <X className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-3" style={{ borderColor: 'rgba(180,140,75,0.18)' }}>
          <Button variant="outline" onClick={onClose} style={{ minHeight: 44 }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading} style={{ minHeight: 44 }}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save entry
          </Button>
        </div>
      </div>
    </div>
  );
}