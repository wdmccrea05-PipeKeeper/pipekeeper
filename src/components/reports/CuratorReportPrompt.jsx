import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { detectReportingRequest, explainReport } from "@/lib/curator/curatorReporting";
import { TEXT_CAPTION, TEXT_PRIMARY, TEXT_SECONDARY } from "@/lib/theme/tokens";

/**
 * Curator inside the Reporting Center: ask about the report on screen, or name
 * a different report and Curator opens it.
 */
export default function CuratorReportPrompt({ result, onOpenReport }) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);

  const ask = (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;

    const request = detectReportingRequest(text);
    if (request && request.reportId !== result?.id && typeof onOpenReport === "function") {
      onOpenReport(request.reportId);
      setAnswer({
        answer: `Opening ${request.title}. ${request.question ? "Ask again once it has loaded and I will summarise it." : ""}`,
        route: request.route,
      });
      return;
    }

    setAnswer(explainReport({ result, question: text }));
  };

  return (
    <section className="rounded-2xl p-4 space-y-3 no-print" style={{ border: "1px solid rgba(180,140,75,0.18)" }}>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
          {t("reporting.curatorTitle", "Ask Curator about this report")}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: TEXT_CAPTION }}>
          {t(
            "reporting.curatorHint",
            "Curator answers from the report on screen and the records behind it. It will say when something is not recorded."
          )}
        </p>
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("reporting.curatorPlaceholder", "Summarise this report, or ask for the storage report")}
          aria-label={t("reporting.curatorAsk", "Ask Curator about this report")}
        />
        <Button type="submit" style={{ minHeight: 44 }} disabled={!question.trim()}>
          <Send className="w-4 h-4" />
          <span className="sr-only">{t("reporting.curatorSend", "Ask")}</span>
        </Button>
      </form>

      {answer && (
        <div className="rounded-xl p-3" style={{ background: "rgba(180,140,75,0.08)", border: "1px solid rgba(180,140,75,0.16)" }}>
          <p className="text-sm whitespace-pre-line" style={{ color: TEXT_SECONDARY }}>{answer.answer}</p>
          {answer.groundedOn?.length > 0 && (
            <p className="text-xs mt-2" style={{ color: TEXT_CAPTION }}>
              {t("reporting.curatorGrounded", "Based on")}: {answer.groundedOn.join(", ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}