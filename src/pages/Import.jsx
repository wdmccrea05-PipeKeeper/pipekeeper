import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import { analyzeImportRows, executeImportRows, importDefinitionList, importDefinitions, downloadImportTemplate } from '@/lib/imports/importDefinitions';
import { parseCsvText } from '@/lib/imports/csvImportUtils';

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

function formatRowNotes(row) {
  if (row.errors.length > 0) return `Errors: ${row.errors.join(' • ')}`;
  if (row.warnings.length > 0) return `Warnings: ${row.warnings.join(' • ')}`;
  return '—';
}

function ImportPreview({ analysis }) {
  const { t } = useTranslation();
  if (!analysis) return null;

  return (
    <Card className="border-[#e8d5b7]/30">
      <CardHeader>
        <CardTitle className="text-lg text-stone-100">{t("auto.pages_Import.import_preview_fg9pvm")}</CardTitle>
        <CardDescription className="text-stone-300">
          {t("auto.pages_Import.review_rows_before_import_errors_are_1uudhf")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.blockingHeaderErrors.length > 0 && (
          <div className="rounded-lg border border-red-600/60 bg-red-900/20 p-3 text-sm text-red-100">
            <p className="font-semibold mb-1">{t("auto.pages_Import.blocking_file_errors_fpb3gr")}</p>
            <ul className="list-disc list-inside space-y-1">
              {analysis.blockingHeaderErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}

        {analysis.unknownColumns.length > 0 && (
          <div className="rounded-lg border border-yellow-600/60 bg-yellow-900/20 p-3 text-sm text-yellow-100">
            {t("auto.pages_Import.unsupported_columns_found_1cfjdw")} {analysis.unknownColumns.join(', ')}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryBadge label="Rows" value={analysis.totalRows} />
          <SummaryBadge tone="success" label="Valid" value={analysis.counts.valid} />
          <SummaryBadge tone="warning" label="Warnings" value={analysis.counts.warning} />
          <SummaryBadge tone="danger" label="Blocked" value={analysis.counts.error} />
        </div>

        <div className="overflow-auto max-h-80 border border-stone-700 rounded-lg">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-stone-900 sticky top-0">
              <tr>
                <th className="p-2 text-stone-200">{t("auto.pages_Import.row_376qgt")}</th>
                <th className="p-2 text-stone-200">{t("auto.pages_Import.item_yjvdp0")}</th>
                <th className="p-2 text-stone-200">{t("auto.pages_Import.status_1m8lgy")}</th>
                <th className="p-2 text-stone-200">{t("auto.pages_Import.notes_3te9gu")}</th>
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
                    {formatRowNotes(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {analysis.rows.length > 50 && (
          <p className="text-xs text-stone-400">
            {t("auto.pages_Import.showing_first_50_rows_of_lwlqfl")} {analysis.rows.length}{t("auto.pages_Import.remaining_rows_will_still_follow_the_1egk54")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ImportPage() {
  const { t } = useTranslation();
  const location = useLocation();
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
  const [analysis, setAnalysis] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState('create_only');

  // Ensure the selected import type is valid for available definitions
  const resolvedImportType = useMemo(() => {
    if (!availableDefinitions.length) return null;
    if (availableDefinitions.find((d) => d.id === importType)) return importType;
    return availableDefinitions[0]?.id ?? null;
  }, [availableDefinitions, importType]);

  const definition = resolvedImportType ? importDefinitions[resolvedImportType] : null;

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
    setImportResult(null);
    setAnalysis(null);

    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
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
      if (nextAnalysis.totalRows === 0) toast.warning(t("auto.pages_Import.no_data_rows_detected_kw8387"));
    } catch (error) {
      console.error('[Import] Parse failed:', error);
      toast.error(t('import.csvParseFailed'));
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!analysis || !definition) return;
    if (hasBlockingErrors) {
      toast.error(t("auto.pages_Import.fix_file_errors_before_importing_1gfon7"));
      return;
    }
    if (!importableRows.length) {
      toast.warning(t("auto.pages_Import.no_importable_rows_found_17ofkx"));
      return;
    }

    setBusy(true);
    try {
      const result = await executeImportRows({
        definition,
        analyzedRows: analysis.rows,
        duplicateMode,
      });
      setImportResult(result);
      refreshModuleCaches();
      toast.success(`Imported ${result.imported} row(s).`);
    } catch (error) {
      console.error('[Import] Execute failed:', error);
      toast.error(t("auto.pages_Import.import_failed_please_try_again_75w84a"));
    } finally {
      setBusy(false);
    }
  };

  if (!isPaidUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]">
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
      <div className="min-h-screen bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <a href={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.backToHome')}
            </Button>
          </a>
            <Card className="border-[#e8d5b7]/30">
              <CardHeader>
                <CardTitle className="text-xl text-stone-100">{t("auto.pages_Import.no_modules_available_qrasqk")}</CardTitle>
                <CardDescription className="text-stone-300">
                  {t("auto.pages_Import.bulk_import_requires_at_least_one_1fh1yi")}
                </CardDescription>
              </CardHeader>
            </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0b08] via-[#1a1410] to-[#0f0b08]">
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
                'import.bulkImportDesc'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm text-stone-300 mb-2 block">{t("auto.pages_Import.import_type_tnjw8y")}</label>
                <Select
                  value={resolvedImportType ?? ''}
                  onValueChange={(value) => {
                    setImportType(value);
                    setAnalysis(null);
                    setImportResult(null);
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
                  {t("auto.pages_Import.download_template_tzyrfd")}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">{t("auto.pages_Import.how_this_import_works_ffrbmk")}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t("auto.pages_Import.use_the_template_and_keep_one_762yl1")}</li>
                <li>{t("auto.pages_Import.required_fields_hqb7av")} {definition?.requiredColumns.join(', ')}.</li>
                <li>{t("auto.pages_Import.optional_fields_help_enrich_records_and_pojw3o")}</li>
                <li>{t("auto.pages_Import.warnings_can_import_errors_are_blocked_1fvkrh")}</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-stone-500/60 rounded-lg p-6 text-center space-y-3">
              <Upload className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="text-stone-300">{t("auto.pages_Import.upload_your_completed_csv_file_1u576f")}</p>
              <Input type="file" accept=".csv" onChange={handleFileUpload} disabled={busy} className="max-w-sm mx-auto" />
            </div>
          </CardContent>
        </Card>

        <ImportPreview analysis={analysis} />

        {analysis && (
          <Card className="border-[#e8d5b7]/30">
            <CardHeader>
              <CardTitle className="text-xl text-stone-100">{t("auto.pages_Import.confirm_import_15ei2u")}</CardTitle>
              <CardDescription className="text-stone-300">
                {t("auto.pages_Import.explicit_confirmation_is_required_before_records_13io8o")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-stone-300 mb-2 block">{t("auto.pages_Import.duplicate_handling_ib892d")}</label>
                  <Select value={duplicateMode} onValueChange={setDuplicateMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_only">{t("auto.pages_Import.create_new_only_default_safe_mode_ahunq7")}</SelectItem>
                      <SelectItem value="skip_duplicates">{t("auto.pages_Import.create_skip_detected_duplicates_1or15h")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={handleExecuteImport}
                    disabled={busy || hasBlockingErrors || importableRows.length === 0}
                  >
                    {busy ? 'Importing…' : `Import ${importableRows.length} row(s)`}
                  </Button>
                </div>
              </div>

              {importResult && (
                <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {importResult.failed === 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-stone-100">{t("auto.pages_Import.import_results_1e11o8")}</p>
                      <p className="text-sm text-stone-300">
                        {t("auto.pages_Import.processed_zzghl3")} {importResult.processed} {t("auto.pages_Import.imported_ialxd1")} {importResult.imported} {t("auto.pages_Import.skipped_roxn2p")} {importResult.skipped} {t("auto.pages_Import.failed_x43pdy")} {importResult.failed}
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
