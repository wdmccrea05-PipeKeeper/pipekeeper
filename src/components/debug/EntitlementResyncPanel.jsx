import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { triggerEntitlementResync, adminCheckEntitlement } from "@/components/utils/entitlementSync";

export default function EntitlementResyncPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");

  const handleResync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await triggerEntitlementResync();
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCheck = async () => {
    if (!adminEmail.trim()) {
      setError("Please enter an email");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await adminCheckEntitlement(adminEmail);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-sm text-xs">
      <div className="font-bold text-white mb-3">Entitlement Resync</div>

      <div className="space-y-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleResync}
          disabled={loading}
          className="w-full text-xs"
        >
          {loading ? "Syncing..." : "Resync My Entitlement"}
        </Button>

        <div className="flex gap-1">
          <input
            type="email"
            placeholder="Email (admin)"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="flex-1 px-2 py-1 rounded text-xs bg-gray-800 border border-gray-700 text-white"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdminCheck}
            disabled={loading}
            className="text-xs"
          >
            Check
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-2 text-red-200 mb-2">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded p-2 text-gray-300 mb-2 max-h-48 overflow-y-auto">
          <pre className="text-[10px] whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="text-gray-500 text-[10px]">
        Check browser console for detailed logs
      </div>
    </div>
  );
}