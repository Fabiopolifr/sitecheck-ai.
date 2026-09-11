import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import {
  composeOutreachEmail,
  composeOutreachFollowUpEmail,
} from "@/features/outreach/composeEmail";

export const dynamic = "force-dynamic";

// Fake but realistic sample data — the preview must never send anything
// or touch a real site, it only renders what the composer produces.
const SAMPLE = {
  businessName: "Immobiliare Rossi",
  website: "https://www.immobiliarerossi-esempio.it",
  toEmail: "info@immobiliarerossi-esempio.it",
  reason:
    "Cookie & Consent: Nessuna piattaforma di consenso rilevata, con tracker Google Analytics attivi",
};

// One id per variant so the deterministic picker shows all of them
// side by side instead of whichever one a single id happens to land on.
const SAMPLE_IDS = ["site-0", "site-1", "site-2", "site-3", "site-4", "site-5"];

function uniqueByVariant(
  emails: { subject: string; html: string; text: string; variant: string }[],
) {
  const seen = new Map<
    string,
    { subject: string; html: string; text: string; variant: string }
  >();
  for (const email of emails) {
    if (!seen.has(email.variant)) seen.set(email.variant, email);
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.variant.localeCompare(b.variant),
  );
}

function EmailCard({
  email,
}: {
  email: { subject: string; html: string; variant: string };
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="border-b border-zinc-200 bg-zinc-50/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
            Variante {email.variant}
          </span>
        </div>
        <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">
          Oggetto
        </p>
        <p className="text-sm font-medium text-zinc-900">{email.subject}</p>
      </div>
      <div className="bg-white p-4">
        {/* Safe: this is our own composer's output built from the hardcoded
            SAMPLE above, and every interpolated value goes through
            escapeHtml in composeEmail.ts. No user input reaches here. */}
        <div dangerouslySetInnerHTML={{ __html: email.html }} />
      </div>
    </div>
  );
}

export default function OutreachPreviewPage() {
  const initial = uniqueByVariant(
    SAMPLE_IDS.map((siteId) => composeOutreachEmail({ siteId, ...SAMPLE })),
  );
  const followUp = uniqueByVariant(
    SAMPLE_IDS.map((siteId) =>
      composeOutreachFollowUpEmail({ siteId, ...SAMPLE }),
    ),
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">
            Anteprima email
          </h1>
          <AdminNav />
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Come appaiono le email di outreach al destinatario, con dati di
          esempio. Questa pagina non invia nulla: rende solo il testo generato
          dal codice, quindi riflette sempre quello che partirà davvero.{" "}
          <Link
            href="/admin/outreach"
            className="font-medium text-accent hover:underline"
          >
            Torna all&apos;outreach
          </Link>
        </p>

        <h2 className="mt-8 text-sm font-semibold text-zinc-900">
          Primo contatto
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Inviata quando un sito risulta idoneo. Il problema citato nel riquadro
          rosso è sempre quello realmente rilevato dall&apos;audit, mai testo
          generico.
        </p>
        <div className="mt-4 space-y-6">
          {initial.map((email) => (
            <EmailCard key={email.variant} email={email} />
          ))}
        </div>

        <h2 className="mt-10 text-sm font-semibold text-zinc-900">Follow-up</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Inviata una sola volta, 4 giorni dopo la prima, solo se non c&apos;è
          stata conversione e il contatto non si è disiscritto.
        </p>
        <div className="mt-4 space-y-6">
          {followUp.map((email) => (
            <EmailCard key={email.variant} email={email} />
          ))}
        </div>
      </div>
    </main>
  );
}
