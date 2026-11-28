import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, CheckCircle, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import UpgradePrompt from '@/components/subscription/UpgradePrompt';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { invalidateBlendQueries, invalidateEntityQueries, invalidatePipeQueries } from '@/components/utils/cacheInvalidation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyzeImportRows, executeImportRows, importDefinitionList, importDefinitions, downloadImportTemplate, inferImportMappings } from '@/lib/imports/importDefinitions';
import { parseCsvText } from '@/lib/imports/csvImportUtils';
import { createImportBatchId, loadImportBatch, saveImportBatch } from '@/lib/imports/importBatchStore';
import { TOBACCO_IMPORT_ENUMS } from '@/components/tobacco/tobaccoConstants';

// Maps each import definition id prefix to a module key
const IMPORT_MODULE_MAP = {
  pipekeeper_pipes: 'pipekeeper',
  pipekeeper_blends: 'pipekeeper',
  whiskeykeeper_bottles: 'whiskeykeeper',
  cigarkeeper_cigars: 'cigarkeeper',
  winekeeper_wines: 'winekeeper',
};

function SummaryBadge({ tone = 'default', label, value }) {
  const styles = {
    default: 'bg-stone-800 border-stone-600 text-stone-100',
    success: 'bg-green-900/40 border-green-700 text-green-100',
    warning: 'bg-yellow-900/40 border-yellow-700 text-yellow-100',
    danger: 'bg-red-900/40 border-red-700 text-red-100',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles[tone]}`}>
      <div className="font-semibold">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function buildImportTypeFromLocation(locationSearch) {
  const params = new URLSearchParams(locationSearch || '');
  const requested = params.get('type');
  if (requested && importDefinitions[requested]) return requested;
  return importDefinitionList[0]?.id;
}

function buildBatchIdFromLocation(locationSearch) {
  const requested = new URLSearchParams(locationSearch || '').get('batch');
  return requested && /^[A-Za-z0-9_-]{8,80}$/.test(requested) ? requested : createImportBatchId();
}

function formatRowNotes(row, t) {
  if (row.errors.length > 0) return `Errors: ${row.errors.join(' • ')}`;
  if (row.duplicateKind === 'conflict' && row.conflictingValues?.length) {
    const differences = row.conflictingValues
      .map(({ field, existing, incoming }) => t('import.conflictValues', {
        field,
        existing: existing ?? '—',
        incoming: incoming ?? '—',
      }))
      .join('; ');
    return t('import.conflictSummary', { differences });
  }
  if (row.warnings.length > 0) return `Warnings: ${row.warnings.join(' • ')}`;
  return '—';
}

function ImportPreview({ analysis, mappings, t }) {
  if (!analysis) return null;

  return (
    <Card className="border-[#e8d5b7]/30">
      <CardHeader>
        <CardTitle className="text-lg text-stone-100">Import Preview</CardTitle>
        <CardDescription className="text-stone-300">
          Review rows before import. Errors are blocked; warnings can still be imported.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.blockingHeaderErrors.length > 0 && (
          <div className="rounded-lg border border-red-600/60 bg-red-900/20 p-3 text-sm text-red-100">
            <p className="font-semibold mb-1">Blocking file errors</p>
            <ul className="list-disc list-inside space-y-1">
              {analysis.blockingHeaderErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}

        {analysis.unknownColumns.length > 0 && (
          <div className="rounded-lg border border-yellow-600/60 bg-yellow-900/20 p-3 text-sm text-yellow-100">
            Unsupported columns found: {analysis.unknownColumns.join(', ')}
          </div>
        )}

        {mappings?.length > 0 && (
          <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-3 text-xs text-stone-300">
            <p className="font-semibold text-stone-100 mb-2">{t('import.detectedMappings')}</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {mappings.map(({ source, target }, index) => (
                <li key={`${source}-${index}`}>
                  {source} → {target || t('import.notImported')}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <SummaryBadge label="Rows" value={analysis.totalRows} />
          <SummaryBadge tone="success" label="Valid" value={analysis.counts.valid} />
          <SummaryBadge tone="warning" label="Warnings" value={analysis.counts.warning} />
          <SummaryBadge tone="warning" label="Duplicates" value={analysis.counts.duplicates} />
          <SummaryBadge tone="danger" label="Conflicts" value={analysis.counts.conflicts} />
          <SummaryBadge tone="danger" label="Blocked" value={analysis.counts.error} />
        </div>

        <div className="overflow-auto max-h-80 border border-stone-700 rounded-lg">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-stone-900 sticky top-0">
              <tr>
                <th className="p-2 text-stone-200">Row</th>
                <th className="p-2 text-stone-200">Item</th>
                <th className="p-2 text-stone-200">Status</th>
                <th className="p-2 text-stone-200">Notes</th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.slice(0, 50).map((row) => (
                <tr key={row.rowNumber} className="border-t border-stone-800 align-top">
                  <td className="p-2 text-stone-300">{row.rowNumber}</td>
                  <td className="p-2 text-stone-200">{row.previewName}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      row.status === 'valid'
                        ? 'bg-green-900/50 text-green-100'
                        : row.status === 'warning'
                          ? 'bg-yellow-900/50 text-yellow-100'
                          : 'bg-red-900/50 text-red-100'
                    }`}>
                      {row.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-stone-300">
                    {formatRowNotes(row, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {analysis.rows.length > 50 && (
          <p className="text-xs text-stone-400">
            Showing first 50 rows of {analysis.rows.length}. Remaining rows will still follow the same validation rules during import.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ImportPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPaid: isPaidUser } = useCurrentUser();
  const { accessible, isLoading: modulesLoading } = useEnabledModules(user, user);

  // Filter import definitions to only modules the user has access to
  const availableDefinitions = useMemo(
    () => importDefinitionList.filter((def) => {
      const moduleKey = IMPORT_MODULE_MAP[def.id];
      // If no mapping found, show it; if mapped, require module to be accessible
      return !moduleKey || accessible[moduleKey];
    }),
    [accessible]
  );

  const [importType, setImportType] = useState(() => buildImportTypeFromLocation(location.search));
  const [batchId, setBatchId] = useState(() => buildBatchIdFromLocation(location.search));
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [mappings, setMappings] = useState({});
  const [reconciliationDecisions, setReconciliationDecisions] = useState({});
  const [unresolvedRows, setUnresolvedRows] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState('create_only');
  const [batchReady, setBatchReady] = useState(false);
  const [batchDataKey, setBatchDataKey] = useState('');
  const [batchSaved, setBatchSaved] = useState(false);
  const activeBatchKey = useRef('');
  const [batchStorageError, setBatchStorageError] = useState('');
  const [batchRecoveryError, setBatchRecoveryError] = useState(() => {
    const requested = new URLSearchParams(location.search || '').get('batch');
    return requested && !/^[A-Za-z0-9_-]{8,80}$/.test(requested)
      ? 'The import batch link is invalid. A new batch has been started.'
      : '';
  });

  // Ensure the selected import type is valid for available definitions
  const resolvedImportType = useMemo(() => {
    if (!availableDefinitions.length) return null;
    if (availableDefinitions.find((d) => d.id === importType)) return importType;
    return availableDefinitions[0]?.id ?? null;
  }, [availableDefinitions, importType]);

  const definition = resolvedImportType ? importDefinitions[resolvedImportType] : null;

  useEffect(() => {
    if (!resolvedImportType) return;
    const params = new URLSearchParams(location.search || '');
    const changed = params.get('batch') !== batchId || params.get('type') !== resolvedImportType;
    if (!changed) return;
    params.set('batch', batchId);
    params.set('type', resolvedImportType);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [batchId, location.pathname, location.search, navigate, resolvedImportType]);

  useEffect(() => {
    if (!user?.email || !resolvedImportType) return;
    const dataKey = `${user.email.trim().toLowerCase()}|${batchId}|${resolvedImportType}`;
    activeBatchKey.current = dataKey;
    setBatchReady(false);
    setAnalysis(null);
    setImportResult(null);
    setFileName('');
    setCsvText('');
    setMappings({});
    setReconciliationDecisions({});
    setUnresolvedRows([]);
    setDuplicateMode('create_only');
    setBatchStorageError('');

    let snapshot;
    try {
      snapshot = loadImportBatch(window.localStorage, user.email, batchId, {
        fallbackStorage: window.sessionStorage,
      });
    } catch (error) {
      setBatchStorageError(error.message);
      setBatchReady(true);
      return;
    }

    if (snapshot && snapshot.importType !== resolvedImportType) {
      if (!availableDefinitions.some((item) => item.id === snapshot.importType)) {
        setBatchRecoveryError('This batch belongs to a module that is not available to the signed-in account.');
        setBatchReady(true);
        return;
      }
      setImportType(snapshot.importType);
      return;
    }

    if (!snapshot) {
      setBatchDataKey(dataKey);
      setBatchReady(true);
      return;
    }

    setFileName(snapshot.fileName);
    setCsvText(snapshot.csvText);
    setMappings(snapshot.mappings);
    setReconciliationDecisions(snapshot.reconciliationDecisions);
    setUnresolvedRows(snapshot.unresolvedRows);
    setImportResult(snapshot.result);
    setDuplicateMode(snapshot.duplicateMode);
    const restoredDefinition = importDefinitions[snapshot.importType];
    if (snapshot.csvText && restoredDefinition) {
      const parsed = parseCsvText(snapshot.csvText);
      analyzeImportRows({
        definition: restoredDefinition,
        headers: parsed.headers,
        rawHeaders: parsed.rawHeaders,
        rows: parsed.rows,
        duplicateHeaders: parsed.duplicateHeaders,
        parseErrors: parsed.parseErrors,
        userEmail: user.email,
      }).then((nextAnalysis) => {
        setAnalysis(nextAnalysis);
        setUnresolvedRows(nextAnalysis.rows
          .filter((row) => row.status === 'error' || row.duplicateState !== 'none')
          .map((row) => row.rowNumber));
      }).catch((error) => {
        setBatchRecoveryError(`The saved CSV could not be revalidated: ${error.message}`);
      }).finally(() => {
        setBatchDataKey(dataKey);
        setBatchReady(true);
      });
    } else {
      setBatchDataKey(dataKey);
      setBatchReady(true);
    }
  }, [availableDefinitions, batchId, resolvedImportType, user?.email]);

  useEffect(() => {
    const dataKey = user?.email && resolvedImportType
      ? `${user.email.trim().toLowerCase()}|${batchId}|${resolvedImportType}`
      : '';
    if (!batchReady || !user?.email || !resolvedImportType || batchDataKey !== dataKey || activeBatchKey.current !== dataKey) return;
    try {
      saveImportBatch(window.localStorage, {
        batchId,
        userEmail: user.email,
        importType: resolvedImportType,
        fileName,
        csvText,
        mappings,
        reconciliationDecisions,
        unresolvedRows,
        analysis,
        result: importResult,
        duplicateMode,
      });
      setBatchSaved(true);
      setBatchStorageError('');
    } catch (error) {
      setBatchSaved(false);
      setBatchStorageError(error.message);
    }
  }, [analysis, batchDataKey, batchId, batchReady, csvText, duplicateMode, fileName, importResult, mappings, reconciliationDecisions, resolvedImportType, unresolvedRows, user?.email]);

  const importableRows = useMemo(() => {
    if (!analysis) return [];
    return analysis.rows.filter((row) => row.status !== 'error');
  }, [analysis]);

  // Sync resolvedImportType back into state when the available list changes
  useEffect(() => {
    if (resolvedImportType && resolvedImportType !== importType) {
      setImportType(resolvedImportType);
      setAnalysis(null);
      setImportResult(null);
    }
  }, [resolvedImportType]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasBlockingErrors = analysis?.blockingHeaderErrors?.length > 0;

  const refreshModuleCaches = () => {
    if (!user?.email) return;
    if (definition.entity === 'Pipe') {
      invalidatePipeQueries(queryClient, user.email);
    } else if (definition.entity === 'TobaccoBlend') {
      invalidateBlendQueries(queryClient, user.email);
    } else if (definition.entity === 'Bottle') {
      invalidateEntityQueries(queryClient, 'bottles', user.email);
      invalidateEntityQueries(queryClient, 'whiskey-collection', user.email);
      invalidateEntityQueries(queryClient, 'bottles-summary', user.email);
    } else if (definition.entity === 'Cigar') {
      invalidateEntityQueries(queryClient, 'cigars', user.email);
      invalidateEntityQueries(queryClient, 'cigars-summary', user.email);
      invalidateEntityQueries(queryClient, 'humidors', user.email);
    } else if (definition.entity === 'Wine') {
      invalidateEntityQueries(queryClient, 'wines', user.email);
      invalidateEntityQueries(queryClient, 'wines-summary', user.email);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !definition || !user?.email) return;

    setBusy(true);
    setBatchSaved(false);
    setImportResult(null);
    setAnalysis(null);

    try {
      const text = await file.text();
      setFileName(file.name);
      setCsvText(text);
      const parsed = parseCsvText(text);
      setMappings(inferImportMappings(definition, parsed.headers, parsed.rawHeaders));
      const nextAnalysis = await analyzeImportRows({
        definition,
        headers: parsed.headers,
        rawHeaders: parsed.rawHeaders,
        rows: parsed.rows,
        duplicateHeaders: parsed.duplicateHeaders,
        parseErrors: parsed.parseErrors,
        userEmail: user.email,
      });
      setAnalysis(nextAnalysis);
      setUnresolvedRows(nextAnalysis.rows
        .filter((row) => row.status === 'error' || row.duplicateState !== 'none')
        .map((row) => row.rowNumber));
      if (nextAnalysis.totalRows === 0) toast.warning('No data rows detected.');
    } catch (error) {
      console.error('[Import] Analysis failed:', error);
      toast.error(error.message || t('import.csvParseFailed'));
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!analysis || !definition) return;
    if (hasBlockingErrors) {
      toast.error('Fix file errors before importing.');
      return;
    }
    if (!importableRows.length) {
      toast.warning('No importable rows found.');
      return;
    }

    setBusy(true);
    setBatchSaved(false);
    try {
      const parsed = parseCsvText(csvText);
      const currentAnalysis = await analyzeImportRows({
        definition,
        headers: parsed.headers,
        rawHeaders: parsed.rawHeaders,
        rows: parsed.rows,
        duplicateHeaders: parsed.duplicateHeaders,
        parseErrors: parsed.parseErrors,
        userEmail: user.email,
      });
      setAnalysis(currentAnalysis);
      setUnresolvedRows(currentAnalysis.rows
        .filter((row) => row.status === 'error' || row.duplicateState !== 'none')
        .map((row) => row.rowNumber));
      if (currentAnalysis.blockingHeaderErrors.length > 0) {
        toast.error('The import preview changed. Fix the file errors before continuing.');
        return;
      }
      const result = await executeImportRows({
        definition,
        analyzedRows: currentAnalysis.rows,
        duplicateMode,
        userEmail: user.email,
      });
      setImportResult(result);
      refreshModuleCaches();
      toast.success(`Imported ${result.imported} row(s).`);
    } catch (error) {
      console.error('[Import] Execute failed:', error);
      toast.error(error.message || 'Import failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startNewImportBatch = () => {
    setBatchId(createImportBatchId());
    setFileName('');
    setCsvText('');
    setMappings({});
    setReconciliationDecisions({});
    setUnresolvedRows([]);
    setAnalysis(null);
    setImportResult(null);
    setDuplicateMode('create_only');
    setBatchDataKey('');
    setBatchSaved(false);
    setBatchReady(false);
    setBatchStorageError('');
    setBatchRecoveryError('');
  };

  if (!isPaidUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#242729] via-[#292c2e] to-[#242729]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a href={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('supportFull.backToHome')}
            </Button>
          </a>
          <UpgradePrompt featureName={t('import.bulkImport')} description={t('import.upgradeDesc')} />
        </div>
      </div>
    );
  }

  if (!modulesLoading && availableDefinitions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#242729] via-[#292c2e] to-[#242729]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a href={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.backToHome')}
            </Button>
          </a>
            <Card className="border-[#e8d5b7]/30">
              <CardHeader>
                <CardTitle className="text-xl text-stone-100">No modules available</CardTitle>
                <CardDescription className="text-stone-300">
                  Bulk import requires at least one active public module (PipeKeeper or WhiskeyKeeper). Enable a module from your collection settings to get started.
                </CardDescription>
              </CardHeader>
            </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#242729] via-[#292c2e] to-[#242729]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToHome')}
          </Button>
        </a>

        <Card className="border-[#e8d5b7]/30">
          <CardHeader>
            <CardTitle className="text-3xl text-stone-100 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-[#8b3a3a]" />
              {t('import.bulkImport')}
            </CardTitle>
            <CardDescription className="text-stone-300">
              {t(
                'import.bulkImportDesc',
                'Trusted collector migration flow: template download, upload, validation preview, safe import, and clear results.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm text-stone-300 mb-2 block">Import type</label>
                <Select
                  value={resolvedImportType ?? ''}
                  disabled={!batchReady || busy || Boolean(batchRecoveryError)}
                  onValueChange={(value) => {
                    setImportType(value);
                    setBatchId(createImportBatchId());
                    setFileName('');
                    setCsvText('');
                    setAnalysis(null);
                    setImportResult(null);
                    setBatchReady(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDefinitions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.moduleLabel} — {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" variant="outline" disabled={!definition} onClick={() => definition && downloadImportTemplate(definition)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">How this import works</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('import.csvOnlyNotice')}</li>
                <li>Use the template and keep one record per row.</li>
                <li>Required fields: {definition?.requiredColumns.join(', ')}.</li>
                <li>Optional fields help enrich records and improve matching.</li>
                <li>Warnings can import; errors are blocked until corrected.</li>
              </ul>
            </div>

            <p className="text-xs text-stone-400">
              Batch {batchId}{fileName ? ` · ${fileName}` : ''}{unresolvedRows.length > 0 ? ` · ${unresolvedRows.length} unresolved row(s)` : ''}
            </p>
            {(batchStorageError || batchRecoveryError) && (
              <p role="alert" className="rounded-lg border border-red-500/60 bg-red-950/40 p-3 text-sm text-red-100">
                {batchStorageError || batchRecoveryError}
                <Button type="button" variant="outline" className="ml-3" onClick={startNewImportBatch}>
                  {t('import.startNewBatch')}
                </Button>
              </p>
            )}

            {definition?.entity === 'TobaccoBlend' && (
              <div className="rounded-lg border border-stone-600 bg-stone-900/40 p-4 text-sm text-stone-200">
                <p className="font-semibold text-stone-100 mb-2">Accepted tobacco values</p>
                <p className="text-xs text-stone-400 mb-3">Constrained fields must use one of these values. Matching is case-insensitive; the imported value is normalized to the canonical spelling.</p>
                <div className="space-y-2">
                  {Object.entries(TOBACCO_IMPORT_ENUMS).map(([field, values]) => (
                    <div key={field}>
                      <span className="font-medium">{field}:</span>{' '}
                      <span className="text-stone-300">{values.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-stone-500/60 rounded-lg p-6 text-center space-y-3">
              <Upload className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="text-stone-300">Upload your completed CSV file</p>
              <Input type="file" accept=".csv" onChange={handleFileUpload} disabled={busy || !batchReady || Boolean(batchRecoveryError)} className="max-w-sm mx-auto" />
            </div>
          </CardContent>
        </Card>

        <ImportPreview analysis={analysis} mappings={mappings} t={t} />

        {analysis && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#b89255]/50 bg-[#241b16] p-4">
            <p className="text-sm text-stone-200">
              {t('import.batchSaved')}
            </p>
            {batchSaved && !batchStorageError && <Link
              className="inline-flex min-h-10 items-center rounded-md border border-[#b89255] px-4 text-sm font-medium text-[#ecd7ad] hover:bg-[#b89255]/15"
              to={`${createPageUrl('Curator')}?batch=${encodeURIComponent(batchId)}&type=${encodeURIComponent(resolvedImportType)}&prompt=${encodeURIComponent('Review this import batch')}`}
            >
              {t('import.curatorReviewBatch')}
            </Link>}
          </div>
        )}

        {analysis && (
          <Card className="border-[#e8d5b7]/30">
            <CardHeader>
              <CardTitle className="text-xl text-stone-100">Confirm Import</CardTitle>
              <CardDescription className="text-stone-300">
                Explicit confirmation is required before records are created.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-stone-300">
                {t('import.duplicatePolicy')}
              </p>
              <Button
                className="w-full"
                onClick={handleExecuteImport}
                disabled={busy || hasBlockingErrors || importableRows.length === 0 || !batchReady}
              >
                {busy ? 'Importing…' : importResult?.failed ? t('import.retryUnfinishedRows') : t('import.confirmImportRows', { count: importableRows.length })}
              </Button>

              {importResult && (
                <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {importResult.failed === 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-stone-100">Import Results</p>
                      <p className="text-sm text-stone-300">
                        Processed: {importResult.processed} • Imported: {importResult.imported} • Skipped: {importResult.skipped} • Failed: {importResult.failed}
                      </p>
                    </div>
                  </div>
                  {importResult.details.length > 0 && (
                    <ul className="max-h-40 overflow-auto text-xs text-stone-300 list-disc list-inside space-y-1">
                      {importResult.details.slice(0, 100).map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
