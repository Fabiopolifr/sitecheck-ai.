import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SiteCheck AI",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}
        </p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-7 text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Titolare del trattamento
            </h2>
            <p className="mt-2">
              Freesbe S.r.l., con sede in Via Nicolò Putignani 50, 70122 Bari
              (BA), Italia — P.IVA 09004560729. Per qualsiasi richiesta
              relativa al trattamento dei dati personali puoi scrivere a{" "}
              <a
                href="mailto:privacy@freesbe.it"
                className="text-accent hover:underline"
              >
                privacy@freesbe.it
              </a>{" "}
              o via PEC a{" "}
              <a
                href="mailto:freesbe@pec.it"
                className="text-accent hover:underline"
              >
                freesbe@pec.it
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Cosa fa SiteCheck AI
            </h2>
            <p className="mt-2">
              SiteCheck AI è uno strumento che analizza automaticamente un
              sito web fornito dall&apos;utente (cookie/consenso, privacy,
              tracking, SEO e performance) e restituisce un punteggio
              sintetico e un report. Questa pagina descrive quali dati
              raccogliamo per far funzionare il servizio, non la privacy
              policy generale del sito freesbe.it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Dati che raccogliamo
            </h2>
            <ul className="mt-2 flex flex-col gap-3">
              <li>
                <span className="font-medium text-zinc-900">
                  URL analizzato.
                </span>{" "}
                L&apos;indirizzo del sito che invii per l&apos;analisi, insieme
                al risultato tecnico della scansione (punteggio, elementi
                rilevati per categoria). Non richiediamo credenziali di
                accesso al sito analizzato.
              </li>
              <li>
                <span className="font-medium text-zinc-900">
                  Email e nome (facoltativi).
                </span>{" "}
                Se richiedi l&apos;invio del report via email, raccogliamo
                l&apos;indirizzo email e, se fornito, il nome. Il consenso a
                ricevere comunicazioni di marketing è separato e facoltativo
                rispetto all&apos;invio del report, che è un servizio
                richiesto attivamente.
              </li>
              <li>
                <span className="font-medium text-zinc-900">
                  Identificativo di sessione anonimo.
                </span>{" "}
                Generato casualmente e salvato nel tuo browser (
                <code>localStorage</code>, non un cookie) per collegare tra
                loro le azioni di una stessa visita (es. analisi avviata →
                risultati visti → report richiesto). Non è collegato a
                un&apos;identità reale a meno che tu non invii
                volontariamente la tua email.
              </li>
              <li>
                <span className="font-medium text-zinc-900">
                  Dati tecnici di utilizzo.
                </span>{" "}
                Eventi anonimi come visita alla pagina, avvio/completamento
                di un&apos;analisi, invio email, click su un partner
                affiliato — usati solo per statistiche interne aggregate di
                funzionamento del servizio.
              </li>
              <li>
                <span className="font-medium text-zinc-900">
                  Indirizzo IP.
                </span>{" "}
                Utilizzato tecnicamente e in modo transitorio per limitare il
                numero di richieste automatiche (protezione da abusi), non
                salvato in forma leggibile insieme ai risultati delle
                analisi.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Base giuridica e finalità
            </h2>
            <p className="mt-2">
              Trattiamo questi dati per eseguire il servizio richiesto
              (esecuzione di un contratto/misure precontrattuali, art. 6.1.b
              GDPR), per il legittimo interesse a garantire sicurezza e
              corretto funzionamento del servizio (art. 6.1.f), e — solo per
              le comunicazioni di marketing — sulla base del consenso
              esplicito e separato che ci fornisci (art. 6.1.a), revocabile
              in qualsiasi momento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Fornitori terzi coinvolti
            </h2>
            <p className="mt-2">
              Per erogare il servizio ci appoggiamo a fornitori tecnici che
              trattano dati per nostro conto, in qualità di responsabili del
              trattamento: hosting dell&apos;applicazione, database per la
              memorizzazione dei risultati, e — solo se attivi per il tuo
              invio — un provider di intelligenza artificiale per generare il
              riassunto testuale del report, un provider di invio email per
              recapitare il report richiesto, e l&apos;API Google PageSpeed
              Insights per la misurazione delle performance. Nessuno di
              questi fornitori riceve dati per finalità pubblicitarie
              proprie.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Conservazione dei dati
            </h2>
            <p className="mt-2">
              Conserviamo i dati per il tempo necessario a fornire il
              servizio e rispondere a obblighi di legge. Puoi richiedere in
              qualsiasi momento la cancellazione dei tuoi dati (in
              particolare l&apos;indirizzo email fornito) scrivendo a{" "}
              <a
                href="mailto:privacy@freesbe.it"
                className="text-accent hover:underline"
              >
                privacy@freesbe.it
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              I tuoi diritti
            </h2>
            <p className="mt-2">
              In quanto interessato hai diritto di accesso, rettifica,
              cancellazione, limitazione e opposizione al trattamento, oltre
              al diritto alla portabilità dei dati, ai sensi degli artt.
              15–22 del GDPR. Puoi esercitare questi diritti scrivendo a{" "}
              <a
                href="mailto:privacy@freesbe.it"
                className="text-accent hover:underline"
              >
                privacy@freesbe.it
              </a>{" "}
              e hai diritto di proporre reclamo al Garante per la protezione
              dei dati personali (www.garanteprivacy.it).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Cookie
            </h2>
            <p className="mt-2">
              Per informazioni dettagliate sui cookie utilizzati, consulta la{" "}
              <a href="/cookie-policy" className="text-accent hover:underline">
                Cookie Policy
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
