import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { getShareByToken } from "@/components/share/shareUtils";
import { buildPublicPipeShareView, buildPublicTobaccoShareView } from "@/components/share/shareFieldSelectors";
import { PipeShareCard, TobaccoShareCard } from "@/components/share/ShareCardRenderer";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png";

export default function PublicSharedRecord() {
  const { t } = useTranslation();
  const { moduleType, shareToken } = useParams();
  const navigate = useNavigate();
  const [shareRecord, setShareRecord] = useState(null);
  const [record, setRecord] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const share = await getShareByToken(shareToken);
        if (!share) {
          setError("notFound");
          return;
        }
        setShareRecord(share);
        const entityName = moduleType === "pipe" ? "Pipe" : "TobaccoBlend";
        let found = null;
        try {
          found = await base44.entities[entityName].get(share.record_id);
        } catch {}
        if (!found) {
          const records = await base44.entities[entityName].filter({ id: share.record_id });
          found = Array.isArray(records) && records.length > 0 ? records[0] : null;
        }
        if (!found) {
          setError("recordNotFound");
          return;
        }
        let profile = null;
        try {
          const profiles = await base44.entities.UserProfile.filter({ user_email: share.owner_email });
          profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
        } catch {}
        setUserProfile(profile);
        setRecord(moduleType === "pipe" ? buildPublicPipeShareView(found, share.share_config || share, profile || {}) : buildPublicTobaccoShareView(found, share.share_config || share, profile || {}));
      } catch (e) {
        console.error(e);
        setError("loadFailed");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [moduleType, shareToken]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0b08" }}><div className="text-center"><div className="w-8 h-8 border-4 border-[rgba(180,140,75,0.3)] border-t-[#D4A574] rounded-full animate-spin mx-auto mb-4" /><p style={{ color: "rgba(224,216,200,0.7)" }}>{t("common.loading", { defaultValue: "Loading..." })}</p></div></div>;

  if (error || !record || !shareRecord) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0b08" }}><div className="max-w-md mx-auto p-6 text-center"><AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#D45C5C" }} /><h1 style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>{t(`share.error.${error || 'notFound'}.title`, { defaultValue: "Share not available" })}</h1><p style={{ color: "rgba(224,216,200,0.7)", marginBottom: 24 }}>{t(`share.error.${error || 'notFound'}.message`, { defaultValue: "This shared record could not be loaded." })}</p><Button onClick={() => navigate("/")}>{t("share.backHome", { defaultValue: "Back Home" })}</Button></div></div>;

  return <div className="min-h-screen" style={{ background: "radial-gradient(circle at 30% 20%, rgba(120,85,55,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(70,50,35,0.2), transparent 50%), #0f0b08" }}>
    <nav className="border-b" style={{ background: "linear-gradient(to bottom, rgba(28, 20, 14, 0.97), rgba(24, 16, 12, 0.99))", borderBottomColor: "rgba(120, 90, 65, 0.35)", backdropFilter: "blur(10px)" }}>
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-[#E0D8C8]"><ChevronLeft className="w-5 h-5" /></Button>
          <img src={LOGO} alt="PipeKeeper" className="h-6 object-contain" />
        </div>
      </div>
    </nav>
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex justify-center mb-12">{moduleType === "pipe" ? <PipeShareCard pipe={record} userProfile={userProfile} /> : <TobaccoShareCard tobacco={record} userProfile={userProfile} />}</div>
      <div className="text-center max-w-md mx-auto"><div className="bg-gradient-to-br from-[#2a1f18] to-[#1f1510] border border-[rgba(180,140,75,0.25)] rounded-lg p-6"><p style={{ color: "rgba(224, 216, 200, 0.8)", marginBottom: 12, fontSize: 14 }}>{t("share.startOwnCollection", { defaultValue: "Start your own collection" })}</p><Button onClick={() => navigate("/")} className="w-full bg-[#A35C5C] hover:bg-[#8F4E4E]">{t("share.openPipeKeeper", { defaultValue: "Open PipeKeeper" })}</Button><p style={{ color: "rgba(180, 140, 75, 0.6)", fontSize: 11, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("share.poweredByPipeKeeper", { defaultValue: "Shared from PipeKeeper" })}</p></div></div>
    </div>
  </div>;
}
