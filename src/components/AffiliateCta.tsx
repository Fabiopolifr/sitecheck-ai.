type AffiliateCtaProps = {
  auditId: string;
  partner: string;
};

export function AffiliateCta({ auditId, partner }: AffiliateCtaProps) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 px-6 py-6">
      <h3 className="text-base font-semibold text-zinc-900">
        Approfondisci la gestione cookie e consenso
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Abbiamo rilevato elementi da verificare nella configurazione di cookie e
        consenso del sito.
      </p>
      <a
        href={`/go/${partner}?audit=${auditId}`}
        className="mt-4 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90"
      >
        Scopri come risolvere
      </a>
    </div>
  );
}
