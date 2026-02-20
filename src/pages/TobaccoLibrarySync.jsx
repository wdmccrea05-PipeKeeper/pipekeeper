import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { getTobaccoLogo } from "@/components/tobacco/TobaccoLogoLibrary";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function TobaccoLibrarySyncPage() {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    retry: 1,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    enabled: !!user?.email,
    retry: 1,
    queryFn: async () => {
      const rows = await base44.entities.TobaccoBlend.filter({ created_by: user.email });
      return Array.isArray(rows) ? rows : [];
    },
  });

  const blendsNeedingLogos = blends.filter(b => b.manufacturer && !b.logo);

  const handleSync = async () => {
    setSyncing(true);
    const updated = [];
    const failed = [];

    for (const blend of blendsNeedingLogos) {
      try {
        const libraryLogo = getTobaccoLogo(blend.manufacturer);
        await safeUpdate('TobaccoBlend', blend.id, { logo: libraryLogo }, user?.email);
        updated.push(blend.name);
      } catch (err) {
        failed.push(blend.name);
      }
    }

    setResults({ updated, failed });
    invalidateBlendQueries(queryClient, user?.email);
    setSyncing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-stone-50 to-stone-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">{t("tobaccoLibrarySync.title")}</h1>
          <p className="text-stone-600 mt-2">
            {t("tobaccoLibrarySync.description")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("tobaccoLibrarySync.syncStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">{t("tobaccoLibrarySync.totalBlends")}</p>
                <p className="text-2xl font-bold text-stone-800">{blends.length}</p>
              </div>
              <div>
                <p className="text-sm text-stone-600">{t("tobaccoLibrarySync.missingLogos")}</p>
                <p className="text-2xl font-bold text-amber-600">{blendsNeedingLogos.length}</p>
              </div>
            </div>

            {blendsNeedingLogos.length > 0 && !results && (
              <>
                <div className="border-t pt-4">
                  <p className="text-sm text-stone-600 mb-3">
                    {t("tobaccoLibrarySync.willBeUpdated")}
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {blendsNeedingLogos.map(blend => (
                      <div key={blend.id} className="text-sm text-stone-700 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        {blend.name} ({blend.manufacturer})
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full bg-amber-700 hover:bg-amber-800"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t("tobaccoLibrarySync.syncing")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t("tobaccoLibrarySync.syncButtonLabel", { 
                        count: blendsNeedingLogos.length,
                        suffix: blendsNeedingLogos.length !== 1 ? 's' : ''
                      })}
                    </>
                  )}
                </Button>
              </>
            )}

            {blendsNeedingLogos.length === 0 && !results && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold text-stone-800">{t("tobaccoLibrarySync.allHaveLogos")}</p>
                <p className="text-sm text-stone-600">{t("tobaccoLibrarySync.noSyncNeeded")}</p>
              </div>
            )}

            {results && (
              <div className="space-y-4 border-t pt-4">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="font-semibold text-stone-800">{t("tobaccoLibrarySync.syncComplete")}</p>
                </div>
                
                {results.updated.length > 0 && (
                  <div>
                    <Badge className="bg-green-100 text-green-800 mb-2">
                      {results.updated.length} {t("tobaccoLibrarySync.updated")}
                    </Badge>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.updated.map((name, idx) => (
                        <div key={idx} className="text-sm text-stone-700 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.failed.length > 0 && (
                  <div>
                    <Badge className="bg-rose-100 text-rose-800 mb-2">
                      {results.failed.length} Failed
                    </Badge>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.failed.map((name, idx) => (
                        <div key={idx} className="text-sm text-rose-700 flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setResults(null)}
                  variant="outline"
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}