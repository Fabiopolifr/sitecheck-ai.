import { AuditUrlForm } from "@/components/AuditUrlForm";
import { CheckCard } from "@/components/CheckCard";
import { StepItem } from "@/components/StepItem";

const checks = [
  {
    title: "Cookie & Consent",
    description:
      "Rileviamo la presenza di un banner cookie e la configurazione degli strumenti di consenso.",
  },
  {
    title: "Privacy",
    description:
      "Verifichiamo la presenza di pagine informative su privacy e cookie policy.",
  },
  {
    title: "Tracking",
    description:
      "Individuiamo pixel e script di tracciamento come GA4, Meta Pixel e Google Tag Manager.",
  },
  {
    title: "SEO",
    description:
      "Controlliamo title, meta description, struttura degli heading e indicizzabilità.",
  },
  {
    title: "Performance",
    description:
      "Analizziamo i tempi di risposta e le metriche tecniche principali del sito.",
  },
];

const steps = [
  { number: 1, title: "Inserisci il sito" },
  { number: 2, title: "Lo analizziamo" },
  { number: 3, title: "Ricevi il Site Score" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center px-6 py-24 text-center sm:py-32">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Quanto è sano il sito della tua agenzia?
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
          Analizza in pochi secondi cookie, tracking, SEO, performance e altri
          elementi tecnici del tuo sito.
        </p>
        <AuditUrlForm />
        <p className="mt-4 text-sm text-zinc-500">
          Analisi tecnica automatizzata. Nessuna installazione richiesta.
        </p>
      </section>

      <section className="border-t border-zinc-100 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-900">
            Cosa controlliamo
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {checks.map((check) => (
              <CheckCard key={check.title} {...check} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-900">
            Come funziona
          </h2>
          <div className="mt-10 flex flex-col gap-6">
            {steps.map((step) => (
              <StepItem key={step.number} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50 px-6 py-20 text-center sm:py-24">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-semibold text-zinc-900">
            Pronto a controllare il tuo sito?
          </h2>
          <div className="mt-8 flex justify-center">
            <AuditUrlForm />
          </div>
        </div>
      </section>
    </main>
  );
}
