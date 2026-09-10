import type { Metadata } from "next";
import { EmailCaptureForm } from "@/components/EmailCaptureForm";

export const metadata: Metadata = {
  title: "Configurazione assistita CookieYes — SiteCheck AI",
};

const INCLUDES = [
  "Installazione CookieYes",
  "Collegamento del dominio",
  "Prima scansione cookie",
  "Configurazione banner",
  "Configurazione categorie",
  "Integrazione base con i tracker rilevati",
  "Verifica visualizzazione desktop/mobile",
  "Controllo tecnico finale",
];

const STEPS = [
  {
    number: 1,
    title: "Richiedi il setup",
    description: "Lascia la tua email: ti ricontattiamo per i dettagli.",
  },
  {
    number: 2,
    title: "Ci dai accesso",
    description:
      "Ci invii gli accessi al sito (o inviti un nostro tecnico) e confermi il pagamento di €99.",
  },
  {
    number: 3,
    title: "Configuriamo tutto",
    description:
      "Installiamo e configuriamo CookieYes in base ai tracker e alla struttura del tuo sito.",
  },
  {
    number: 4,
    title: "Conferma finale",
    description: "Ricevi conferma del completamento e una verifica tecnica.",
  },
];

export default async function CookieYesSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ audit_id?: string; reason?: string }>;
}) {
  const { audit_id: auditId } = await searchParams;

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          CookieYes pronto sul tuo sito, configurato per te
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          Installazione e configurazione tecnica iniziale a{" "}
          <strong>€99 una tantum</strong>.
        </p>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Cosa include
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INCLUDES.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-zinc-700"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 shrink-0 text-success"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Come funziona
          </h2>
          <div className="relative mt-6 flex flex-col gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {step.number}
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Tempi indicativi
          </h2>
          <p className="mt-3 text-sm text-zinc-600">
            Di norma completiamo la configurazione entro 2-3 giorni lavorativi
            dalla ricezione degli accessi.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Domande frequenti
          </h2>
          <div className="mt-4 flex flex-col gap-4 text-sm">
            <div>
              <p className="font-medium text-zinc-900">
                Il prezzo include l&apos;abbonamento a CookieYes?
              </p>
              <p className="mt-1 text-zinc-600">
                No, i €99 coprono solo la configurazione tecnica iniziale che
                facciamo noi. L&apos;eventuale piano CookieYes (anche gratuito
                per siti piccoli) resta a parte, attivato direttamente sul tuo
                account CookieYes.
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-900">
                Serve accesso amministratore al sito?
              </p>
              <p className="mt-1 text-zinc-600">
                Sì, per installare lo script e configurare il banner serve un
                accesso con permessi sufficienti (es. admin WordPress o accesso
                FTP/hosting).
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <EmailCaptureForm
            auditId={auditId ?? "support-request"}
            source="cookieyes_setup"
            heading="Richiedi il setup"
            description="Lascia la tua email: ti ricontattiamo per procedere."
            ctaLabel="Richiedi la configurazione assistita"
          />
        </section>
      </div>
    </main>
  );
}
