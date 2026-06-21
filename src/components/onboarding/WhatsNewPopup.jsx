import React, { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

const WHATS_NEW_VERSION = "2.1.0";
const STORAGE_KEY = "pk_whats_new_seen";

export default function WhatsNewPopup({ user }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const seen = localStorage.getItem(`${STORAGE_KEY}_${WHATS_NEW_VERSION}_${user.email}`);
    if (seen === "true") return;
    const timer = window.setTimeout(() => setIsOpen(true), 1500);
    return () => window.clearTimeout(timer);
  }, [user?.email]);

  const handleDismiss = () => {
    if (dontShowAgain && user?.email) {
      localStorage.setItem(`${STORAGE_KEY}_${WHATS_NEW_VERSION}_${user.email}`, "true");
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const items = [
    { icon: "🧭", title: t("whatsNew.quickStartTitle"), description: t("whatsNew.quickStartDesc") },
    { icon: "🔗", title: t("whatsNew.sharingTitle"), description: t("whatsNew.sharingDesc") },
    { icon: "✨", title: t("whatsNew.curatorTitle"), description: t("whatsNew.curatorDesc") },
  ];

  return <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
    <div className="w-full max-w-xl rounded-2xl relative overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg, rgba(50,35,25,0.96), rgba(30,20,15,0.98))", border: "1px solid rgba(212, 175, 116, 0.3)" }}>
      <button onClick={handleDismiss} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all"><X className="w-5 h-5 text-[#E0D8C8]" /></button>
      <div className="px-8 pt-8 pb-4 text-center border-b border-[#E0D8C8]/20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: "rgba(212, 175, 116, 0.2)", border: "2px solid rgba(212, 175, 116, 0.4)" }}><Sparkles className="w-7 h-7" style={{ color: "#D4A574" }} /></div>
        <h2 className="text-3xl font-bold text-[#E0D8C8] mb-2">{t("whatsNew.title")}</h2>
        <p className="text-[#E0D8C8]/70">{t("whatsNew.subtitle")}</p>
      </div>
      <div className="px-8 py-6 space-y-4 max-h-96 overflow-y-auto">{items.map((item) => <div key={item.title} className="flex gap-4 p-3 rounded-lg" style={{ background: "rgba(60,45,30,0.3)" }}><div className="text-2xl flex-shrink-0">{item.icon}</div><div><h3 className="font-semibold text-[#E0D8C8] mb-1">{item.title}</h3><p className="text-sm text-[#E0D8C8]/70">{item.description}</p></div></div>)}</div>
      <div className="px-8 py-6 border-t border-[#E0D8C8]/20 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={dontShowAgain} onChange={(e)=>setDontShowAgain(e.target.checked)} className="w-4 h-4 rounded cursor-pointer" /><span className="text-sm text-[#E0D8C8]/70 group-hover:text-[#E0D8C8] transition-colors">{t("whatsNew.dontShowAgain")}</span></label>
        <div className="flex gap-3"><button onClick={handleDismiss} className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all hover:bg-white/10" style={{ color: "#D4A574" }}>{t("whatsNew.dismiss")}</button><a href="/Help" onClick={handleDismiss} className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white transition-all text-center" style={{ background: "linear-gradient(135deg, rgba(212,175,116,0.3), rgba(212,175,116,0.15))", border: "1px solid rgba(212,175,116,0.4)" }}>{t("whatsNew.learnMore")}</a></div>
      </div>
    </div>
  </div>
}
