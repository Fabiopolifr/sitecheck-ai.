import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — SiteCheck AI",
};

export default function CookiePolicyPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Cookie Policy
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}
        </p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-7 text-zinc-700">
          <section>
            <p>
              SiteCheck AI, servizio di Freesbe S.r.l. (P.IVA 09004560729), usa
              un numero minimo di cookie tecnici. Non utilizziamo cookie di
              profilazione, marketing o tracciamento pubblicitario, e non
              condividiamo dati di navigazione con reti pubblicitarie o social
              network.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Cookie tecnici che utilizziamo
            </h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Finalità</th>
                    <th className="px-4 py-3">Durata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">
                      sitecheck_admin_session
                    </td>
                    <td className="px-4 py-3">
                      Mantiene la sessione autenticata dell&apos;area riservata{" "}
                      <code>/admin</code>, riservata al personale Freesbe.
                      Impostato solo dopo un login riuscito con password, mai
                      per i visitatori del sito.
                    </td>
                    <td className="px-4 py-3">7 giorni</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Cosa NON usiamo
            </h2>
            <p className="mt-2">
              Per riconoscere le azioni di una stessa visita (ad esempio,
              collegare l&apos;avvio di un&apos;analisi ai suoi risultati)
              usiamo un identificativo casuale salvato nel tuo browser tramite{" "}
              <code>localStorage</code>, non un cookie: non viene inviato
              automaticamente al server con ogni richiesta, resta solo sul tuo
              dispositivo, e puoi cancellarlo in qualsiasi momento svuotando i
              dati di navigazione del browser.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              Come gestire i cookie
            </h2>
            <p className="mt-2">
              Puoi bloccare o cancellare il cookie tecnico descritto sopra dalle
              impostazioni del tuo browser in qualsiasi momento; questo non
              impedisce l&apos;utilizzo delle funzionalità pubbliche del sito
              (analisi, visualizzazione risultati, richiesta report), ma renderà
              necessario un nuovo login per accedere all&apos;area riservata{" "}
              <code>/admin</code>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">Contatti</h2>
            <p className="mt-2">
              Per domande su questa Cookie Policy scrivi a{" "}
              <a
                href="mailto:privacy@freesbe.it"
                className="text-accent hover:underline"
              >
                privacy@freesbe.it
              </a>
              . Per informazioni sul trattamento dei dati personali, consulta la{" "}
              <a href="/privacy-policy" className="text-accent hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
