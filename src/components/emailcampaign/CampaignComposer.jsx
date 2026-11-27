import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMAIL_LANGUAGE_CODES, EMAIL_LANGUAGE_LABELS } from "./emailLanguages";

const GOLD = "#D4A574";

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Campaign settings: identity, sender compliance details, languages and
 * schedule. Nothing here sends anything — distribution stays behind approval.
 */
export default function CampaignComposer({ campaign, saving, onCreate, onUpdate }) {
  const [name, setName] = useState(campaign?.name || "");
  const [address, setAddress] = useState(campaign?.mailing_address || "");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [languages, setLanguages] = useState(campaign?.languages || []);
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(campaign?.scheduled_at));

  useEffect(() => {
    setName(campaign?.name || "");
    setAddress(campaign?.mailing_address || "");
    setSubject(campaign?.subject || "");
    setLanguages(campaign?.languages || []);
    setScheduledAt(toLocalInput(campaign?.scheduled_at));
  }, [campaign?.id, campaign?.name, campaign?.mailing_address, campaign?.subject, campaign?.languages, campaign?.scheduled_at]);

  const toggleLanguage = (code) => {
    setLanguages((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    );
  };

  const locked = ["sending", "sent", "cancelled"].includes(campaign?.status);

  const save = () => {
    const payload = {
      name: name.trim(),
      mailing_address: address.trim(),
      subject: subject.trim(),
      languages,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };
    if (campaign?.id) onUpdate(payload);
    else onCreate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs space-y-1 block">
          <span style={{ color: "rgba(224,216,200,0.7)" }}>Campaign name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Black Friday appreciation email" disabled={locked} />
        </label>
        <label className="text-xs space-y-1 block">
          <span style={{ color: "rgba(224,216,200,0.7)" }}>Business mailing address (required before sending)</span>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, state, postal code, country"
            disabled={locked}
          />
        </label>
      </div>

      <label className="text-xs space-y-1 block">
        <span style={{ color: "rgba(224,216,200,0.7)" }}>Subject line (blank uses the localized default)</span>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={locked} placeholder="We Would Never Leave a Fellow Collector Out — Your Free Week of Pro!" />
      </label>

      <div className="space-y-2">
        <p className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>
          Languages (none selected = every collector receives their own language)
        </p>
        <div className="flex flex-wrap gap-2">
          {EMAIL_LANGUAGE_CODES.map((code) => {
            const active = languages.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleLanguage(code)}
                disabled={locked}
                className="px-3 py-1.5 rounded-full text-xs transition"
                style={{
                  background: active ? "rgba(212,165,116,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? GOLD : "rgba(180,140,75,0.2)"}`,
                  color: active ? GOLD : "rgba(224,216,200,0.75)",
                }}
              >
                {EMAIL_LANGUAGE_LABELS[code]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="text-xs space-y-1 block sm:max-w-xs">
        <span style={{ color: "rgba(224,216,200,0.7)" }}>Schedule for (optional)</span>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} disabled={locked} />
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || locked || !name.trim()} style={{ background: GOLD, color: "#241811" }}>
          {saving ? "Saving…" : campaign?.id ? "Save campaign" : "Create campaign"}
        </Button>
        {!address.trim() && (
          <span className="text-[11px]" style={{ color: "#F0B9A8" }}>
            A mailing address is required for compliance before distribution.
          </span>
        )}
      </div>
    </div>
  );
}