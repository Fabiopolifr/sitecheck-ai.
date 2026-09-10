"use client";

import { useState, type ReactNode } from "react";
import { EmailCaptureForm } from "@/components/EmailCaptureForm";

type GatedContentProps = {
  auditId: string;
  gated: boolean;
  children: ReactNode;
  cookieConsentScore?: number | null;
  trackerCount?: number;
  cmpVendor?: string | null;
};

/**
 * A/B experiment (src/features/audit/abTest.ts): for the "gated" variant,
 * the wrapped content (full category breakdown) stays hidden behind an
 * email form until submission succeeds — then it unlocks instantly,
 * client-side, no reload. The control variant renders children directly.
 */
export function GatedContent({
  auditId,
  gated,
  children,
  cookieConsentScore = null,
  trackerCount = 0,
  cmpVendor = null,
}: GatedContentProps) {
  const [unlocked, setUnlocked] = useState(!gated);

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div>
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <rect
            x="4"
            y="10"
            width="16"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 10V7a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </span>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm text-zinc-600">
        Il dettaglio completo categoria per categoria (Tecnico, SEO, Privacy,
        Tracking, Performance) si sblocca con la tua email.
      </p>
      <div className="mt-4">
        <EmailCaptureForm
          auditId={auditId}
          source="gate"
          heading="Sblocca l'analisi dettagliata"
          description="Ti mandiamo anche il link ai risultati via email."
          ctaLabel="Sblocca l'analisi"
          onSuccess={() => setUnlocked(true)}
          showSupportOption
          cookieConsentScore={cookieConsentScore}
          trackerCount={trackerCount}
          cmpVendor={cmpVendor}
        />
      </div>
    </div>
  );
}
