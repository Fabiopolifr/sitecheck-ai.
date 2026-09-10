"use client";

import { useState } from "react";
import { getSessionId } from "@/lib/analytics/client";
import { resolveSupportBoxCopy } from "@/features/affiliate/cookieyesRecommendation";

type EmailCaptureFormProps = {
  auditId: string;
  /** Distinguishes where the lead came from in analytics (default vs. the A/B gate). */
  source?: string;
  heading?: string;
  description?: string;
  ctaLabel?: string;
  onSuccess?: () => void;
  /**
   * Shows the "Vuoi che configuriamo CookieYes per te?" support box below
   * the email field, with copy that scales with how much the audit
   * found wrong (AI/DECISIONS.md D33). Omit on forms that are themselves
   * a support request already (e.g. /support/cookieyes-setup) — asking
   * twice would be redundant.
   */
  showSupportOption?: boolean;
  cookieConsentScore?: number | null;
  trackerCount?: number;
  cmpVendor?: string | null;
};

export function EmailCaptureForm({
  auditId,
  source = "default",
  heading = "Salva questo report",
  description = "Ti mandiamo il link ai risultati via email, così puoi ritrovarli quando vuoi o condividerli con il tuo team.",
  ctaLabel = "Invia report",
  onSuccess,
  showSupportOption = false,
  cookieConsentScore = null,
  trackerCount = 0,
  cmpVendor = null,
}: EmailCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [supportRequested, setSupportRequested] = useState(false);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  const supportCopy = resolveSupportBoxCopy({
    cookieConsentScore,
    trackerCount,
    cmpVendor,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          email,
          consentMarketing: consent,
          sessionId: getSessionId(),
          source,
          supportRequested: showSupportOption ? supportRequested : undefined,
          supportPhone:
            showSupportOption && supportRequested && phone.trim()
              ? phone.trim()
              : undefined,
        }),
      });

      if (response.ok) {
        setStatus("done");
        onSuccess?.();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-success/20 bg-success/5 px-6 py-6 text-sm text-zinc-700">
        <div className="flex items-center gap-3">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 shrink-0 text-success"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
          {showSupportOption && supportRequested
            ? "Riceverai il report via email. Abbiamo ricevuto anche la tua richiesta di supporto CookieYes: ti ricontatteremo per valutare insieme la configurazione del tuo sito."
            : "Grazie! Ti abbiamo inviato il report via email."}
        </div>
        {showSupportOption && supportRequested && (
          <span className="mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            Setup assistito · €99 una tantum
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent-soft px-6 py-6">
      <h3 className="text-base font-semibold text-zinc-900">{heading}</h3>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <input
            type="email"
            required
            placeholder="nome@agenzia.it"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={status === "loading"}
            className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="shrink-0 rounded-full bg-accent px-6 py-3 text-base font-medium text-white shadow-sm shadow-accent/30 transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {status === "loading" ? "Invio…" : ctaLabel}
          </button>
        </div>

        <label className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5"
          />
          Acconsento a ricevere comunicazioni marketing da SiteCheck AI
          (facoltativo, separato dall&apos;invio del report).
        </label>

        {showSupportOption && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-zinc-900">
              {supportCopy.title}
            </p>
            <p className="mt-1 text-xs text-zinc-600">{supportCopy.body}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              I €99 coprono solo la configurazione fatta da noi.
              L&apos;eventuale piano CookieYes (anche gratuito per siti piccoli)
              resta a parte, sul tuo account CookieYes.
            </p>
            <label className="mt-2 flex items-start gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                checked={supportRequested}
                onChange={(event) => setSupportRequested(event.target.checked)}
                className="mt-0.5"
              />
              {supportCopy.checkboxLabel}
            </label>
            {supportRequested && (
              <div className="mt-3">
                <input
                  type="tel"
                  placeholder="+39 ..."
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Lo useremo esclusivamente per ricontattarti in merito alla
                  richiesta di supporto.
                </p>
              </div>
            )}
          </div>
        )}

        {status === "error" && (
          <p className="mt-2 text-xs text-red-600">
            Invio non riuscito. Riprova.
          </p>
        )}
      </form>
    </div>
  );
}
