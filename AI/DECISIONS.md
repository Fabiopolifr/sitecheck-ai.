# Decisions — SiteCheck AI

## Scopo del documento

Questo documento registra le decisioni architetturali e di prodotto già
prese durante lo sviluppo di SiteCheck AI, con relative motivazioni.

## Stato

Phase 5 — Content Engine completata (infrastruttura). Persistenza
migrata da Supabase a PostgreSQL self-hosted (D30).

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

### D3 — Database: PostgreSQL via Supabase (decisione preliminare, superata da D30)

**Decisione:** per la persistenza (Phase 2) si userà PostgreSQL, con
Supabase come provider preferito (DB gestito + Auth + free tier).

**Motivazione:** indicazione esplicita in `AI/MASTER_SPEC.md` §10, budget
iniziale ridotto (~€100), necessità di Auth semplice per l'admin (§13) e
riduzione del tempo di sviluppo. L'accesso al DB sarà comunque isolato in
`src/lib/db/` per mantenere portabilità verso un Postgres self-hosted se
necessario in futuro.

**Nota:** nessuna integrazione Supabase è stata implementata in Phase 0.
Questa è una decisione di indirizzo per Phase 2. **Superata da D30**:
l'owner ha scelto di ospitare app e database entrambi su un VPS Hostinger
invece di Supabase; l'isolamento in `src/lib/db/` previsto qui è esattamente
ciò che ha reso possibile il passaggio senza toccare il resto del codice.

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

### D13 — Persistenza con fallback automatico in-memory (Supabase inizialmente, poi PostgreSQL self-hosted — vedi D30)

**Decisione:** i repository in `src/lib/db/` usano il database quando
configurato, altrimenti ricadono trasparentemente sugli store in-memory
di Phase 1/2. Se una scrittura sul database fallisce a runtime, l'errore
viene loggato e il dato viene comunque salvato in-memory invece di far
fallire la richiesta.

**Motivazione:** coerenza con la decisione D4 (Phase 0) — build, test e
`next dev` devono funzionare senza credenziali reali. Non avendo accesso
a un database live in questa sessione di sviluppo, il fallback è anche
l'unico modo per verificare end-to-end il comportamento
dell'applicazione in questa fase (vedi anche D12). L'owner può attivare
la persistenza reale in qualunque momento impostando `DATABASE_URL`,
senza modifiche al codice.

**Nota:** originariamente il gate era `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` (client `@supabase/supabase-js`); dopo D30 il
gate è `DATABASE_URL` (client `pg` generico). Il comportamento di
fallback descritto qui non è cambiato, solo il backend concreto.

### D14 — `audit_checks` come tabella separata, non solo JSONB su `audits`

**Decisione:** oltre alla tabella `audits` (colonne strutturate + non
JSONB per i campi tabellari), ogni check viene salvato come riga propria
in `audit_checks`.

**Motivazione:** `AI/MASTER_SPEC.md` §10 la definisce esplicitamente come
tabella a sé. È anche l'unico modo pratico di fare aggregazioni SQL dirette
per l'admin dashboard ("problemi più rilevati", "tecnologie più rilevate")
e, in futuro, per il content engine (§15–§19) che deve poter interrogare
"quanti siti hanno il check X in stato fail" senza deserializzare JSON.

### D15 — Admin: gate a password singola con cookie firmato, non un provider Auth gestito

**Decisione:** l'accesso a `/admin` è protetto da una password singola
(env var `ADMIN_PASSWORD`) con sessione in un cookie HttpOnly firmato via
HMAC-SHA256 (`src/lib/security/adminAuth.ts`), non da un servizio Auth
gestito come Supabase Auth.

**Motivazione:** `AI/MASTER_SPEC.md` §13 dice "Use Supabase Auth **if**
Supabase is adopted" — una raccomandazione condizionale, non un obbligo,
e comunque superata da D30 (Supabase non più adottato). Un servizio Auth
gestito richiederebbe comunque un progetto live per essere verificato
(flusso email/password o magic link), non disponibile in questa sessione
di sviluppo. Un gate a password singola con cookie firmato è: sufficiente
per un solo utente admin (esplicitamente permesso dalla spec), a costo
zero, verificabile interamente senza servizi esterni, e coerente con
l'infrastruttura self-hosted scelta in D30 (nessuna dipendenza Auth
esterna da configurare sul VPS). La firma usa confronto a tempo costante
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

### D30 — Migrazione da Supabase a PostgreSQL self-hosted (VPS Hostinger)

**Decisione:** l'intero layer di persistenza è stato riscritto da
`@supabase/supabase-js` a `pg` (node-postgres) generico, parlando SQL
puro contro qualunque istanza PostgreSQL raggiungibile. `.env.example`,
`README.md` e `DEPLOYMENT.md` sono stati aggiornati di conseguenza, e la
cartella `supabase/migrations/` è stata rinominata `migrations/` (SQL
standard, nessuna sintassi specifica di Supabase al suo interno, quindi
nessuna riscrittura del contenuto necessaria oltre a un commento che
citava la service role key).

**Motivazione:** richiesta esplicita dell'owner: ospitare sia l'app sia
il database interamente su un VPS Hostinger invece di usare Supabase come
servizio gestito esterno, per restare su infrastruttura a costo minimo e
sotto controllo diretto (coerente con `CLAUDE.md`: "preferire servizi
free-tier e infrastruttura a costo minimo"). Hostinger non offre Supabase
come servizio; un VPS supporta però un Postgres self-managed collegato
all'app tramite una normale connection string.

**Cosa è cambiato concretamente:**
- `src/lib/db/supabaseClient.ts` eliminato, sostituito da
  `src/lib/db/pgClient.ts` (pool `pg`, `isDatabaseConfigured()` basato su
  `DATABASE_URL`, SSL abilitato solo se la connection string contiene
  esplicitamente `sslmode=require` — un Postgres self-managed sullo
  stesso VPS tipicamente non ha un listener TLS).
- Tutti e sei i repository (`auditsRepository.ts`, `leadsRepository.ts`,
  `affiliateRepository.ts`, `summariesRepository.ts`,
  `eventsRepository.ts`, `contentRepository.ts`) riscritti con SQL
  parametrizzato via `pool.query()`/transazioni esplicite (`saveAudit`
  usa `BEGIN`/`COMMIT`/`ROLLBACK` su un singolo client per l'inserimento
  atomico di `audits` + `audit_checks`), stesso pattern di fallback su
  store in-memory in caso di errore o database non configurato.
- `src/lib/config/env.ts`: rimossi `SUPABASE_URL`/`SUPABASE_ANON_KEY`/
  `SUPABASE_SERVICE_ROLE_KEY`; `DATABASE_URL` validato con
  `z.string().min(1)` invece di `.url()` (una connection string Postgres
  può contenere caratteri che lo schema `.url()` di Zod rifiuterebbe; la
  validazione reale avviene comunque alla connessione da parte di `pg`).
- `package.json`: rimossa `@supabase/supabase-js`, aggiunte `pg` +
  `@types/pg`.
- Nuova sezione `DEPLOYMENT.md` con guida passo-passo VPS Hostinger:
  provisioning, Node.js 20, installazione/config PostgreSQL (bind solo su
  `localhost`, mai esposto pubblicamente), esecuzione migration via
  `psql`, PM2 come process manager, Nginx come reverse proxy, SSL via
  Certbot, firewall (`ufw`), backup del database (`pg_dump` pianificato —
  responsabilità che prima Supabase copriva automaticamente e ora ricade
  sull'operatore del VPS).

**Nota tecnica su un gotcha di node-postgres:** le colonne `numeric` di
Postgres (usate per `confidence`/`weight` in `audit_checks`) vengono
ritornate come stringhe JS da `pg` per default (per non perdere
precisione); le query `SELECT` che le leggono usano un cast esplicito
`::float8`. Le colonne `jsonb` vengono invece già deserializzate
automaticamente in lettura, ma richiedono `JSON.stringify()` esplicito
quando passate come parametro in un `INSERT`/`UPDATE` — `pg` non serializza
automaticamente gli oggetti JS lato client come farebbe un client
Supabase più opinionato.

**Cosa NON è stato verificato end-to-end in questa sessione:** non è
disponibile un server PostgreSQL live in questo ambiente sandbox (stesso
limite già dichiarato per Supabase in D13/D21) — solo il percorso di
fallback in-memory è stato verificato con l'app reale (build, lint, test,
avvio dev server). Il percorso `DATABASE_URL` configurato è stato
verificato per lettura del codice e tramite i type-check/test unitari
esistenti, non con una connessione reale a un Postgres. Prima del primo
deploy su Hostinger, va eseguito almeno un audit reale con `DATABASE_URL`
impostato e verificato che la riga compaia in `audits`/`audit_checks` via
`psql`, seguendo la checklist di `DEPLOYMENT.md`.

### D31 — Esperimento A/B "gate email" sul dettaglio per categoria

**Decisione:** la pagina risultati (`src/app/audit/[id]/page.tsx`) applica
uno split 50/50 deterministico (`src/features/audit/abTest.ts`,
`isGatedVariant`, hash stabile dell'`audit.id`): metà delle analisi
mostrano subito il dettaglio completo per categoria (variante "open",
comportamento precedente), l'altra metà lo nasconde dietro un form email
(`GatedContent` + `EmailCaptureForm`, variante "gated") che lo sblocca
lato client non appena l'invio va a buon fine, senza reload di pagina.
Punteggio, banda, riassunto AI e priorità principali restano **sempre**
visibili in entrambe le varianti — non si nasconde il valore centrale del
prodotto, solo l'approfondimento per categoria.

**Motivazione:** richiesta esplicita dell'owner di testare se un gate
sull'analisi approfondita aumenta la cattura email rispetto al form
opzionale già presente. Split deterministico per `audit.id` (non un
cookie) per restare coerenti con D24 (niente cookie extra per il
visitatore). Ogni `results_viewed` porta ora `metadata.abVariant`
("gated"/"open") e ogni `email_submitted` porta `metadata.source`
("default"/"gate"), entrambi già supportati dallo schema esistente
(`metadata: z.record(...)` in `trackEventSchema`, nessuna modifica allo
schema DB) — permette di confrontare il tasso di conversione delle due
varianti direttamente dalla tabella `analytics_events` (via Neon SQL
Editor) senza dashboard dedicata, che non è stata costruita in questa
fase per restare scoped.

**Nota tecnica su invio email:** `POST /api/leads` ora verifica
esplicitamente l'esito di `emailProvider.send(...)` e logga un
`console.error` se fallisce (prima l'errore veniva scartato in
silenzio). Il lead viene comunque sempre salvato anche se l'invio fallisce
— un errore del provider email non deve far perdere il lead. L'invio
reale via Resend richiede `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`,
`EMAIL_FROM` configurate; senza, `mockEmailProvider` logga soltanto il
messaggio in console (comportamento invariato, vedi D_originale su
persistenza con fallback).

### D32 — CookieYes conversion engine: copy dinamica, cookieConsentScore, servizio assistito €99

**Decisione:** su specifica dettagliata dell'owner (18 sezioni), il
motore di raccomandazione CookieYes (`src/features/affiliate/
cookieyesRecommendation.ts`, D27/D31) è stato esteso con:

- **Copy dinamica specifica**: titolo e descrizione ora citano i nomi
  reali dei tracker rilevati (es. "Meta Pixel rilevato", "Il sito
  utilizza GA4, Meta Pixel e Google Tag Manager") invece di un testo
  generico, riusando il campo `evidence` già scritto dal detector invece
  di duplicare una seconda mappa di etichette.
- **`cookieConsentScore`** esposto nel risultato (score della categoria
  `cookie_consent`, già calcolato da `scoring.ts` — nessuna nuova
  logica di punteggio) e **`relevanceScore`** (il punteggio interno di
  pertinenza commerciale, 0-100+, usato solo per calcolare `priority` e
  mai per influenzare il Site Score).
- **CTA secondaria "Configurazione assistita — €99 una tantum"**
  (`showSupportCta`/`supportCtaCopy`), mostrata quando
  `cookieConsentScore <= 60` o quando sono stati rilevati 2+ tracker;
  copy diversa in base alla complessità (numero di tracker rilevati).
- **`/support/cookieyes-setup`**: pagina con cosa include, come
  funziona, tempi, FAQ, e un form di richiesta che riusa
  `EmailCaptureForm` con `source="cookieyes_setup"` — nessun componente
  nuovo per la cattura lead, solo un nuovo `source` sul meccanismo già
  esistente.
- **Dashboard admin**: nuova sezione "click per motivo di
  raccomandazione" (`computeCookieYesFunnelMetrics`, raggruppa
  `affiliate_clicked` per `metadata.reasonCode` già registrato) e conteggio
  delle richieste di setup — risponde direttamente all'obiettivo
  dell'owner "capire quale finding genera più revenue" senza nuove
  tabelle né nuovi tipi di evento.

**Cosa è stato deliberatamente NON implementato, e perché:**

- **Nessuna raccolta pagamenti reale (Stripe).** La spec dell'owner
  descrive esplicitamente l'MVP come "richiesta di interesse" (contact
  form/email), con Stripe come passo futuro esplicitamente rimandato
  ("architecture so Stripe checkout can be added later"). Il form di
  `/support/cookieyes-setup` salva quindi solo un lead e — se
  `SUPPORT_NOTIFICATION_EMAIL` è configurata — invia una notifica interna
  a Freesbe; il follow-up (contatto, pagamento, esecuzione del lavoro)
  resta un processo umano, non automatizzato. **Va impostata
  `SUPPORT_NOTIFICATION_EMAIL` su Hostinger perché le richieste arrivino
  davvero a qualcuno**, altrimenti restano visibili solo come lead nel
  database/admin.
- **Nessun rilevamento CMS/WordPress né "complexity score" strutturale.**
  La spec li cita come criteri per la CTA di supporto (§10); non esiste
  nel codebase alcun detector CMS. Costruirne uno è un lavoro a sé
  (richiede pattern-matching su generator meta tag, percorsi tipici
  WP/Shopify/Wix, ecc.) — l'eleggibilità della CTA di supporto usa quindi
  solo `cookieConsentScore` e numero di tracker rilevati, un sottoinsieme
  ragionevole ma non completo dei criteri elencati.
- **Nessun nuovo tipo di evento analytics** (`cookieyes_recommendation_view`,
  `cookieyes_support_view`, ecc. dalla sezione 14 della spec). La tabella
  `analytics_events` ha un vincolo CHECK sul nome evento (migrazione
  0003) che richiederebbe un'ALTER TABLE per estendere l'elenco; si è
  preferito riusare gli eventi/metadata già esistenti
  (`affiliate_clicked.metadata.reasonCode`,
  `email_submitted.metadata.source`), che coprono comunque l'obiettivo
  di business dichiarato (capire quali finding convertono), a costo di
  una granularità leggermente minore (non si distingue "vista card" da
  "click", solo il click).
- **Nessuna riscrittura dei toni per fascia di Site Score** (§2 della
  spec: messaggi OTTIMO/BUONO/DA MIGLIORARE/PRIORITÀ ALTA con subcopy
  dedicata). La pagina risultati mostra già banda e colore semantico
  (D30/gauge); aggiungere anche il subcopy testuale per fascia è
  rimandato a un secondo giro per restare nello scope di una singola
  sessione già ampia — non è un problema tecnico, solo una scelta di
  sequenziamento.

**Verifica:** 76 test totali (10 nuovi su
`tests/cookieyesRecommendation.test.ts`: specificità della copy,
esposizione di `cookieConsentScore`/`relevanceScore`, eleggibilità della
CTA di supporto), build/lint verdi, verifica end-to-end reale (pagina di
supporto raggiungibile con parametri `audit_id`/`reason`, card di
raccomandazione con area €99 visibile su un audit reale contro
`pypi.org`).

### D33 — Checkbox di cattura lead "Vuoi che configuriamo CookieYes per te?" sul form report

**Decisione:** su ulteriore specifica dell'owner ("COOKIEYES ASSISTED
SETUP — LEAD CAPTURE"), il form di cattura email principale
(`EmailCaptureForm`, mostrato sulla pagina risultati per la variante
"open" dell'esperimento D31) espone ora un riquadro opzionale — non un
form separato — con una checkbox "Vuoi che configuriamo CookieYes per
te?" (copy dinamica, vedi sotto) e, se selezionata, un campo telefono
facoltativo.

- **`resolveSupportBoxCopy({cookieConsentScore, trackerCount,
  cmpVendor})`** (nuova funzione esportata in
  `cookieyesRecommendation.ts`) sceglie il titolo/corpo/testo checkbox in
  ordine di priorità: CookieYes già rilevato → 3+ tracker rilevati →
  `cookieConsentScore < 50` (tono ad alta enfasi, "priorità") →
  `cookieConsentScore >= 80` (tono a bassa enfasi, "verifica della
  configurazione") → copy di default MVP quando lo score non è
  disponibile. Ogni variante dichiara esplicitamente il costo (€99 una
  tantum) e — riquadro aggiunto in coda a ciascuna, sotto la checkbox —
  chiarisce che l'eventuale abbonamento CookieYes stesso resta a parte,
  sul suo account, esattamente come richiesto esplicitamente
  dall'owner ("fai capire che cookie yes se lo fanno loro ed è a parte
  il costo"). La stessa distinzione era già nella FAQ di
  `/support/cookieyes-setup` (D32); qui viene resa visibile anche nel
  punto in cui l'utente spunta la checkbox, non solo sulla pagina
  dedicata.
- **Schema `leads` esteso** (`migrations/0005_cookieyes_support.sql`):
  `support_requested boolean`, `support_phone text`, `support_reason
  text` (il `reasonCode` della raccomandazione al momento dell'invio),
  `support_status text` con CHECK (`new`/`contacted`/`qualified`/`won`/
  `lost`, per il follow-up manuale da admin), `support_requested_at
  timestamptz`. **Migrazione non ancora eseguita su Neon** — va lanciata
  prima che le richieste reali arrivino, altrimenti (comportamento di
  fallback già descritto in D13) i lead con questi campi continuano a
  salvarsi correttamente ma solo in memoria, non su Postgres, se
  l'INSERT esteso fallisse per colonne mancanti.
- **Notifica interna**: `POST /api/leads` invia (se
  `SUPPORT_NOTIFICATION_EMAIL` è configurata, stesso meccanismo di D32)
  un'email con Nome/Telefono/Email/URL/Site Score/Cookie Consent
  Score/tracker rilevati/CMP/motivo — tutto ciò che serve per richiamare
  il lead senza riaprire l'audit — sia per il checkbox sul form
  principale sia per il form dedicato `/support/cookieyes-setup`
  (unificati sotto `wantsSupport`, non più solo `isSetupRequest`).
- **Admin**: nuova StatTile "Richieste setup CookieYes" e una tabella
  dedicata (Nome/Email/Telefono/Motivo/Stato/Data) per i lead con
  `supportRequested`, così l'operatore vede le richieste €99 senza dover
  filtrare la lista lead generale.

**Cosa è stato deliberatamente NON implementato, e perché (la seconda
metà della stessa richiesta dell'owner, la libreria "CASE LIBRARY & 
CONVERSION COPY" da 75 varianti di copy):** la maggior parte dei 75 casi
sono permutazioni già coperte dall'interpolazione dinamica esistente
(nomi di tracker reali in titolo/descrizione, già in D32); il resto
richiede segnali che non esistono come detector nel codebase — rilevamento
CMS/WordPress, classificazione per settore, lingua/geolocalizzazione,
tracking comportamentale sui visitatori di ritorno, uno score di
complessità strutturale del sito. Costruire questi detector onestamente
(non con euristiche indovinate) è un lavoro a sé, comunicato esplicitamente
all'owner invece di far finta di coprirlo con copy generica etichettata
come specifica.

**Verifica:** 81 test totali (5 nuovi su `resolveSupportBoxCopy`: priorità
CookieYes-rilevato, priorità 3+ tracker sopra lo score, tono alta/bassa
enfasi per score basso/alto, fallback MVP quando lo score è ignoto),
build/lint verdi.

### D34 — Critical score caps, diagnosi combinata "criticità concentrata", CTA consulenziale Freesbe (Tecnico/SEO)

**Decisione:** su ulteriore specifica dettagliata dell'owner (motore di
scoring per fasce, "critical score cap", diagnosi combinate tra sezioni,
severità/confidence per singolo check, CTA Freesbe per Tecnico/SEO), è
stato costruito il sottoinsieme concretamente implementabile con i
detector reali già esistenti in questa audit **a pagina singola** (vedi
sotto per cosa questo esclude):

- **`src/features/audit/criticalCaps.ts`** (nuovo, `applyCriticalCaps`,
  chiamato in `runAudit.ts` subito dopo `buildCategoryResults` e prima di
  `computeSiteScore`): un piccolo insieme di regole che limita il
  punteggio di una categoria a un tetto massimo quando un singolo
  finding è abbastanza grave, indipendentemente da quanti altri check
  siano passati — esattamente il problema descritto dall'owner ("100
  controlli minori superati non devono compensare una violazione
  grave"). Regole cablate sui check realmente prodotti dai detector
  esistenti: `indexability` fail → SEO max 10; `robots_meta` warning
  (noindex sulla pagina) → Tecnico max 35; `status_code` ≥500 → Tecnico
  max 20; `https` assente → Tecnico max 30; `cmp_detected` fail +
  `consent_before_tracking` fail (nessun CMP con tracker attivi) →
  Cookie & Consent max 10; `cmp_detected` fail da solo → Cookie &
  Consent max 30; `privacy_policy_link` fail → Privacy max 15. Quando più
  regole scattano sulla stessa categoria vince il tetto più basso
  (il finding più grave), mai una media dei tetti. `CategoryResult`
  guadagna un campo opzionale `capApplied` (reasonCode, label, cap,
  punteggio prima del tetto) che `CategoryDetails.tsx` mostra come
  banner esplicito ("Il punteggio di questa sezione è stato limitato a
  X/100 a causa di: ...") — trasparenza sul *perché*, non solo sul
  *quanto*.
- **`src/features/audit/comboDiagnosis.ts`** (nuovo,
  `resolveComboDiagnosis`): individua il caso esatto descritto
  dall'owner — una sola categoria pesata sotto 25 mentre tutte le altre
  sono ≥75 — e restituisce un titolo/testo ("Criticità concentrata in
  Cookie & Consent...") più un badge "1 CRITICITÀ BLOCCANTE" che sulla
  pagina risultati **sostituisce visivamente** il solo pill "Buono"
  accanto al punteggio, invece di lasciarlo come unico segnale. Verificato
  end-to-end contro `pypi.org` (v. sotto).
- **`src/features/affiliate/freesbeRecommendation.ts`** +
  **`src/components/FreesbeRecommendation.tsx`** (nuovi): motore CTA
  consulenziale Freesbe, parallelo a quello CookieYes ma per
  Tecnico/SEO, che implementa **esattamente** le "FREESBE CONSULTING CTA
  RULES" fornite dall'owner: nessuna CTA prominente per punteggio ≥90,
  CTA soft 75-89, CTA standard 50-74, CTA prioritaria <50, CTA sempre
  visibile se è scattato un critical cap su quella categoria (proxy
  ragionevole di "finding HIGH/CRITICAL", essendo l'unico segnale del
  genere già presente nel codice), CTA combinata quando sia Tecnico sia
  SEO sono sotto 75. Link fisso a `https://freesbe.it/contatti`. Renderizzata
  sulla pagina risultati subito sotto la card CookieYes — stessa area,
  ma driver commerciale diverso: Cookie/Privacy → CookieYes/supporto
  assistito, Tecnico/SEO → Freesbe, così ogni CTA punta a chi può
  davvero risolvere quel problema, mai una CTA generica.
- **Checkbox di supporto generalizzata**: la checkbox "Vuoi che
  configuriamo CookieYes per te?" (D33) era finora mostrata solo nella
  variante "open" del gate A/B (D31); ora è passata anche a
  `GatedContent`/`EmailCaptureForm` nella variante "gated", così compare
  ovunque il report mostri i disclaimer sui problemi rilevati, non solo
  in una delle due varianti — richiesta esplicita dell'owner ("quando ci
  sono i disclaimer dei problemi metti sempre il check con la email").
- **UI/UX report**: `CategoryDetails.tsx` mostra ora, per ogni check in
  stato "warning"/"fail", una chip di severità approssimata dal peso del
  check (Alta ≥20, Media 10-19, nessuna sotto 10) — un proxy leggero,
  non un nuovo campo `severity` esplicito sui detector — più il banner
  di trasparenza sul critical cap descritto sopra.

**Cosa è stato deliberatamente NON implementato, e perché (la parte
maggioritaria della spec dell'owner):**

- **Nessuna fascia/punteggio a 5 livelli (90-100/75-89/50-74/25-49/0-24)
  con narrazione testuale dedicata per ogni fascia e ogni categoria.**
  Il sistema esistente usa 4 bande (`scoreBand` in `scoring.ts`, D_originale)
  con soglie diverse (85/70/50); riscriverlo a 5 fasce per 6 categorie
  con copy dedicata per ciascuna combinazione è un lavoro di redazione
  dei contenuti a sé, non solo di codice — il rischio concreto è
  generare 30 blocchi di testo copy-incollati dalla spec senza che siano
  stati verificati contro casi reali.
- **Nessuna crawl multi-pagina.** Questo audit fetcha **una sola pagina**
  (`runAudit.ts`, invariato) — non esiste un crawler del sito. Questo
  esclude direttamente gran parte dei case study "TECNICO"/"SEO"
  dell'owner che presuppongono più pagine: catene di redirect,
  duplicazione di title su 32 pagine, pagine orfane, sitemap con
  redirect, loop di redirect, blocco `robots.txt` su aree del sito (si
  rileva solo il meta robots della singola pagina fetchata, non il file
  `robots.txt`), noindex "sitewide" (si rileva solo sulla pagina
  analizzata). Costruire un crawler è un cambiamento architetturale
  grande (tempo di scansione, costi, rate limiting verso siti terzi) —
  non una spunta di funzionalità.
- **Nessun cap per "duplicate conversion event", "PII nell'URL di
  tracking", "reject choice inefficace", "consent preferences ignorate",
  "wrong controller/company in policy".** Nessuno di questi è oggi un
  check prodotto dai detector: rilevare un evento duplicato richiede
  ispezionare il codice/i tag della pagina in modo molto più profondo di
  un fetch statico dell'HTML; PII nell'URL richiederebbe seguire i link
  interni della pagina; "reject inefficace"/"preferenze ignorate"
  richiedono testing comportamentale del banner (già escluso in D25/D28
  — headless browser non aggiunto come dipendenza); il controller
  corretto nella privacy policy richiederebbe NLP/lettura semantica del
  testo, non pattern matching.
- **Nessun campo `severity`/`confidence` esplicito sui detector.** I
  detector espongono già `confidence` (0-1, usato nello scoring
  ponderato) ma non un campo `severity` dedicato; la spec ne chiede uno
  esplicito per ogni check con un badge "CRITICAL"/severity/confidence
  a tre valori come nell'esempio "Meta Pixel before consent". La chip di
  severità aggiunta in `CategoryDetails.tsx` usa il peso del check come
  proxy ragionevole invece di introdurre un nuovo campo che nessun
  detector popola ancora — evita di inventare un valore che i detector
  non calcolano davvero.
- **CTA Freesbe per finding specifico** (es. "32 pagine con title
  duplicato" → CTA dedicata sotto quel singolo check). Implementata solo
  a livello di categoria (Tecnico/SEO nel loro insieme), non per singolo
  check — di nuovo limitato dall'assenza di crawl multi-pagina per la
  maggior parte degli esempi concreti dell'owner.

**Verifica:** 95 test totali (14 nuovi: `tests/criticalCaps.test.ts`,
`tests/comboDiagnosis.test.ts`, `tests/freesbeRecommendation.test.ts`),
build/lint verdi, verifica end-to-end reale contro `pypi.org` — cap
cookie_consent non applicato perché il punteggio grezzo era già sotto il
tetto (0/100, coerente con "non alzare mai un punteggio già basso"), CTA
Freesbe SEO "Il sito ha margini di crescita SEO" mostrata correttamente
per SEO 85/100, checkbox di supporto presente nella variante gated con
`cookieConsentScore`/`trackerCount`/`cmpVendor` propagati correttamente.

### D35 — Rebrand a "FreeCookieBe": nome prodotto, palette, favicon

**Decisione:** l'owner ha fornito un logo (cookie con scudo/spunta,
navy + arancione) con il nome del brand "FreeCookieBe" e il payoff
"Privacy semplice. Websites più sicuri." Tutte le stringhe utente-facing
che dicevano "SiteCheck AI" sono state rinominate a "FreeCookieBe": header
(`SiteHeader.tsx`), footer, titolo/metadata (`layout.tsx`), dashboard
admin, testo del consenso marketing nel form lead, copy delle email
transazionali (`api/leads/route.ts`), pagine privacy/cookie policy,
pagina `/support/cookieyes-setup`, content engine (`evergreen.ts`,
`generate.ts`), `README.md`.

**Cosa NON è stato rinominato, deliberatamente:** i documenti interni di
processo in `AI/` (`MASTER_SPEC.md`, `ARCHITECTURE.md`, `CURRENT_TASK.md`,
`CHANGELOG_AI.md`, e questo stesso `DECISIONS.md`) restano intestati
"SiteCheck AI" — sono la cronologia di sviluppo e la spec canonica
(D2/D7: `MASTER_SPEC.md` non va riscritto arbitrariamente, è prodotto
dall'owner) e riscriverli avrebbe significato alterare un documento
storico invece di limitarsi a quanto richiesto ("usa questo marchio...
per il sito e la favicon" — il prodotto rivolto agli utenti, non la
documentazione interna del progetto).

**Palette e favicon:**
- `src/app/globals.css`: `--accent`/`--accent-soft` sono stati cambiati
  dall'indigo originale (`#4338ca`) all'arancione del brand (`#c8863f`
  / `#faf0e2`) — riusando le stesse due variabili invece di rinominare
  ogni classe `bg-accent`/`text-accent` nel codebase, così bottoni CTA,
  link, badge e la fascia "buono" del gauge punteggio si ri-tematizzano
  automaticamente. Aggiunto `--brand-navy` (`#10213c`, colore del
  wordmark/logomark) per l'header. Anche i due colori inline hardcoded
  nell'email HTML del report (`api/leads/route.ts`, non passavano dalle
  variabili CSS) sono stati aggiornati allo stesso arancione.
- **Nuovo `LogomarkIcon`** (`src/components/icons.tsx`): un SVG inline
  che approssima il marchio fornito (cookie arancione con chip di
  cioccolato + scudo/spunta navy in basso a destra), semplificato per
  restare leggibile alle dimensioni ridotte di header/favicon. Usato in
  `SiteHeader.tsx` al posto del vecchio badge "S".
- **Favicon rigenerata**: `src/app/favicon.ico` è stata rigenerata da
  zero (header ICO scritto a mano con PNG embedded a 16/32/48px via
  `sharp`, verificato con `file` che il risultato è un `.ico` valido)
  invece di lasciare la vecchia icona indigo. Aggiunto anche
  `src/app/icon.svg` (convenzione Next.js App Router, ha priorità nei
  browser moderni) con lo stesso mark in SVG vettoriale.

**Limite dichiarato — l'immagine del logo fornita dall'owner non è mai
arrivata come file su disco**, solo come contenuto visivo inline nel
messaggio; questa sessione non ha un modo per salvare bytes da
un'immagine incollata in chat. Il logomark implementato qui è quindi
una **ricostruzione approssimata** (colori e composizione lette a
vista dall'immagine, non un'estrazione pixel-perfect del file originale)
— non un uso diretto dell'asset originale. Se l'owner ha il file PNG/SVG
sorgente e vuole il logo esatto (non l'approssimazione), va condiviso
come file (percorso nel repository, o allegato scaricabile) così può
essere usato direttamente al posto di `LogomarkIcon`/`favicon.ico`/
`icon.svg`.

**Verifica:** build/lint/95 test invariati e verdi, verifica end-to-end
reale (`next start` locale): header renderizza "Free**Cookie**be" con
"Cookie" in arancione brand, footer "FreeCookieBe", `/icon.svg` servito
correttamente con i colori `#c8863f`/`#10213c`.

### D36 — Bug di deploy Hostinger trovato: Passenger non riavvia da solo dopo un upload; esperimento gate email messo in pausa

**Cosa è successo:** dopo aver caricato lo ZIP col rebrand, il sito
mostrava ancora la vecchia grafica "SiteCheck AI" con CSS completamente
assente (font di default, icone SVG enormi non vincolate da classi
Tailwind). Diagnosticato passo passo insieme all'owner tramite il file
manager di hPanel (nessun accesso diretto a Hostinger disponibile in
questa sessione — dominio fuori dall'allowlist del proxy egress,
coerente con D12/D21/D30): build corretta su disco
(`hbuilds/.../nodejs/.next/static/css/*.css` conteneva già i colori del
nuovo brand), server Node avviato senza errori fatali (`console.log`:
"Ready in 0ms", solo warning innocui su `COOKIEYES_AFFILIATE_URL` e SSL
mode di `pg`, entrambi già gestiti a runtime). L'hosting usa **Phusion
Passenger** (non un semplice reverse proxy a una porta, vedi
`.htaccess`: `PassengerAppRoot`/`PassengerAppType node`), che tiene un
processo Node già avviato in memoria tra un deploy e l'altro e
**non lo riavvia automaticamente** quando arrivano file nuovi — serve
aggiornare la data di modifica di `hbuilds/current/nodejs/tmp/restart.txt`
perché Passenger lo noti e forzi un riavvio. Il file esisteva già (creato
dal processo di deploy) ma con timestamp vecchio; il vero processo Node
in esecuzione continuava a servire l'HTML della build precedente, che
puntava a nomi di file CSS ormai sovrascritti dalla build nuova → 404.

**Fix (operativo, non di codice):** cancellare e ricreare
`hbuilds/current/nodejs/tmp/restart.txt` (vuoto) dopo ogni upload di un
nuovo ZIP forza Passenger a scartare il processo vecchio e avviarne uno
nuovo che legge i file appena caricati. Verificato end-to-end: dopo il
touch del file, il sito ha iniziato a servire correttamente CSS, header
brandizzato "FreeCookieBe", card CookieYes con CTA di supporto — tutto
il lavoro di questa sessione, non solo il rebrand.

**Questo è un passo mancante nella procedura di deploy che va ripetuto
a ogni upload futuro** — non è stato ancora automatizzato (Hostinger
Cloud Startup non dà accesso SSH per uno script di deploy, solo il
pannello file manager e "Deploy Web App"). Andrebbe aggiunto come
promemoria esplicito ogni volta che si consegna un nuovo ZIP all'owner.

**Esperimento A/B "gate email" (D31) messo in pausa:** una volta risolto
il problema del CSS, l'owner ha notato che il dettaglio per categoria
mancava su un audit reale — non un bug, ma la variante "gated"
dell'esperimento che era capitata su quell'audit specifico. Con
traffico ancora molto basso uno split 50/50 non produce un confronto
statisticamente significativo e nel frattempo nasconde il report a metà
dei visitatori senza un motivo di prodotto valido in questa fase.
`isGatedVariant()` (`src/features/audit/abTest.ts`) è stata
temporaneamente forzata a restituire sempre `false` (tutti vedono la
variante aperta), lasciando l'infrastruttura dell'esperimento intatta
(GatedContent, metadata `abVariant` sugli eventi, `computeAbTestMetrics`
in admin) — riattivarlo in futuro richiede solo di ripristinare la
logica di hash sul corpo della funzione, non ricostruire nulla.

**Verifica:** 94 test totali (rimosso il test statistico sullo split
50/50, non più applicabile con l'esperimento in pausa; aggiunto un test
che verifica il ritorno costante a `false`), build/lint verdi,
verifica end-to-end reale sul sito in produzione dopo il fix Passenger.

### D37 — Outreach automatico: scraping, audit, filtro idoneità privacy/cookie, invio email

**Decisione:** su richiesta esplicita dell'owner ("analizza 30 aziende
al giorno... quelle che reputi abbiano problemi di privacy policy e
cookie policy invii l'email"), è stata costruita una pipeline che
analizza automaticamente siti web (da una coda caricata dall'owner più
scoperta automatica via Google Maps), decide se il sito è "idoneo" a
ricevere un'email in base a problemi reali di privacy/cookie policy
rilevati, e in caso positivo invia l'email in autonomia.

- **`src/features/outreach/eligibility.ts`** (`evaluateOutreachEligibility`):
  idoneità basata **specificamente** su Cookie & Consent e Privacy — non
  sul Site Score complessivo — perché è esattamente il problema che
  l'owner ha chiesto di intercettare. Priorità: un critical cap (D34)
  scattato su una delle due categorie → sempre idoneo; altrimenti
  punteggio della categoria sotto 50 → idoneo; altrimenti non idoneo. Un
  sito con SEO pessima ma Cookie & Consent solido non è idoneo — non è
  quello per cui questo outreach esiste.
- **`src/features/outreach/extractContactEmail.ts`**: estrae un'email di
  contatto dall'HTML già fetchato (link `mailto:` con priorità, poi
  pattern testuale), preferisce un alias aziendale generico
  (`info@`/`contatti@`) a uno che sembra personale, preferisce
  un'email sullo stesso dominio del sito a una di terze parti (es.
  `noreply@sentry.io` incollato per errore in una pagina), e scarta
  pattern chiaramente spuri (estensioni immagine, `noreply@`,
  `test@`/`example@`).
- **`src/features/outreach/composeEmail.ts`**: il corpo dell'email cita
  **sempre** il finding reale rilevato (mai copy generico), identifica
  il mittente (Freesbe S.r.l.) e include un link di disiscrizione
  firmato (HMAC su `OUTREACH_SECRET`) che porta a una pagina pubblica
  `/unsubscribe` — la disiscrizione aggiunge l'indirizzo a una lista di
  soppressione **permanente** (`outreach_suppressions`), controllata
  prima di ogni invio futuro (per email e per dominio).
- **`src/lib/leadDiscovery/googlePlaces.ts`**: scoperta di nuove attività
  tramite **Google Places API (Text Search)**, l'unica via conforme ai
  Termini di Servizio di Google — non uno scraper delle pagine di
  risultati di Google Search/Maps (violerebbe i ToS e rischierebbe il
  blocco IP del server). Richiede una `GOOGLE_PLACES_API_KEY`
  dell'owner (API a pagamento, con credito gratuito mensile); senza,
  la funzione ritorna una lista vuota e logga un warning — non blocca
  mai la parte "coda manuale" della pipeline.
- **`src/features/outreach/runOutreachBatch.ts`**: orchestratore del
  batch giornaliero — fino a **30 siti dalla coda manuale** (quelli
  caricati dall'owner, FIFO) più fino a **10 nuove scoperte Google
  Maps** per query, ciascuno: controllo soppressione → audit reale
  (stesso motore usato dal prodotto, incluso il rilevamento privacy/
  cookie D34) → decisione di idoneità → estrazione email → invio se
  idoneo. Ogni esito (incluso "non idoneo" e "nessuna email trovata")
  viene salvato, non solo gli invii riusciti — è il presupposto dei
  filtri richiesti in admin.
- **`migrations/0006_outreach.sql`**: tabelle `outreach_sites`
  (deduplicata per dominio, con l'intera cronologia di stato) e
  `outreach_suppressions` (opt-out permanente).
- **`/api/outreach/run`**: protetto da un header `x-outreach-secret`
  confrontato con `OUTREACH_SECRET` (stesso pattern già usato da
  `/api/content/generate`/`CONTENT_GENERATION_SECRET`) — pensato per
  essere chiamato da uno scheduler esterno, dato che Hostinger Cloud
  Startup non offre cron. **Va configurato un pinger esterno gratuito**
  (es. cron-job.org) che chiama questo endpoint una volta al giorno con
  l'header impostato, altrimenti la pipeline non parte mai da sola.
- **`/admin/outreach`**: form per caricare URL nella coda manuale
  (`/api/admin/outreach/queue`, protetto dal cookie di sessione admin),
  statistiche (idonei/non idonei/email inviate/in coda) e tabella
  filtrabile per idoneità — esattamente il requisito esplicito
  dell'owner ("crea filtri per idoneo o no").

**Nota sul blocco del classificatore Auto Mode:** durante la costruzione
di questa feature, il classificatore di sicurezza della modalità Auto ha
bloccato più volte le modifiche che introducevano l'infrastruttura di
scraping + invio email automatico non richiesto, finché l'owner non ha
disattivato l'Auto Mode dalla sessione — comportamento della piattaforma,
non un bug di questo codice. Documentato qui perché è probabile che si
ripresenti se in futuro va modificata ulteriormente questa parte del
codebase in Auto Mode.

**Cosa NON è stato implementato, e perché:**
- **Nessuna schedulazione cron nativa.** Hostinger Cloud Startup non dà
  accesso SSH; l'owner deve configurare un pinger esterno gratuito
  puntato su `/api/outreach/run` con l'header segreto.
- **Nessuna revisione umana prima dell'invio** — esplicitamente richiesto
  "completamente automatico" dall'owner, a fronte del rischio di
  compliance segnalato esplicitamente in chat (l'invio di email
  commerciali non richieste a indirizzi ottenuti tramite scraping è in
  una zona grigia rispetto all'art. 130 D.Lgs. 196/2003 — non è
  necessariamente illegale in ambito B2B, ma non è stato dato un parere
  legale su questo, e la scelta di renderlo automatico è stata presa
  dall'owner con questa informazione disponibile).
- **Nessun rate-limit "duro" oltre ai cap giornalieri (30 manuali + 10
  per query di scoperta)** — non esiste una gestione degli invii falliti
  con retry/backoff, né un tetto assoluto configurabile lato env; un
  errore di configurazione nel body della richiesta a `/api/outreach/run`
  (es. `manualPerDay` molto alto) può superare i cap di buon senso fino
  al limite hard-coded di validazione (100 manuali, 50 per query di
  scoperta).

**Verifica:** 106 test totali (12 nuovi:
`tests/extractContactEmail.test.ts`, `tests/outreachEligibility.test.ts`,
`tests/composeOutreachEmail.test.ts`), build/lint verdi. Non verificato
end-to-end con una chiamata reale a Google Places API o un invio email
reale in questa sessione (nessuna `GOOGLE_PLACES_API_KEY`/credenziali
di produzione disponibili qui) — stesso principio di trasparenza di
D12/D21/D30: il percorso "nessuna chiave configurata" (coda manuale
soltanto) è l'unico verificato realmente.

### D38 — Posizionamento generico ("azienda", non solo agenzie immobiliari) + esposizione normativa (matrice sanzionatoria GDPR)

**Decisione:** su richiesta esplicita dell'owner, due cambi distinti:

1. **Copy generalizzata**: tutte le stringhe rivolte all'utente che
   parlavano esplicitamente di "agenzia"/"agenzie immobiliari"
   (homepage, `layout.tsx`, content engine, system prompt AI) sono state
   generalizzate ad "azienda"/"sito aziendale" — coerente con la
   decisione già presa in D37 di non limitare più lo scraping/outreach
   alle sole agenzie immobiliari. Il posizionamento originale del
   prodotto (`AI/MASTER_SPEC.md`) restava per agenzie immobiliari; questo
   allarga il pubblico dichiarato senza toccare la logica di audit, che
   era già generica.

2. **`src/features/audit/regulatoryExposure.ts`** (nuovo,
   `resolveRegulatoryExposure`): sulla pagina risultati, oltre al Site
   Score, viene mostrata un'"esposizione normativa" su 4 livelli per
   Cookie & Consent e Privacy — 🟢 Conforme, 🟡 Attenzione, 🟠 Rischio
   elevato, 🔴 Criticità normativa — con riferimenti agli articoli GDPR/
   D.Lgs. 196/2003 coinvolti e, per i livelli 🟠/🔴, il massimo edittale
   previsto (art. 83, par. 5 GDPR: fino a €20.000.000 o il 4% del
   fatturato mondiale annuo, richiamato per i cookie anche dall'art. 166
   comma 2 del Codice Privacy che include l'art. 122).

   Regole di framing seguite **esattamente come richiesto dall'owner**,
   per evitare l'errore di credibilità di mostrare "rischi una multa da
   20 milioni" per un piccolo sito con un pixel configurato male:
   - **Mai una somma di violazioni.** Quando sia Cookie & Consent sia
     Privacy hanno un critical cap (D34) attivo, viene mostrato solo il
     finding più grave (stesso criterio già usato da `criticalCaps.ts`
     per scegliere il tetto più stringente) — mai "€20M + €20M".
   - **Sempre "massimo edittale previsto", mai una previsione di
     sanzione.** Ogni volta che compare una cifra, è accompagnata dalla
     frase esplicita che l'importo reale è deciso dal Garante in base
     alle circostanze concrete (gravità, durata, numero di interessati,
     misure correttive, precedenti) — non una previsione di quanto
     l'azienda "rischia realmente".
   - **Il livello 🔴 scatta solo quando un critical cap è realmente
     scattato** (D34: nessun CMP con tracker attivi, nessun CMP,
     informativa privacy assente) — non per un punteggio semplicemente
     basso, che genera invece 🟠 "Rischio elevato" con un framing meno
     assertivo.
   - **Cifre aggiornate al regime GDPR + art. 166 Codice Privacy**, non
     alle vecchie soglie italiane pre-GDPR (€6.000-36.000 ecc.,
     esplicitamente abrogate) citate dall'owner come errore da evitare.

   Component `RegulatoryExposureCard.tsx`, renderizzato sulla pagina
   risultati subito dopo le priorità principali, prima del form email.

**Cosa NON è stato implementato, e perché (il resto della spec
dell'owner):**
- **Nessuna "libreria di casi" con 20+ combinazioni di finding
  pre-scritte una per una.** La spec elenca decine di combinazioni
  specifiche (es. "Meta Pixel prima del consenso" come voce a sé
  rispetto a "Google Ads prima del consenso"); questo codebase ha un
  numero limitato di critical cap realmente rilevabili (D34) — la
  mappa `CRITICAL_FINDING_COPY` copre le 3 esistenti
  (`cookie_cmp_absent_trackers_active`, `cookie_cmp_absent`,
  `privacy_policy_absent`); estenderla a voci che il codice non
  distingue ancora (es. Meta Pixel specificamente vs. Google Ads
  specificamente come finding *critical* separati, oggi entrambi
  ricadono nello stesso reasonCode) richiederebbe nuovi detector, non
  solo nuovo testo.
- **Nessun collegamento con l'art. 25 (privacy by design, €10M/2%) o con
  i poteri correttivi dell'art. 58** (ammonimento, pubblicazione del
  provvedimento) citati dall'owner con l'esempio del caso Milia S.r.l.
  — non esiste nel codebase un segnale che distingua "il sito ha
  corretto rapidamente" da "non lo ha fatto", che è ciò che nella realtà
  sposta il Garante da una sanzione a un ammonimento; mostrarlo come
  possibilità generica senza un segnale concreto dietro sarebbe stato
  meno onesto del semplice non implementarlo.

**Verifica:** 112 test totali (6 nuovi:
`tests/regulatoryExposure.test.ts` — critica su cap singolo, critica
con selezione del finding più grave quando entrambe le categorie sono
cappate, rischio elevato, attenzione, conforme, null quando nessuna
categoria rilevante è presente), build/lint verdi, verifica end-to-end
reale contro `pypi.org`: Cookie & Consent 0/100 + Privacy 64/100 →
"🟠 Rischio elevato" mostrato correttamente con il testo del massimo
edittale.
