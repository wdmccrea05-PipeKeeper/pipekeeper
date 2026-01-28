import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, Play, FastForward, XCircle, Trash2, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function SubscriptionMigrationCard() {
  const queryClient = useQueryClient();
  const [dryRun, setDryRun] = useState(true);
  const [limit, setLimit] = useState(500);
  const [running, setRunning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [error, setError] = useState(null);

  const isDone = (result) => {
    if (!result) return false;
    if (result.scanned < limit) return true;
    const changes = (result.usersCreated || 0) + (result.subsLinkedToUserId || 0) + 
                    (result.usersUpdated || 0) + (result.normalizedEmails || 0);
    return changes === 0;
  };

  const invalidateQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    await queryClient.invalidateQueries({ queryKey: ['user-subscription-report'] });
    await queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const runBatch = async () => {
    setError(null);
    try {
      const result = await base44.functions.invoke('migrateSubscriptionsToUserId', {
        dryRun,
        limit
      });

      const resultData = result.data;
      setLastResult(resultData);
      
      const logEntry = {
        ts: new Date().toISOString(),
        dryRun,
        limit,
        result: resultData
      };
      setLogEntries(prev => [logEntry, ...prev].slice(0, 20));

      if (!dryRun) {
        await invalidateQueries();
      }

      return resultData;
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || 'Unknown error';
      setError(errMsg);
      throw err;
    }
  };

  const runUntilDone = async () => {
    setRunning(true);
    setCancelRequested(false);
    setError(null);

    try {
      let batchCount = 0;
      while (!cancelRequested) {
        batchCount++;
        const result = await runBatch();
        
        if (isDone(result)) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      // Error already set in runBatch
    } finally {
      setRunning(false);
      setCancelRequested(false);
    }
  };

  const handleRunBatch = async () => {
    setRunning(true);
    try {
      await runBatch();
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = () => {
    setCancelRequested(true);
  };

  const handleClearLog = () => {
    setLogEntries([]);
    setLastResult(null);
    setError(null);
  };

  return (
    <Card className="border-[#A35C5C]/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-[#E0D8C8]">
              Subscription Migration (Stripe → Account Linked)
            </CardTitle>
            <CardDescription className="text-[#E0D8C8]/70 mt-2">
              Links legacy Stripe subscriptions (email-keyed) to PipeKeeper accounts (user_id). 
              Apple IAP is not linked by email.
            </CardDescription>
          </div>
          {!dryRun && (
            <Badge variant="destructive" className="ml-2">
              APPLIES CHANGES
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dryRun"
              checked={dryRun}
              onCheckedChange={setDryRun}
              disabled={running}
            />
            <Label htmlFor="dryRun" className="text-[#E0D8C8]">
              Dry Run {dryRun ? '(Safe Preview)' : '(OFF - Will Apply!)'}
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="batchSize" className="text-[#E0D8C8] whitespace-nowrap">
              Batch Size:
            </Label>
            <Input
              id="batchSize"
              type="number"
              min="1"
              max="1000"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 500)}
              disabled={running}
              className="w-24"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleRunBatch}
            disabled={running}
            variant="outline"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Batch
          </Button>
          
          <Button
            onClick={runUntilDone}
            disabled={running}
            size="sm"
          >
            <FastForward className="w-4 h-4 mr-2" />
            Run Until Done
          </Button>
          
          {running && (
            <Button
              onClick={handleCancel}
              variant="destructive"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          
          <Button
            onClick={handleClearLog}
            disabled={running}
            variant="secondary"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Log
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">Migration Error</div>
                <div className="text-sm break-words">{error}</div>
                {(error.includes("STRIPE_AUTH_FAILED") || error.includes("Invalid API Key") || error.includes("mk_")) && (
                  <div className="text-sm font-semibold text-yellow-200 mt-2">
                    ⚠️ Check STRIPE_SECRET_KEY - must start with sk_ or rk_
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Latest Result */}
        {lastResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <h4 className="text-sm font-semibold text-[#E0D8C8]">Latest Result</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/5 rounded p-2">
                <div className="text-[#E0D8C8]/70">Scanned</div>
                <div className="text-xl font-bold text-[#E0D8C8]">{lastResult.scanned || 0}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-[#E0D8C8]/70">Normalized</div>
                <div className="text-xl font-bold text-[#E0D8C8]">{lastResult.normalizedEmails || 0}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-[#E0D8C8]/70">Users Created</div>
                <div className="text-xl font-bold text-[#E0D8C8]">{lastResult.usersCreated || 0}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-[#E0D8C8]/70">Subs Linked</div>
                <div className="text-xl font-bold text-[#E0D8C8]">{lastResult.subsLinkedToUserId || 0}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-[#E0D8C8]/70">Users Updated</div>
                <div className="text-xl font-bold text-[#E0D8C8]">{lastResult.usersUpdated || 0}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-[#E0D8C8]/70">Skipped Apple</div>
                <div className="text-xl font-bold text-[#E0D8C8]">{lastResult.skippedApple || 0}</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-[#E0D8C8]/70">Conflicts</div>
                <div className="text-xl font-bold text-[#A35C5C]">{lastResult.conflicts || 0}</div>
              </div>
            </div>

            {/* Collapsible Details */}
            <Accordion type="single" collapsible className="w-full">
              {lastResult.createdUsers?.length > 0 && (
                <AccordionItem value="created">
                  <AccordionTrigger className="text-[#E0D8C8] text-sm">
                    Created Users ({lastResult.createdUsers.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-black/30 p-3 rounded overflow-auto max-h-48 text-[#E0D8C8]/80">
                      {JSON.stringify(lastResult.createdUsers, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {lastResult.linkedSubs?.length > 0 && (
                <AccordionItem value="linked">
                  <AccordionTrigger className="text-[#E0D8C8] text-sm">
                    Linked Subscriptions ({lastResult.linkedSubs.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-black/30 p-3 rounded overflow-auto max-h-48 text-[#E0D8C8]/80">
                      {JSON.stringify(lastResult.linkedSubs, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {lastResult.mismatches?.length > 0 && (
                <AccordionItem value="mismatches">
                  <AccordionTrigger className="text-[#A35C5C] text-sm">
                    Conflicts/Mismatches ({lastResult.mismatches.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-black/30 p-3 rounded overflow-auto max-h-48 text-[#A35C5C]/80">
                      {JSON.stringify(lastResult.mismatches, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}

        {/* Log Entries */}
        {logEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#E0D8C8]">Log History</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {logEntries.map((entry, idx) => (
                <div key={idx} className="text-xs bg-white/5 rounded p-2 space-y-1">
                  <div className="flex items-center justify-between text-[#E0D8C8]/70">
                    <span>{new Date(entry.ts).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <Badge variant={entry.dryRun ? "secondary" : "destructive"} className="text-xs">
                        {entry.dryRun ? 'DRY' : 'APPLY'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Batch: {entry.limit}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-[#E0D8C8] font-mono">
                    Scanned: {entry.result?.scanned || 0} | 
                    Linked: {entry.result?.subsLinkedToUserId || 0} | 
                    Created: {entry.result?.usersCreated || 0} | 
                    Conflicts: {entry.result?.conflicts || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}