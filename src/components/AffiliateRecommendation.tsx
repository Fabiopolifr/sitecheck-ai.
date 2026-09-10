"use client";

import { useEffect, useRef } from "react";
import { getSessionId } from "@/lib/analytics/client";
import { ShieldIcon } from "@/components/icons";
import type {
  CookieYesRecommendation,
  RecommendationPriority,
} from "@/features/affiliate/cookieyesRecommendation";

type AffiliateRecommendationProps = CookieYesRecommendation & {
  auditId: string;
  partner: string;
  placement: string;
};

function buildHref(
  partner: string,
  auditId: string,
  reasonCode: string,
  placement: string,
  sessionId?: string,
) {
  const params = new URLSearchParams({
    audit: auditId,
    issue: reasonCode,
    placement,
  });
  if (sessionId) params.set("session", sessionId);
  return `/go/${encodeURIComponent(partner)}?${params.toString()}`;
}

function buildSupportHref(auditId: string, reasonCode: string) {
  const params = new URLSearchParams({ audit_id: auditId, reason: reasonCode });
  return `/support/cookieyes-setup?${params.toString()}`;
}

const CARD_CLASS: Record<RecommendationPriority, string> = {
  high: "rounded-2xl border border-accent/30 bg-accent-soft px-6 py-6",
  medium: "rounded-2xl border border-accent/20 bg-accent-soft/60 px-6 py-5",
  low: "rounded-xl border border-zinc-200 px-5 py-4",
};

export function AffiliateRecommendation({
  auditId,
  partner,
  placement,
  showRecommendation,
  priority,
  reasonCode,
  title,
  description,
  benefits,
  ctaLabel,
  showSupportCta,
  supportCtaCopy,
}: AffiliateRecommendationProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  // The session id only exists client-side (localStorage), so the link
  // starts without it (matches server-rendered markup) and gets it added
  // once mounted — set directly on the DOM node rather than via setState,
  // since this isn't state React needs to re-render on.
  useEffect(() => {
    if (linkRef.current) {
      linkRef.current.href = buildHref(
        partner,
        auditId,
        reasonCode,
        placement,
        getSessionId(),
      );
    }
  }, [partner, auditId, reasonCode, placement]);

  if (!showRecommendation) return null;

  const compact = priority === "low";

  return (
    <div className={CARD_CLASS[priority]}>
      {!compact && (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent shadow-sm">
          <ShieldIcon className="h-5 w-5" />
        </span>
      )}
      <h3
        className={`font-semibold text-zinc-900 ${compact ? "text-sm" : "mt-4 text-base"}`}
      >
        {title}
      </h3>
      <p
        className={`text-zinc-600 ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}
      >
        {description}
      </p>
      {benefits.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {benefits.slice(0, 3).map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-1.5 text-xs text-zinc-600"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 text-success"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>
      )}
      <a
        ref={linkRef}
        href={buildHref(partner, auditId, reasonCode, placement)}
        className={
          compact
            ? "mt-3 inline-flex text-sm font-medium text-accent hover:underline"
            : "mt-4 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm shadow-accent/30 transition-colors hover:bg-accent/90"
        }
      >
        {ctaLabel}
      </a>
      {!compact && showSupportCta && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-600">{supportCtaCopy}</p>
          <a
            href={buildSupportHref(auditId, reasonCode)}
            className="mt-2 inline-flex text-xs font-semibold text-accent hover:underline"
          >
            Configurazione assistita — €99 una tantum →
          </a>
        </div>
      )}
      {!compact && (
        <p className="mt-3 text-xs text-zinc-400">
          Link affiliato: se scegli CookieYes tramite questo report, SiteCheck
          AI può ricevere una commissione. Il Site Score non è influenzato da
          questa relazione commerciale.
        </p>
      )}
    </div>
  );
}
