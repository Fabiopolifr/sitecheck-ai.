# Decisions — SiteCheck AI

## Scopo del documento

Questo documento registra le decisioni architetturali e di prodotto già
prese durante lo sviluppo di SiteCheck AI, con relative motivazioni.

## Stato

Phase 5 — Content Engine completata (infrastruttura).

## Decisioni

### D1 — Stack: Next.js + TypeScript + Tailwind CSS

**Decisione:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
strict, Tailwind CSS v4.

**Motivazione:** stack raccomandato in `AI/MASTER_SPEC.md` §24, moderno,
ampio supporto hosting Node-compatibile, buon rapporto produttività/costo
zero (nessuna licenza), community e tooling maturi.

### D2 — File spec canonico spostato in `AI/MASTER_SPEC.md`

**Decisione:** il file `SiteCheck_AI_MASTER_SPEC.md` caricato da ChatGPT
nella root del repository è stato spostato in `AI/MASTER_SPEC.md`.

**Motivazione:** `CLAUDE.md` indica esplicitamente `AI/MASTER_SPEC.md`
come posizione canonica della specifica di prodotto. Mantenere due copie
avrebbe creato rischio di disallineamento.

### D3 — Database: PostgreSQL via Supabase (decisione preliminare)

**Decisione:** per la persistenza (Phase 2) si userà PostgreSQL, con
Supabase come provider preferito (DB gestito + Auth + free tier).

**Motivazione:** indicazione esplicita in `AI/MASTER_SPEC.md` §10, budget
iniziale ridotto (~€100), necessità di Auth semplice per l'admin (§13) e
riduzione del tempo di sviluppo. L'accesso al DB sarà comunque isolato in
`src/lib/db/` per mantenere portabilità verso un Postgres self-hosted se
necessario in futuro.

**Nota:** nessuna integrazione Supabase è stata implementata in Phase 0.
Questa è una decisione di indirizzo per Phase 2.

### D4 — Environment validation con Zod, tutti i campi opzionali in Phase 0

**Decisione:** `src/lib/config/env.ts` valida `process.env` con uno schema
Zod centralizzato. In Phase 0 tutti i campi sono `optional()`.

**Motivazione:** nessuna feature che dipende da queste variabili
(DB, AI provider, email, PageSpeed, affiliate) è ancora implementata;
rendere i campi obbligatori ora avrebbe bloccato build/dev senza motivo.
Lo schema andrà reso più stringente (campi required) via via che le
feature vengono collegate nelle fasi successive — da tracciare in questo
stesso documento quando accade.

### D5 — Branch di lavoro: nessun push diretto su `main`

**Decisione:** durante Phase 0 tutto il lavoro resta sul branch
`claude/sitecheck-ai-setup-xfrrbo`. Non è stato creato/forzato un branch
`main` separato.

**Motivazione:** `AI/MASTER_SPEC.md` §47 suggerisce di "stabilire `main`
come branch primario durevole se praticabile", ma la policy operativa di
questa sessione vieta di pushare su branch diversi da quello designato
senza autorizzazione esplicita. La promozione a `main` avverrà tramite
merge/PR quando l'owner lo deciderà.

### D6 — Test runner: Vitest (bump a 4.1.11 per fix di sicurezza)

**Decisione:** Vitest è stato aggiunto come test runner. La versione è
pinnata a `^4.1.11` invece di `^3`.

**Motivazione:** `vitest@3.2.7` (installato inizialmente da
`create-next-app`-style setup) dipendeva da una versione vulnerabile di
`@vitest/mocker` (GHSA-82fw-gwwq-j7x9, path traversal / lettura file
arbitraria nel mock loader). La versione 4.1.11 include il fix. Essendo
Phase 0 e con una sola test suite di sanity check, l'aggiornamento a
Vitest 4 non ha comportato breaking change rilevanti.

**Nota tecnica:** l'installazione della nuova versione ha richiesto il
flag `--legacy-peer-deps` per generare il lockfile iniziale (bug noto di
npm 10.9.7 nella risoluzione di peer dependency opzionali di Vitest 4).
Una volta generato il lockfile, `npm install` standard funziona
correttamente per le installazioni successive.

### D7 — Prettier esclude `AI/`

**Decisione:** `.prettierignore` esclude la cartella `AI/`.

**Motivazione:** i documenti di protocollo condiviso (in particolare
`AI/MASTER_SPEC.md`, prodotto da ChatGPT) non devono essere riformattati
automaticamente da Claude Code: si eviterebbe rumore nei diff su contenuti
che non sono codice.

### D8 — Fetch SSRF-safe con pinning DNS via undici, non `fetch` globale

**Decisione:** il fetcher dell'audit (`src/lib/security/safeFetch.ts`) usa
`undici` con un `Agent` e un `connect.lookup` personalizzato che pinna la
connessione TCP all'indirizzo IP già validato dal guard SSRF, invece di
affidarsi al `fetch` globale di Node con una singola validazione DNS
preliminare.

**Motivazione:** una validazione DNS seguita da una `fetch` che risolve di
nuovo il nome a dominio internamente lascia una finestra di DNS rebinding
(l'attaccante fa risolvere l'hostname a un indirizzo pubblico durante la
validazione e a un indirizzo privato durante la connessione reale). Il
pinning a livello di socket chiude questa finestra. Il redirect è gestito
manualmente (`redirect: "manual"`) proprio per poter rivalidare ogni hop
col guard SSRF prima di seguirlo, invece di lasciare che sia il client
HTTP a seguirlo automaticamente.

### D9 — Persistenza mock su `globalThis`, non un modulo-singleton semplice

**Decisione:** `src/lib/db/memoryAuditStore.ts` aggancia la `Map` in
memoria a `globalThis` invece di usare una semplice variabile a livello di
modulo.

**Motivazione:** verificato empiricamente in Phase 1 — Next.js (Turbopack,
sia in dev che in build) compila i route handler (`/api/audit`) e le
pagine (`/audit/[id]`) come grafi di moduli separati. Un `Map`
module-scoped risultava duplicato fra i due, causando `404` sistematici
sulla pagina risultati subito dopo un audit riuscito. `globalThis` è
l'unico riferimento realmente condiviso nell'intero processo Node.

### D10 — Categoria `forms` esclusa dal punteggio (peso 0)

**Decisione:** i check del detector `forms` (§7.6 di `AI/MASTER_SPEC.md`)
hanno tutti peso 0 e non contribuiscono al Site Score; sono mostrati nei
risultati solo a fini informativi.

**Motivazione:** il modello di scoring in `AI/MASTER_SPEC.md` §8 elenca
esplicitamente sei categorie pesate (Technical, SEO, Privacy, Cookie &
Consent, Tracking, Performance) che sommano al 100%; "forms" non compare.
Includerlo nel punteggio avrebbe richiesto inventare un peso non
specificato nella spec.

### D11 — Rate limiting per IP aggiunto in Phase 1 (non solo Phase successive)

**Decisione:** `POST /api/audit` applica un rate limit in-memory per IP
(10 richieste/minuto) fin da Phase 1.

**Motivazione:** l'endpoint fa una richiesta HTTP server-side per conto di
utenti anonimi verso URL arbitrari fornite dall'utente. Anche con il guard
SSRF, si tratta di una superficie di abuso reale (uso improprio del
server come proxy di richieste, esaurimento risorse) fin dal momento in
cui l'endpoint viene esposto pubblicamente — non un'ipotesi futura. Il
rate limiter è deliberatamente minimale (in-memory, non condiviso fra
istanze) e potrà evolvere se necessario, coerentemente con
`AI/MASTER_SPEC.md` §27.

### D12 — Verifica end-to-end Phase 1 contro `pypi.org`, non un dominio arbitrario

**Decisione:** il criterio di successo di Phase 1 ("un URL pubblico reale
produce un Site Score deterministico significativo") è stato verificato
end-to-end contro `https://pypi.org` invece di un sito scelto a caso.

**Motivazione:** l'ambiente sandbox di questa sessione di sviluppo
instrada l'uscita HTTPS attraverso un proxy con allowlist ristretta
(registry pacchetti, GitHub, API Anthropic) — un vincolo della sessione
Claude Code, non del prodotto. `pypi.org` è nell'allowlist e serve HTML
reale, quindi è stato usato come sostituto valido di un "sito pubblico
reale" per la verifica. Risultato: Site Score 72/100, banda "Buono",
breakdown per categoria coerente. Su un hosting di produzione normale
(senza egress proxy ristretto) l'audit funziona contro qualunque URL
pubblico che superi la validazione SSRF — nessuna modifica al codice è
necessaria.

### D13 — Persistenza Supabase con fallback automatico in-memory

**Decisione:** i repository in `src/lib/db/` (`auditsRepository.ts`,
`leadsRepository.ts`, `affiliateRepository.ts`) usano Supabase quando
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono configurate, altrimenti
ricadono trasparentemente sugli store in-memory di Phase 1/2. Se una
scrittura su Supabase fallisce a runtime, l'errore viene loggato e il
dato viene comunque salvato in-memory invece di far fallire la richiesta.

**Motivazione:** coerenza con la decisione D4 (Phase 0) — build, test e
`next dev` devono funzionare senza credenziali reali. Non avendo accesso
a un progetto Supabase live in questa sessione di sviluppo, il fallback è
anche l'unico modo per verificare end-to-end il comportamento
dell'applicazione in questa fase (vedi anche D12). L'owner può attivare
Supabase in qualunque momento impostando le due env var, senza modifiche
al codice.

### D14 — `audit_checks` come tabella separata, non solo JSONB su `audits`

**Decisione:** oltre alla tabella `audits` (colonne strutturate + non
JSONB per i campi tabellari), ogni check viene salvato come riga propria
in `audit_checks`.

**Motivazione:** `AI/MASTER_SPEC.md` §10 la definisce esplicitamente come
tabella a sé. È anche l'unico modo pratico di fare aggregazioni SQL dirette
per l'admin dashboard ("problemi più rilevati", "tecnologie più rilevate")
e, in futuro, per il content engine (§15–§19) che deve poter interrogare
"quanti siti hanno il check X in stato fail" senza deserializzare JSON.

### D15 — Admin: gate a password singola con cookie firmato, non Supabase Auth

**Decisione:** l'accesso a `/admin` è protetto da una password singola
(env var `ADMIN_PASSWORD`) con sessione in un cookie HttpOnly firmato via
HMAC-SHA256 (`src/lib/security/adminAuth.ts`), non da Supabase Auth.

**Motivazione:** `AI/MASTER_SPEC.md` §13 dice "Use Supabase Auth **if**
Supabase is adopted" — una raccomandazione condizionale, non un obbligo.
Supabase Auth richiederebbe un progetto Supabase live per essere
verificato (flusso email/password o magic link), non disponibile in
questa sessione di sviluppo. Un gate a password singola con cookie
firmato è: sufficiente per un solo utente admin (esplicitamente permesso
dalla spec), a costo zero, verificabile interamente senza servizi esterni,
e sostituibile con Supabase Auth in una fase futura senza cambiare la
superficie della dashboard. La firma usa confronto a tempo costante
(`timingSafeEqual`) per evitare timing attack sulla verifica.

### D16 — Convenzione `proxy.ts`, non `middleware.ts`

**Decisione:** la protezione di `/admin` è implementata in `src/proxy.ts`
(funzione `proxy`), non `src/middleware.ts`.

**Motivazione:** Next.js 16 deprecare la convenzione `middleware` in
favore di `proxy` (rinominata per chiarire che non è middleware in stile
Express — vedi la nota nella doc ufficiale bundled in
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
Usare la convenzione deprecata avrebbe lasciato un warning di build
permanente in un progetto che punta a restare production-ready. Nota
tecnica: Proxy esegue di default su runtime Node.js e non accetta più
l'opzione `config.runtime` (genera errore se impostata), a differenza del
vecchio middleware che richiedeva `runtime: "nodejs"` esplicito per
uscire dall'Edge runtime.

### D17 — Bug trovato in Phase 2: il matcher del proxy non copriva `/admin` nudo

**Cosa è successo:** il matcher iniziale `["/admin/((?!login).*)"]`
richiede uno slash e almeno un carattere dopo `/admin`, quindi non
matcha mai il percorso `/admin` da solo — solo `/admin/qualcosa`. La
dashboard vive esattamente su `/admin`, quindi il proxy non veniva mai
invocato per essa: la pagina era raggiungibile senza autenticazione.

**Come è stato trovato:** verifica end-to-end manuale (`curl` senza
cookie di sessione contro `/admin`), non dalla sola lettura del codice —
promemoria del perché il testing end-to-end reale, non solo lint/build/
test automatici, resta necessario prima di dichiarare una feature di
sicurezza completa.

**Fix:** matcher esteso a `["/admin", "/admin/((?!login).*)"]`. Verificato
di nuovo end-to-end: richiesta non autenticata → redirect 307 a
`/admin/login`; richiesta con cookie di sessione valido → 200 con i dati
della dashboard.

### D18 — Provider AI di riferimento: Anthropic (Claude), non generico

**Decisione:** l'unica implementazione concreta di `AIProvider` in Phase 3
è `src/lib/ai/providers/anthropicProvider.ts`, che usa
`@anthropic-ai/sdk` e, di default, il modello `claude-haiku-4-5`.

**Motivazione:** `AI/MASTER_SPEC.md` §9 richiede un layer
provider-agnostico ma non impone un vendor specifico ("use environment
variables for provider, model, API key..."). Anthropic è una scelta
naturale (SiteCheck AI è sviluppato con Claude Code) ed è esplicitamente
economica per il compito: Haiku 4.5 è il modello Claude più economico
attualmente disponibile, coerente con "use a low-cost model for routine
tasks" (§9) e col budget ridotto del progetto. L'interfaccia `AIProvider`
resta comunque generica: aggiungere un secondo provider (es. OpenAI)
significa implementare l'interfaccia e aggiornare `getAIProvider()`,
senza toccare l'orchestratore, i detector o la UI.

### D19 — Validazione centralizzata nell'orchestratore, non solo nel provider

**Cosa è successo:** la prima versione validava l'output AI solo dentro
`anthropicProvider.ts` (che chiama `auditSummarySchema.parse(...)` prima
di ritornare). Scrivendo il test per il percorso "provider configurato ma
fallisce", un caso — un provider che ritorna dati malformati senza averli
validati esso stesso — non veniva intercettato: l'orchestratore si
fidava ciecamente del tipo `AuditSummary` restituito, che TypeScript non
verifica a runtime.

**Fix:** `generateAuditSummary` (`src/features/audit/aiSummary.ts`)
rivalida l'output di *qualunque* provider con `auditSummarySchema` prima
di usarlo, e ricade sul fallback deterministico se la validazione fallisce.
Questo garantisce `AI/MASTER_SPEC.md` §9 ("Validate model output before
storing/displaying it") anche per provider futuri che dimenticassero di
validare autonomamente — difesa in profondità, non uno strato singolo di
cui fidarsi.

**Come è stato trovato:** scrivendo un test che simulava un provider con
output malformato, non dalla sola lettura del codice — stesso pattern di
D17 in Phase 2: il test end-to-end/unitario ha trovato un gap che la
revisione del codice da sola non aveva notato.

### D20 — Una chiamata AI per audit, sincrona, non in background

**Decisione:** `generateAuditSummary` viene chiamata e attesa (`await`)
dentro `POST /api/audit`, subito dopo aver salvato l'audit, prima di
rispondere al client.

**Motivazione:** `AI/MASTER_SPEC.md` §40 ("Cost Control") chiede
esplicitamente "one AI summary call per completed audit" e mette in
guardia contro "expensive background jobs" prematuri. Non esiste ancora
un'infrastruttura di code/job in background nel progetto (e introdurla
solo per questo sarebbe overbuilding in Phase 3); con un modello Haiku la
latenza aggiuntiva è contenuta. Se in futuro la latenza percepita
diventasse un problema, la generazione potrà essere spostata
asincronamente senza cambiare l'interfaccia `AIProvider`.

### D21 — Verifica limitata al percorso deterministico; nessuna chiamata reale al provider Anthropic

**Decisione:** il percorso "nessun provider configurato → fallback
deterministico" è stato verificato end-to-end contro `pypi.org` (Site
Score 72/100, summary e priorità generate correttamente e mostrate in
UI). Il percorso "provider Anthropic reale" è stato verificato solo per
lettura del codice e con test unitari che mockano `AIProvider`, non con
una chiamata reale all'API Anthropic.

**Motivazione:** questa sessione di sviluppo non dispone di una
`ANTHROPIC_API_KEY` di prodotto da usare per SiteCheck AI — solo delle
credenziali interne della sessione Claude Code stessa, che non è
appropriato riutilizzare per il traffico applicativo dell'owner. Stesso
principio di trasparenza di D12 (Phase 1) e D13 (Phase 2): il gap è
dichiarato qui invece di essere presentato come verificato. Prima del
primo deploy con `AI_PROVIDER=anthropic` attivo, va eseguito almeno un
audit reale con la chiave impostata e verificato che il summary generato
sia sensato e che `provider`/`model` in `audit_summaries` riportino
`"anthropic"` / `"claude-haiku-4-5"` (o il modello configurato).

### D22 — Eventi lifecycle audit/lead/affiliato loggati server-side, non client-side

**Decisione:** `audit_started`, `audit_completed`, `audit_failed`,
`email_submitted` e `affiliate_clicked` vengono emessi dentro i rispettivi
route handler (`POST /api/audit`, `POST /api/leads`, `GET /go/[partner]`),
non da codice client eseguito nel browser. Solo `landing_view` e
`results_viewed` — puri eventi di visualizzazione pagina, senza un hook
server naturale — sono client-side (`TrackPageView.tsx`).

**Motivazione:** un evento client-side dipende dal fatto che il browser
esegua quel JavaScript fino in fondo (l'utente potrebbe chiudere la tab,
perdere la connessione, avere JS bloccato); un evento loggato dentro il
route handler che già gestisce quell'azione è garantito nella stessa
misura in cui l'azione stessa riesce. In più, solo il server conosce con
certezza l'esito reale (`audit_completed` vs `audit_failed` dipende dal
risultato di `runAudit`, non da cosa il client *pensa* sia successo).

### D23 — `affiliate_clicked` è un evento distinto da `affiliate_clicks`, non una duplicazione

**Decisione:** il click su un link affiliato produce sia una riga in
`affiliate_clicks` (tabella di dominio, Phase 2, con `destination`,
`detected_issue`, UTM propri) sia un evento `affiliate_clicked` in
`analytics_events` (Phase 4, con solo `session_id` e `audit_id`).

**Motivazione:** `AI/MASTER_SPEC.md` elenca esplicitamente entrambi come
requisiti separati — `affiliate_clicks` in §10 (Phase 2, per il tracking
di dettaglio del singolo click e le metriche CTR già in dashboard),
`affiliate_clicked` in §14 (Phase 4, per il funnel per-sessione che
attraversa `landing_view → ... → affiliate_clicked`). Le due tabelle
rispondono a domande diverse: "quanti click e verso quale destinazione"
vs. "quale frazione delle sessioni che hanno visto i risultati arriva a
cliccare". Unificarle avrebbe richiesto forzare lo schema di una delle
due a fare il lavoro dell'altra.

### D24 — Session id anonimo in `localStorage`, mai un cookie, mai collegato a un utente

**Decisione:** l'id di sessione usato per il funnel
(`src/lib/analytics/client.ts`, `getSessionId()`) è generato con
`crypto.randomUUID()` e salvato in `localStorage`, non in un cookie, e
non viene mai associato a un'identità reale a meno che il visitatore
invii esplicitamente la propria email tramite il form di cattura lead
(a quel punto `leads.email` e l'evento `email_submitted` condividono lo
stesso `audit_id`, ma non lo stesso record — restano tabelle separate).

**Motivazione:** è il minimo necessario per collegare gli eventi di una
stessa visita (`AI/MASTER_SPEC.md` §28, "store the minimum necessary
data"), senza introdurre un sistema di tracciamento cross-site o
persistente oltre il browser del visitatore. Un cookie avrebbe richiesto
di considerare banner di consenso propri per un prodotto che, per primo,
audita la gestione dei cookie altrui — un rischio reputazionale/legale
evitabile scegliendo `localStorage` (che non viaggia nelle richieste HTTP
e non richiede consenso per finalità strettamente tecniche di sessione).

### D25 — Verifica end-to-end con Playwright non aggiunto come dipendenza del progetto

**Decisione:** il funnel completo (landing → audit → risultati → email →
click affiliato → dashboard admin) è stato verificato con un browser
Chromium reale via Playwright, installato temporaneamente in una
directory scratch di questa sessione ed eliminato al termine — non
aggiunto a `package.json`.

**Motivazione:** questo repository non ha ancora una suite di test e2e
(solo unit test Vitest); aggiungere Playwright come dipendenza permanente
solo per una verifica manuale una tantum sarebbe stato prematuro
("evitare astrazioni premature"). Se in futuro si vuole test e2e
ricorrenti nella CI, va valutato come task a sé, non come effetto
collaterale di questa verifica. Il browser Chromium usato era già
pre-installato nell'ambiente di sviluppo di questa sessione (non
scaricato per l'occasione).

### D26 — Phase 5 avviata subito, non rimandata fino a n≥30 audit reali

**Decisione:** l'infrastruttura del content engine (schema, calcolo
insight, libreria evergreen, scheduler settimanale, endpoint di
generazione, coda admin) è stata costruita in questa sessione, pur non
esistendo ancora traffico di produzione reale.

**Motivazione:** `AI/MASTER_SPEC.md` §15 dice "Start only after real
audit data exists" riferendosi alla *pubblicazione di contenuti basati su
dati*, non alla costruzione del codice che li produrrà. Lo stesso §15
descrive esplicitamente cosa fare prima della soglia: "Before the
threshold is reached, publish evergreen educational content" — cioè
prevede un funzionamento valido anche a zero audit reali. Costruire ora
l'infrastruttura (che si autolimita correttamente: `computeCookieConsentInsight`
ritorna `null` sotto n=30, mai un numero inventato) significa che è già
pronta a passare automaticamente alla modalità data-driven non appena il
prodotto avrà traffico reale, senza richiedere una fase di sviluppo
successiva dedicata.

### D27 — Metricool riconosciuto come integrazione esistente, non ri-implementato via HTTP

**Decisione:** `src/lib/social/` definisce l'interfaccia `SocialPublisher`
richiesta da `AI/MASTER_SPEC.md` §17, ma l'unica implementazione fornita
(`queuePublisher.ts`) non chiama nessuna API esterna — si limita a
lasciare il post in stato `"queued"`.

**Motivazione:** §17 istruisce esplicitamente: "Claude Code should first
inspect what integrations or capabilities are actually available in the
current environment before designing a new publisher. Prefer reusing an
existing social publishing setup where practical." In questa sessione
sono disponibili strumenti MCP Metricool (`createScheduledPost` e
altri) e la skill `carosello-freesbe`, che confermano che il setup
esistente dell'owner per la pubblicazione social è Metricool, guidato da
Claude Code stesso in sessioni agent — non un'API che l'applicazione
Next.js chiama server-side con una propria chiave. Scrivere un
`MetricoolPublisher` che fa richieste HTTP dirette avrebbe richiesto
indovinare la forma dell'API REST di Metricool (endpoint, autenticazione,
struttura del payload) senza documentazione confermata in questa sessione
— rischio concreto di un'integrazione silenziosamente sbagliata.
L'interfaccia `SocialPublisher` resta comunque pronta per una futura
implementazione reale (diretta o via Metricool) senza toccare la
pipeline di generazione contenuti.

### D28 — Rendering delle creative in PNG rimandato

**Decisione:** i post generati non hanno un'immagine renderizzata
(`content_posts.image_url` resta `null`); `AI/MASTER_SPEC.md` §18
(template HTML/CSS → PNG 1080×1350 via Playwright/Puppeteer/Satori/Sharp)
non è stato implementato in questa fase.

**Motivazione:** nessuna delle librerie di rendering proposte da §18 è
già una dipendenza del progetto, e aggiungerne una (tutte relativamente
pesanti) sarebbe prematuro quando non esiste ancora contenuto reale da
pubblicare che la richieda — lo stesso principio "evitare astrazioni
premature" applicato in D25. Quando la pubblicazione reale via Metricool
diventerà un passo effettivo (non solo la coda), la scelta della libreria
di rendering andrà fatta con il vincolo concreto della piattaforma di
hosting finale, non ipotizzata ora.

### D29 — Verifica: soglia n≥30 confermata sia da test unitari sia da un ciclo end-to-end con 30 audit reali

**Decisione:** oltre ai test unitari su `computeCookieConsentInsight`
(sotto soglia → `null`, sopra soglia → valore corretto), è stato eseguito
un ciclo end-to-end reale: generazione di contenuto forzato a
`data_insight` con meno di 30 audit nello store (→ evergreen), poi invio
di 30 audit reali contro `pypi.org` attraverso l'endpoint pubblico
`/api/audit`, poi nuova generazione dello stesso tipo (→ basato su
insight reale, verificato nella coda `/admin/content`).

**Nota tecnica:** il primo tentativo di inviare 30 audit in parallelo è
stato bloccato dal rate limiter per-IP di `/api/audit` (10 richieste/
minuto, Phase 1) — comportamento corretto, non un bug — ed è stato
necessario invece scaglionare le richieste rispettando il limite. Questo
conferma indirettamente che il rate limiting introdotto in Phase 1
funziona come progettato anche sotto carico concentrato.
