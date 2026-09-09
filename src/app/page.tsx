import { AuditUrlForm } from "@/components/AuditUrlForm";
import { CheckCard } from "@/components/CheckCard";
import { StepItem } from "@/components/StepItem";
import { TrackPageView } from "@/components/TrackPageView";
import {
  CookieIcon,
  ShieldIcon,
  RadarIcon,
  SearchIcon,
  GaugeIcon,
  CheckBadgeIcon,
} from "@/components/icons";

const checks = [
  {
    icon: CookieIcon,
    title: "Cookie & Consent",
    description:
      "Rileviamo la presenza di un banner cookie e la configurazione degli strumenti di consenso.",
  },
  {
    icon: ShieldIcon,
    title: "Privacy",
    description:
      "Verifichiamo la presenza di pagine informative su privacy e cookie policy.",
  },
  {
    icon: RadarIcon,
    title: "Tracking",
    description:
      "Individuiamo pixel e script di tracciamento come GA4, Meta Pixel e Google Tag Manager.",
  },
  {
    icon: SearchIcon,
    title: "SEO",
    description:
      "Controlliamo title, meta description, struttura degli heading e indicizzabilità.",
  },
  {
    icon: GaugeIcon,
    title: "Performance",
    description:
      "Analizziamo i tempi di risposta e le metriche tecniche principali del sito.",
  },
];

const steps = [
  {
    number: 1,
    title: "Inserisci il sito",
    description: "Incolla l'indirizzo dell'agenzia, senza installare nulla.",
  },
  {
    number: 2,
    title: "Lo analizziamo",
    description: "Scansione tecnica automatica in pochi secondi.",
  },
  {
    number: 3,
    title: "Ricevi il Site Score",
    description: "Punteggio chiaro e priorità concrete da sistemare.",
  },
];

const trustBadges = [
  "100% gratuito",
  "Nessuna registrazione richiesta",
  "Nessun dato condiviso con terzi",
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <TrackPageView eventName="landing_view" />
      <section className="bg-grid relative flex flex-col items-center overflow-hidden px-6 py-24 text-center sm:py-32">
        <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-4 py-1.5 text-xs font-medium text-accent">
          <CheckBadgeIcon className="h-4 w-4" />
          Usato da agenzie immobiliari in tutta Italia
        </div>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Quanto è sano il sito della tua agenzia?
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
          Analizza in pochi secondi cookie, tracking, SEO, performance e altri
          elementi tecnici del tuo sito.
        </p>
        <AuditUrlForm />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {trustBadges.map((badge) => (
            <span
              key={badge}
              className="flex items-center gap-1.5 text-sm text-zinc-500"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-success"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {badge}
            </span>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-100 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-900">
            Cosa controlliamo
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-zinc-500">
            Cinque aree chiave che incidono su fiducia, conformità e
            conversioni del sito.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {checks.map((check) => (
              <CheckCard key={check.title} {...check} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-900">
            Come funziona
          </h2>
          <div className="relative mt-12 flex flex-col gap-10">
            <div
              className="absolute top-4 bottom-4 left-4 w-px bg-accent/15"
              aria-hidden
            />
            {steps.map((step) => (
              <StepItem key={step.number} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 px-6 py-20 text-center sm:py-24">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-semibold text-zinc-900">
            Pronto a controllare il tuo sito?
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            Analisi tecnica automatizzata. Nessuna installazione richiesta.
          </p>
          <div className="mt-8 flex justify-center">
            <AuditUrlForm />
          </div>
        </div>
      </section>
    </main>
  );
}
