# Changelog AI — SiteCheck AI

## Scopo del documento

Questo documento registra tutte le modifiche significative apportate al
progetto da Claude Code, task dopo task.

## Stato

Phase 5 — Content Engine completata (infrastruttura). MVP v1
(`AI/MASTER_SPEC.md` §4) resta implementato nella sua interezza; Phase 5
va oltre l'MVP. Persistenza migrata da Supabase a PostgreSQL self-hosted
(VPS Hostinger) su richiesta dell'owner.

## Log

- 2026-09-09 — Setup iniziale dell'ambiente di sviluppo condiviso: creati
  CLAUDE.md e la cartella AI/ con i documenti di protocollo
  (MASTER_SPEC, CURRENT_TASK, ARCHITECTURE, DECISIONS, CHANGELOG_AI).

- 2026-09-09 — Phase 0 — Foundation:
  - consolidata la specifica di prodotto caricata da ChatGPT in
    `AI/MASTER_SPEC.md` (rimossa la copia duplicata in root)
  - inizializzato il progetto Next.js 16 (App Router, Turbopack) +
    TypeScript strict + Tailwind CSS v4
  - configurati ESLint (flat config) e Prettier
  - aggiunta validazione centralizzata delle variabili d'ambiente con Zod
    (`src/lib/config/env.ts`) e creato `.env.example`
  - stabilita la struttura modulare del progetto
    (`src/features/{audit,affiliate,leads,analytics,admin,content}`,
    `src/lib/{config,db,ai,security}`)
  - creata una landing page shell statica (Hero, Cosa controlliamo, Come
    funziona, CTA) coerente con `AI/MASTER_SPEC.md` §35–§37; il form URL
    non è ancora collegato al motore di audit (Phase 1)
  - aggiunto Vitest come test runner con un test di sanity sul modulo env
  - aggiornati `AI/ARCHITECTURE.md` e `AI/DECISIONS.md`
  - verificati: `npm install`, `npm run lint`, `npm run format:check`,
    `npm run test`, `npm run build` (tutti verdi); app verificata in
    `next dev` (HTTP 200)

- 2026-09-09 — Phase 1 — Audit Engine:
  - normalizzazione URL (`src/features/audit/url.ts`)
  - guard SSRF (`src/lib/security/ssrf.ts`): blocco protocolli non
    http/https, hostname pericolosi, indirizzi IPv4/IPv6 privati o
    riservati risolti via DNS
  - fetcher sicuro con pinning DNS a livello di socket via undici
    (`src/lib/security/safeFetch.ts`): timeout, limite redirect, limite
    dimensione risposta, rivalidazione SSRF ad ogni hop di redirect
  - rate limiting per IP sull'endpoint di audit
    (`src/lib/security/rateLimit.ts`)
  - 7 detector modulari (`src/features/audit/detectors/`): technical,
    seo, privacy, cookieConsent, tracking, performance (con fallback
    interno se `PAGESPEED_API_KEY` non configurata), forms (informativo)
  - modello di scoring centralizzato (`src/features/audit/scoring.ts`)
    con pesi per categoria da `AI/MASTER_SPEC.md` §8 e ridistribuzione
    automatica sulle categorie prive di check validi
  - endpoint `POST /api/audit` e pagina risultati `/audit/[id]` con
    progressive disclosure e wording italiano non-legale
  - persistenza mock in-memory (`src/lib/db/memoryAuditStore.ts`)
  - 37 test unitari (URL, SSRF guard, scoring, detector technical)
  - aggiornati `AI/ARCHITECTURE.md`, `AI/DECISIONS.md`, `AI/CURRENT_TASK.md`
  - verificati: `npm run lint`, `npm run format:check`, `npm run test`
    (37/37), `npm run build` (tutti verdi)
  - verifica end-to-end reale contro `https://pypi.org`: Site Score
    72/100, banda "Buono"; verifica SSRF contro `127.0.0.1`, `localhost`,
    `169.254.169.254`, `192.168.1.1` — tutti bloccati correttamente

- 2026-09-09 — Phase 2 — Persistence + Leads + Affiliate:
  - integrazione Supabase (`@supabase/supabase-js`) con fallback
    automatico su store in-memory quando non configurata
  - schema SQL iniziale (`supabase/migrations/0001_init.sql`): `audits`,
    `audit_checks`, `leads`, `affiliate_clicks`, RLS senza policy
    pubbliche (accesso solo via service role key server-side)
  - repository per audit, lead, click affiliati
    (`src/lib/db/{audits,leads,affiliate}Repository.ts`)
  - cattura lead (`POST /api/leads`) con consenso marketing separato dal
    servizio, form sui risultati (`EmailCaptureForm.tsx`)
  - adapter email provider-agnostico (`src/lib/email/`): Resend + mock/dev
  - redirect affiliato generico e tracciato (`GET /go/[partner]`,
    configurazione partner in `src/features/affiliate/partners.ts`), CTA
    condizionale sui risultati quando Cookie & Consent ha criticità
  - dashboard admin (`/admin`) con metriche aggregate
    (`src/features/admin/metrics.ts`)
  - autenticazione admin: password singola + cookie firmato HMAC-SHA256,
    gate applicato da `src/proxy.ts`
  - migrazione da `middleware.ts` (deprecato in Next.js 16) a `proxy.ts`
  - bug di sicurezza trovato durante il testing end-to-end e corretto: il
    matcher del proxy non copriva `/admin` nudo, solo `/admin/*` — la
    dashboard era raggiungibile senza autenticazione (vedi
    `AI/DECISIONS.md` D17)
  - bug trovato e corretto: `/admin` veniva prerenderizzata staticamente
    al build, mostrando dati non aggiornati — aggiunto
    `export const dynamic = "force-dynamic"`
  - aggiornati `AI/ARCHITECTURE.md`, `AI/DECISIONS.md`, `AI/CURRENT_TASK.md`
  - verificati: `npm run lint`, `npm run format:check`, `npm run test`
    (37/37), `npm run build` (tutti verdi)
  - verifica end-to-end reale (store in-memory): audit → lead capture →
    email mock loggata correttamente → redirect affiliato con UTM
    corretti → dashboard admin con numeri esatti (1 audit, 100% cattura
    email, 100% CTR affiliati, problemi rilevati elencati)

- 2026-09-09 — Phase 3 — AI Summaries:
  - interfaccia `AIProvider` provider-agnostica (`src/lib/ai/`)
  - provider Anthropic (`@anthropic-ai/sdk`, modello di default
    `claude-haiku-4-5`), prompt strutturato con input/output JSON
  - validazione Zod dell'output AI (`auditSummarySchema`)
  - fallback deterministico basato su template (`buildDeterministicSummary`
    in `src/features/audit/aiSummary.ts`), sempre disponibile
  - persistenza `audit_summaries`
    (`supabase/migrations/0002_audit_summaries.sql` + fallback in-memory)
  - UI risultati aggiornata con summary e priorità arricchite (titolo +
    motivazione)
  - bug trovato e corretto durante il testing: la validazione dell'output
    AI avveniva solo dentro il provider Anthropic, non nell'orchestratore
    — un provider futuro che dimenticasse di validare avrebbe potuto
    mostrare dati non validati all'utente; ora `generateAuditSummary`
    rivalida sempre centralmente (vedi `AI/DECISIONS.md` D19)
  - 44 test unitari totali (7 nuovi per schema + fallback deterministico
    + gestione errori provider)
  - aggiornati `AI/ARCHITECTURE.md`, `AI/DECISIONS.md`, `AI/CURRENT_TASK.md`
  - verificati: `npm run lint`, `npm run format:check`, `npm run test`
    (44/44), `npm run build` (tutti verdi)
  - verifica end-to-end reale (percorso deterministico, nessuna
    `ANTHROPIC_API_KEY` disponibile in questa sessione): audit contro
    `pypi.org` → summary "Il Site Score rilevato è 72/100. Elementi da
    verificare individuati in: Cookie & Consent, Privacy, SEO." e
    priorità mostrate correttamente in UI; percorso con provider
    Anthropic reale verificato solo per lettura del codice e test con
    mock (vedi `AI/DECISIONS.md` D21)

- 2026-09-09 — Phase 4 — Launch Analytics:
  - vocabolario eventi fisso e validato (`src/lib/analytics/events.ts`):
    `landing_view`, `audit_started`, `audit_completed`, `audit_failed`,
    `results_viewed`, `email_submitted`, `affiliate_clicked`
  - tabella `analytics_events`
    (`supabase/migrations/0003_analytics_events.sql` + fallback in-memory)
  - tracker client fire-and-forget (`src/lib/analytics/client.ts`,
    `localStorage`-based, non blocca mai il flusso utente)
  - eventi lifecycle (audit start/completed/failed, email inviata, click
    affiliato) loggati server-side dentro i route handler esistenti,
    non client-side — più affidabile (`AI/DECISIONS.md` D22)
  - cattura UTM da query string fino alla persistenza su `audits`
    (colonne esistenti dalla Phase 2, mai popolate finora)
  - metriche di funnel in admin dashboard (`computeFunnelMetrics`):
    landing→audit avviato, audit avviato→completato, risultati→email,
    risultati→click affiliato — deliberatamente separate dalle metriche
    Phase 2 esistenti, non una modifica alla loro semantica
  - `DEPLOYMENT.md`: guida al deploy in produzione
  - 50 test totali (6 nuovi: schema eventi + calcolo funnel)
  - aggiornati `AI/ARCHITECTURE.md`, `AI/DECISIONS.md`, `AI/CURRENT_TASK.md`
  - verificati: `npm run lint`, `npm run format:check`, `npm run test`
    (50/50), `npm run build` (tutti verdi)
  - verifica end-to-end con browser reale (Playwright/Chromium,
    installato temporaneamente solo per il QA di questa sessione, non
    aggiunto al progetto — `AI/DECISIONS.md` D25): flusso completo
    landing (con UTM) → submit audit → risultati → cattura email → click
    affiliato → login admin → dashboard con conteggi e tassi di
    conversione corretti (es. 2 audit, 100% completamento, 50% cattura
    email, 25% click affiliato su risultati visti)
  - con questa fase, l'MVP v1 di `AI/MASTER_SPEC.md` §4 è completo

- 2026-09-09 — Phase 5 — Content Engine (infrastruttura):
  - soglia minima campione n=30 (`MINIMUM_SAMPLE_SIZE`) per qualunque
    statistica derivata da dati reali — mai bypassata, mai inventata
  - `computeCookieConsentInsight`: prima metrica reale collegata (quota
    di audit con problema cookie/consenso rilevato), tracciabile via
    `sourceQueryHash`
  - libreria evergreen scritta a mano per i sei formati di §16, usata di
    default finché il campione reale non basta
  - cadenza settimanale di esempio (`schedule.ts`)
  - pipeline `generateContent`: insight reale se disponibile, altrimenti
    evergreen, mai il contrario
  - persistenza `content_insights`/`content_posts`/`content_publications`
    (`supabase/migrations/0004_content_engine.sql` + fallback in-memory)
  - `POST /api/content/generate`, protetto da secret, pensato per uno
    scheduler esterno (nessun job in background in-process)
  - interfaccia `SocialPublisher` (§17) con implementazione di default
    "queue-only": trovato che l'owner ha già Metricool come setup di
    pubblicazione (tool MCP Metricool + skill `carosello-freesbe`
    disponibili in questa sessione) — pubblicazione reale delegata a
    quel flusso esistente invece di un'integrazione HTTP indovinata
    (`AI/DECISIONS.md` D27)
  - pagina admin di sola lettura `/admin/content`
  - deliberatamente non implementato: rendering PNG delle creative
    (§18, nessuna dipendenza di rendering pesante aggiunta senza
    contenuto reale da pubblicare — D28)
  - 60 test totali (10 nuovi)
  - aggiornati `AI/ARCHITECTURE.md`, `AI/DECISIONS.md`, `AI/CURRENT_TASK.md`
  - verificati: `npm run lint`, `npm run format:check`, `npm run test`
    (60/60), `npm run build` (tutti verdi)
  - verifica end-to-end reale: generazione sotto soglia → evergreen
    confermato in coda; poi 30 audit reali inviati rispettando il rate
    limit di `/api/audit` (il primo tentativo in parallelo è stato
    correttamente bloccato dal rate limiter, confermandone il
    funzionamento sotto carico) → rigenerazione dello stesso tipo → post
    basato su insight reale confermato in `/admin/content`

- 2026-09-09 — Migrazione persistenza: Supabase → PostgreSQL self-hosted
  (VPS Hostinger), su richiesta esplicita dell'owner ("App + database,
  tutto su Hostinger"):
  - rimosso `@supabase/supabase-js`, aggiunto `pg` (node-postgres) +
    `@types/pg`; `src/lib/db/supabaseClient.ts` eliminato, sostituito da
    `src/lib/db/pgClient.ts` (pool `pg` server-only, SSL abilitato solo
    se `sslmode=require` è esplicito nella connection string)
  - tutti e sei i repository (`auditsRepository.ts`, `leadsRepository.ts`,
    `affiliateRepository.ts`, `summariesRepository.ts`,
    `eventsRepository.ts`, `contentRepository.ts`) riscritti con SQL
    parametrizzato via `pool.query()` (transazione esplicita
    `BEGIN`/`COMMIT`/`ROLLBACK` per `saveAudit`, che scrive su `audits` +
    `audit_checks` atomicamente); stesso pattern di fallback su store
    in-memory quando `DATABASE_URL` non è configurato o una scrittura
    fallisce
  - `src/lib/config/env.ts`: rimosse `SUPABASE_URL`/`SUPABASE_ANON_KEY`/
    `SUPABASE_SERVICE_ROLE_KEY`; `DATABASE_URL` validato come stringa non
    vuota invece che `.url()` (una connection string Postgres può
    contenere caratteri che `.url()` di Zod rifiuterebbe)
  - cartella `supabase/migrations/` rinominata `migrations/` (SQL
    standard, nessuna riscrittura di contenuto necessaria oltre a un
    commento che citava la service role key)
  - `.env.example` e `README.md` aggiornati (sezione "Configurazione
    PostgreSQL" al posto di "Configurazione Supabase")
  - `DEPLOYMENT.md` riscritto con una guida VPS Hostinger completa e
    dettagliata: provisioning Ubuntu, Node.js 20, installazione e
    configurazione PostgreSQL (bind solo su `localhost`), esecuzione
    migration via `psql`, PM2 come process manager, Nginx come reverse
    proxy, SSL via Certbot, firewall `ufw`, backup del database via
    `pg_dump` pianificato (responsabilità che prima Supabase copriva
    automaticamente)
  - `AI/ARCHITECTURE.md` e `AI/DECISIONS.md` (nuova voce D30, con
    riferimenti incrociati aggiornati su D3, D13, D15) aggiornati
  - verificati: `npm run format`, `npm run lint`, `npm run test`
    (60/60), `npm run build` (tutti verdi)
  - verifica end-to-end reale limitata al percorso di fallback in-memory
    (nessun server PostgreSQL live disponibile in questa sessione
    sandbox, stesso limite già dichiarato per Supabase in D13/D21):
    `next dev` avviato, landing page 200, audit reale contro
    `https://pypi.org` inviato con successo, pagina risultati
    raggiungibile con HTTP 200. Il percorso `DATABASE_URL` configurato
    resta verificato solo per lettura del codice — va confermato con un
    audit reale al primo deploy su Hostinger (vedi checklist
    `DEPLOYMENT.md`)

- 2026-09-09 — Deploy reale su Hostinger (Cloud Startup + Neon), grafica,
  accuratezza detector, esperimento A/B:
  - deploy Node.js effettivo su Hostinger (piano Cloud Startup, non VPS —
    nessun accesso root/SSH per gestione processi, solo il wizard "Deploy
    Web App" del pannello); database Postgres su Neon (free tier,
    `eu-central-1`) invece di un Postgres self-hosted, dato che Cloud
    Startup non lo supporta
  - `next.config.ts` → `next.config.js` e build forzata su Webpack
    (`next build --webpack`): il server Hostinger (CloudLinux 8) non ha
    binari nativi SWC/Turbopack compatibili con la sua glibc, né un
    fallback WASM per Turbopack — entrambe le cause di build fallita
    individuate dai log reali del pannello Hostinger, non ipotizzate
  - repository GitHub: creato branch `main` e impostato come default
    (l'importer Git di Hostinger non trovava il branch di lavoro
    `claude/sitecheck-ai-setup-xfrrbo`); il deploy finale è comunque
    avvenuto via upload ZIP diretto, non via import Git
  - rinnovo grafico di landing e pagina risultati: header/footer di sito,
    badge di fiducia, icone per categoria, gauge circolare colorato per
    banda per il Site Score, barre di progresso per categoria — nessun
    cambiamento alla logica di business
  - pagine `/privacy-policy` e `/cookie-policy` con Freesbe S.r.l. come
    titolare del trattamento (dati forniti dall'owner) e trattamenti
    descritti in base al comportamento reale del codice, non un template
    generico — **non revisionate legalmente**, da far controllare prima
    di considerarle definitive
  - rilevamento CMP ampliato da 6 a 16 piattaforme (`signals.ts`),
    incluso Google Funding Choices/Consent Mode: prima un sito con solo
    il consent tooling nativo di Google risultava falso-negativo su
    "nessuna piattaforma di consenso rilevata", il check più pesante
    dell'intero punteggio (peso 70 su 100 nella categoria Cookie &
    Consent); aggiunti anche i tracker Google Ads, Pinterest, X/Twitter
  - pagina risultati riordinata: cattura email e CTA affiliato subito
    dopo le priorità principali, prima dell'accordion dettagliato (prima
    erano in fondo pagina)
  - esperimento A/B (D31): split 50/50 deterministico sull'`audit.id` fra
    dettaglio per categoria sempre visibile ("open") o sbloccato via
    email ("gated", `GatedContent`); punteggio/banda/riassunto/priorità
    restano sempre visibili in entrambe le varianti. Evento
    `results_viewed` porta `metadata.abVariant`, `email_submitted` porta
    `metadata.source` ("default"/"gate") per confrontare la conversione
    delle due varianti via query SQL su Neon
  - `POST /api/leads`: l'esito reale dell'invio email via provider ora
    viene controllato e loggato in caso di fallimento (prima scartato in
    silenzio) — il lead resta comunque sempre salvato
  - 2 nuovi test (`tests/abTest.test.ts`: determinismo dello split,
    proporzione ~50/50 su campione di 2000), 62 test totali
  - verificati: `npm run lint`, `npm run test` (62/62), `npm run build`
    (webpack, tutti verdi)
  - verifica end-to-end reale in produzione su Hostinger: audit contro un
    sito pubblico → Site Score mostrato correttamente, riga comparsa su
    Neon (`audits`), dashboard `/admin` con conteggi corretti; verifica
    locale (sandbox, non Hostinger) di entrambe le varianti A/B su audit
    reali contro `pypi.org`

- 2026-09-10 — Menu di navigazione condiviso in `/admin`:
  - nuovo componente `src/components/AdminNav.tsx` (client component,
    evidenzia la voce attiva via `usePathname`) con le tre sezioni
    Dashboard / Coda contenuti / Outreach
  - sostituiti i link ad-hoc ("← Dashboard", "Coda contenuti", "Outreach")
    nelle tre pagine `/admin`, `/admin/content`, `/admin/outreach` con
    `<AdminNav />`, per una navigazione coerente fra le sezioni
  - preparato (non caricato automaticamente — questo ambiente di sviluppo
    non ha accesso di rete al sito in produzione `cookie.freesbe.it`, blocco
    di rete già noto da D12/D21/D30/D37) un file CSV pronto all'uso a
    partire dall'export CSV di ~1000 agenzie immobiliari caricato
    dall'owner: estratti le URL uniche dalla colonna `website`, escluse le
    righe già marcate `commercial_status = "Contatto avviato"` (240) per
    non ricontattare aziende già lavorate — risultato: 758 URL pronte da
    incollare/trascinare nel form drag & drop di `/admin/outreach` (feature
    D39), che le passerà alla pipeline di outreach automatica (D37)
  - verificati: `npm run lint`, `npm run test` (116/116), `npm run build`
    (webpack, tutti verdi)
