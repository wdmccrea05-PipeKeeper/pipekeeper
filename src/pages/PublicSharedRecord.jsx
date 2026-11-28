import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CollectionShareView from "@/components/share/CollectionShareView";
import { fetchSharePayload } from "@/lib/share/shareClient";

const LOGO = "https://media.base44.com/images/public/694956e18d119cc497192525/b5c3204ab_CollectionKeeperWB.png";

const ERROR_COPY = {
  not_found: { title: "This link is not available", message: "The link may be mistyped, or the owner removed it." },
  revoked: { title: "This link was revoked", message: "The owner is no longer sharing this collection." },
  expired: { title: "This link has expired", message: "Ask the owner for a new link." },
  inactive: { title: "This link is not available", message: "The owner turned sharing off for this collection." },
};

export default function PublicSharedRecord() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchSharePayload(shareToken);
        if (cancelled) return;
        if (result?.items) setPayload(result);
        else setError(result?.error || "not_found");
      } catch (e) {
        if (cancelled) return;
        const code = e?.response?.data?.error || e?.data?.error || "not_found";
        setError(code);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#242729" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[rgba(180,140,75,0.3)] border-t-[#D4A574] rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: "rgba(224,216,200,0.7)" }}>Opening shared collection…</p>
        </div>
      </div>
    );
  }

  const copy = ERROR_COPY[error] || ERROR_COPY.not_found;

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#242729" }}>
        <div className="max-w-md mx-auto p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#D45C5C" }} />
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "#FFFFFF" }}>{copy.title}</h1>
          <p style={{ color: "rgba(224,216,200,0.7)", marginBottom: 24 }}>{copy.message}</p>
          <Button onClick={() => navigate("/")}>Open CollectionKeeper</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 30% 20%, rgba(120,85,55,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(70,50,35,0.2), transparent 50%), #242729",
      }}
    >
      <nav className="border-b" style={{ background: "rgba(24,16,12,0.98)", borderBottomColor: "rgba(120,90,65,0.35)" }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-[#E0D8C8]">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <img src={LOGO} alt="CollectionKeeper" className="h-7 object-contain" />
          </div>
          <span className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(224,216,200,0.5)" }}>Read-only share</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <CollectionShareView payload={payload} />

        <div className="mt-10 max-w-md mx-auto rounded-xl p-6 text-center" style={{ background: "linear-gradient(135deg,#34383a,#292c2e)", border: "1px solid rgba(180,140,75,0.25)" }}>
          <p className="text-sm mb-3" style={{ color: "rgba(224,216,200,0.8)" }}>
            Catalogue your own pipes, tobacco, cigars, whiskey and wine.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">Open CollectionKeeper</Button>
        </div>
      </main>
    </div>
  );
}