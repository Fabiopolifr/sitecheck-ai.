import { env } from "@/lib/config/env";

export type PartnerConfig = {
  destination: string | undefined;
  utmCampaign: string;
};

/**
 * Generic partner routing per AI/MASTER_SPEC.md §12: `/go/[partner]`.
 * Adding a new affiliate partner means adding one entry here plus its
 * destination URL as an environment variable — never hardcode an
 * affiliate ID in source.
 */
const PARTNERS: Record<string, PartnerConfig> = {
  cookieyes: {
    destination: env.COOKIEYES_AFFILIATE_URL,
    utmCampaign: "cookie-consent",
  },
};

export function getPartnerConfig(partner: string): PartnerConfig | null {
  return PARTNERS[partner] ?? null;
}
