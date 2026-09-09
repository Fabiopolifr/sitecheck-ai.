"use client";

import { useEffect, useRef } from "react";
import { getSessionId } from "@/lib/analytics/client";
import { ShieldIcon } from "@/components/icons";

type AffiliateCtaProps = {
  auditId: string;
  partner: string;
};

function buildHref(partner: string, auditId: string, sessionId?: string) {
  const params = new URLSearchParams({ audit: auditId });
  if (sessionId) params.set("session", sessionId);
  return `/go/${encodeURIComponent(partner)}?${params.toString()}`;
}

export function AffiliateCta({ auditId, partner }: AffiliateCtaProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  // The session id only exists client-side (localStorage), so the link
  // starts without it (matches server-rendered markup) and gets it added
  // once mounted — set directly on the DOM node rather than via setState,
  // since this isn't state React needs to re-render on.
  useEffect(() => {
    if (linkRef.current) {
      linkRef.current.href = buildHref(partner, auditId, getSessionId());
    }
  }, [partner, auditId]);

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent-soft px-6 py-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent shadow-sm">
        <ShieldIcon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-zinc-900">
        Approfondisci la gestione cookie e consenso
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Abbiamo rilevato elementi da verificare nella configurazione di cookie e
        consenso del sito.
      </p>
      <a
        ref={linkRef}
        href={buildHref(partner, auditId)}
        className="mt-4 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm shadow-accent/30 transition-colors hover:bg-accent/90"
      >
        Scopri come risolvere
      </a>
    </div>
  );
}
