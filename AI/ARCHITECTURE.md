# Architecture — SiteCheck AI

## Scopo del documento

Questo documento descrive l'architettura tecnica aggiornata del progetto
SiteCheck AI: stack, componenti principali, flussi dati e integrazioni
esterne. Va aggiornato ogni volta che l'architettura cambia.

## Stato

Phase 4 — Launch Analytics completata.

## Stack tecnologico

- **Framework:** Next.js 16 (App Router, Turbopack, convenzione `proxy.ts`
  per la logica pre-routing — vedi §"Admin & auth" sotto), React 19
- **Linguaggio:** TypeScript 5, `strict: true`
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Validazione env / schema:** Zod
- **Parsing HTML:** Cheerio
- **HTTP client con controllo socket-level:** undici (`Agent` con `connect.lookup`
  personalizzato, per il pinning DNS anti-SSRF-rebinding)
- **Database:** PostgreSQL via Supabase (`@supabase/supabase-js`, client
  service-role server-only). Fallback automatico a persistenza in-memory
  quando Supabase non è configurato (vedi `AI/DECISIONS.md`)
- **AI:** `@anthropic-ai/sdk`, provider Anthropic dietro un'interfaccia
  provider-agnostica; fallback deterministico sempre disponibile
- **Lint:** ESLint 9 (flat config, `eslint-config-next`)
- **Formattazione:** Prettier 3
- **Test:** Vitest 4 (runner `node`, alias `@/*` → `src/*`)
- **Package manager:** npm (lockfile `package-lock.json`)

## Struttura del repository

```text
/
├── AI/                     # Protocollo operativo condiviso Claude ↔ ChatGPT
│   ├── MASTER_SPEC.md
│   ├── CURRENT_TASK.md
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── CHANGELOG_AI.md
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── admin/          # Dashboard admin + login (Phase 2)
│   │   ├── api/            # Route handler: audit, leads, events, admin login/logout
│   │   ├── audit/[id]/     # Pagina risultati
│   │   └── go/[partner]/   # Redirect affiliato generico (Phase 2)
│   ├── components/         # Componenti UI generici e riutilizzabili
│   ├── features/           # Logica di business divisa per dominio
│   │   ├── audit/          # Motore di audit (Phase 1)
│   │   ├── affiliate/      # Config partner affiliati (Phase 2)
│   │   ├── admin/          # Aggregazione metriche + funnel dashboard (Phase 2, 4)
│   │   └── content/        # Motore contenuti automatico (Phase 5)
│   ├── lib/
│   │   ├── config/         # Configurazione centralizzata (env.ts)
│   │   ├── db/             # Repository Supabase + fallback in-memory
│   │   ├── email/          # Adapter email provider-agnostico (Phase 2)
│   │   ├── ai/             # Layer AI provider-agnostico (Phase 3)
│   │   ├── analytics/      # Vocabolario eventi + tracker client (Phase 4)
│   │   └── security/       # SSRF guard, rate limiting, admin auth
│   └── proxy.ts            # Guard di autenticazione per /admin (Phase 2)
├── supabase/
│   └── migrations/         # Schema SQL (Phase 2, 3, 4)
├── scripts/                # Script operativi futuri
├── tests/                  # Test Vitest
├── public/                 # Asset statici
├── .env.example
├── CLAUDE.md
├── DEPLOYMENT.md           # Guida al deploy in produzione (Phase 4)
└── README.md
```

Questa struttura ricalca la proposta in `AI/MASTER_SPEC.md` §25 (con
`features/leads` assorbita in `app/api/leads` + `lib/db/leadsRepository`,
non essendo emersa una logica di dominio abbastanza ricca da giustificare
una cartella feature dedicata in questa fase). Le cartelle non ancora
popolate contengono un file `.gitkeep` per preservare la struttura in git
fino all'implementazione delle relative feature.

## Configurazione ambiente

`src/lib/config/env.ts` centralizza la lettura e validazione (Zod) delle
variabili d'ambiente elencate in `.env.example`. In questa fase tutte le
variabili sono opzionali perché nessuna feature runtime (DB, AI, email,
performance API) è ancora implementata: l'obiettivo di Phase 0 è avere lo
schema pronto, non bloccare build/dev in assenza di credenziali. Quando
una feature diventa dipendente da una variabile, il relativo campo dovrà
diventare obbligatorio nello schema.

## Landing page

`src/app/page.tsx` implementa la struttura descritta in `AI/MASTER_SPEC.md`
§36 (Hero, Cosa controlliamo, Come funziona, CTA finale). Il form URL
(`src/components/AuditUrlForm.tsx`) è un client component che invia
`POST /api/audit` e naviga a `/audit/[id]` al successo.

## Motore di audit (Phase 1)

Flusso end-to-end (`src/features/audit/runAudit.ts`):

1. **Normalizzazione URL** (`url.ts`) — accetta input con o senza schema,
   default HTTPS, valida solo `http`/`https`.
2. **Fetch sicuro** (`src/lib/security/safeFetch.ts`) — ogni hop (incluso
   ogni redirect) viene validato dal guard SSRF e la connessione TCP viene
   *pinnata* all'indirizzo IP già validato tramite un `Agent` undici con
   `connect.lookup` personalizzato, per evitare un bypass via DNS
   rebinding fra validazione e connessione effettiva. Applica timeout
   complessivo, limite di redirect e limite di dimensione della risposta
   (letta in streaming con cutoff).
3. **Guard SSRF** (`src/lib/security/ssrf.ts`) — blocca schemi non
   http/https, hostname ovviamente pericolosi (`localhost`, `.internal`,
   ecc.) e, soprattutto, ogni indirizzo IP risolto che ricada in un range
   privato/loopback/link-local/riservato/multicast (IPv4 e IPv6, incluso
   IPv4-mapped IPv6). Se un hostname risolve anche a un solo indirizzo non
   pubblico, l'intero hostname viene rifiutato.
4. **Rate limiting** (`src/lib/security/rateLimit.ts`) — sliding window
   in-memory per IP sull'endpoint `/api/audit` (10 richieste/minuto di
   default).
5. **Parsing HTML** con Cheerio.
6. **Detector modulari** (`src/features/audit/detectors/`), ciascuno puro
   e sincrono, eseguito in try/catch isolato (un detector che lancia
   un'eccezione non blocca l'intero audit — degradazione controllata,
   `AI/MASTER_SPEC.md` §29): `technical`, `seo`, `privacy`,
   `cookieConsent`, `tracking`, `performance`, `forms` (quest'ultimo solo
   informativo, peso 0, escluso dal punteggio).
7. **Performance**: se `PAGESPEED_API_KEY` è configurata, chiama Google
   PageSpeed Insights (`src/features/audit/pagespeed.ts`); altrimenti usa
   in fallback il tempo di risposta misurato dal fetcher.
8. **Scoring** (`scoring.ts`) — media pesata per categoria (peso × status ×
   confidence), poi media pesata fra categorie secondo i pesi di
   `AI/MASTER_SPEC.md` §8. Le categorie senza check validi vengono escluse
   e il peso viene ridistribuito automaticamente sulle categorie restanti.
9. **Persistenza mock** (`src/lib/db/memoryAuditStore.ts`) — `Map`
   in-memory agganciata a `globalThis` (necessario perché Next.js compila
   route handler e pagine come grafi di moduli separati: un semplice
   modulo-singleton non sarebbe condiviso fra `/api/audit` e
   `/audit/[id]`). Non durevole, sostituita da Supabase in Phase 2.
10. **UI risultati** (`src/app/audit/[id]/page.tsx`) — Site Score, banda,
    3 priorità principali, card per categoria con progressive disclosure
    (`<details>`/`<summary>`), wording italiano non-legale.

## Persistenza (Phase 2)

Ogni repository in `src/lib/db/` (`auditsRepository.ts`,
`leadsRepository.ts`, `affiliateRepository.ts`) sceglie il backend una
volta per chiamata, in base a `isSupabaseConfigured()`
(`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` presenti):

- **Supabase configurato:** legge/scrive su PostgreSQL via
  `@supabase/supabase-js`, usando la service role key. Il client
  (`src/lib/db/supabaseClient.ts`) non viene mai esposto al browser. Le
  tabelle (`supabase/migrations/0001_init.sql`) hanno RLS abilitata senza
  policy pubbliche: l'unico accesso passa dal server con la service role
  key, che bypassa RLS by design.
- **Supabase non configurato:** fallback trasparente su store in-memory
  agganciati a `globalThis` (stesso pattern di `memoryAuditStore.ts`,
  Phase 1) — permette a build, test e `next dev` di funzionare senza
  credenziali, coerentemente con la decisione D4 (Phase 0).
- Se una scrittura su Supabase fallisce (errore di rete, tabella
  mancante), il codice logga l'errore e ricade sullo store in-memory
  invece di far fallire la richiesta dell'utente.

Schema tabelle: `audits`, `audit_checks` (una riga per check, popolata
insieme all'audit per abilitare aggregazioni SQL dirette in futuro),
`leads`, `affiliate_clicks` — vedi `AI/MASTER_SPEC.md` §10 e la migration
SQL per i dettagli.

## Lead capture ed email (Phase 2)

`POST /api/leads` (`src/app/api/leads/route.ts`) salva il lead via
`leadsRepository` e invia un'email tramite l'adapter provider-agnostico
in `src/lib/email/`:

- `EmailProvider` è un'interfaccia (`send(message)`); `getEmailProvider()`
  sceglie `resendEmailProvider` solo se `EMAIL_PROVIDER=resend` e
  `EMAIL_API_KEY`/`EMAIL_FROM` sono configurate, altrimenti
  `mockEmailProvider` (logga il messaggio in console, sempre "ok": true).
- Il form (`src/components/EmailCaptureForm.tsx`) raccoglie email +
  consenso marketing esplicito, tenuto separato dall'invio del report
  (che è servizio, non marketing) come richiesto da `AI/MASTER_SPEC.md`
  §11 e §28.

## Redirect affiliato (Phase 2)

`GET /go/[partner]` (`src/app/go/[partner]/route.ts`) è generico: la
configurazione di ogni partner (URL di destinazione da env var, campagna
UTM) vive in `src/features/affiliate/partners.ts`. Un nuovo partner si
aggiunge con una entry lì più la sua env var — mai un ID affiliato
hardcoded nel codice sorgente (`AI/MASTER_SPEC.md` §12). Ogni click viene
loggato (`affiliateRepository`) prima del redirect 302; se il partner non
è configurato (env var assente), risponde 404 invece di fallire in modo
oscuro. La CTA compare sui risultati (`src/components/AffiliateCta.tsx`)
solo quando la categoria Cookie & Consent ha almeno un check
`fail`/`warning`.

## Admin dashboard e autenticazione (Phase 2)

`/admin` (`src/app/admin/page.tsx`, `export const dynamic =
"force-dynamic"` — deve leggere dati live ad ogni richiesta, mai essere
prerenderizzata staticamente) mostra le metriche aggregate calcolate da
`src/features/admin/metrics.ts` a partire da `listAudits()`,
`listLeads()`, `listAffiliateClicks()`.

Autenticazione: gate a password singola con cookie firmato
(`src/lib/security/adminAuth.ts`, HMAC-SHA256 con `ADMIN_PASSWORD` come
chiave, confronto a tempo costante via `timingSafeEqual`), applicato da
`src/proxy.ts` — la convenzione Next.js 16 che sostituisce
`middleware.ts` (deprecato in v16, proxy esegue di default su runtime
Node.js). Il matcher copre sia `/admin` (percorso nudo) sia ogni
`/admin/...` tranne `/admin/login`: un bug iniziale che matchava solo il
secondo caso lasciava `/admin` accessibile senza autenticazione — trovato
e corretto durante il testing end-to-end di questa fase (vedi
`AI/DECISIONS.md`).

## AI Summaries (Phase 3)

`src/lib/ai/` è il layer provider-agnostico richiesto da
`AI/MASTER_SPEC.md` §9:

- `types.ts` — interfaccia `AIProvider` (`generateAuditSummary(input)`) e
  i tipi `AuditSummaryInput`/`AuditSummary`.
- `schema.ts` — schema Zod (`auditSummarySchema`) che valida l'output,
  usato sia dentro il provider Anthropic sia — di nuovo, centralmente —
  nell'orchestratore (vedi sotto): un provider che dimenticasse di
  validare non deve poter mettere dati non validati davanti all'utente.
- `providers/anthropicProvider.ts` — implementazione con
  `@anthropic-ai/sdk`, modello di default `claude-haiku-4-5` (economico,
  configurabile via `AI_MODEL`), system prompt che richiede JSON puro e
  wording italiano non-legale coerente con `AI/MASTER_SPEC.md` §5.
- `index.ts` — `getAIProvider()` ritorna il provider Anthropic solo se
  `AI_PROVIDER=anthropic` e `AI_API_KEY` sono configurate, altrimenti
  `null`.

Orchestrazione (`src/features/audit/aiSummary.ts`,
`generateAuditSummary(audit)`):

1. Se nessun provider è configurato → template deterministico
   (`buildDeterministicSummary`, usa i `Check[]` completi dell'audit per
   un riassunto e fino a 3 priorità con severity `high`/`medium`).
2. Se un provider è configurato, lo chiama con l'input minimale
   `{site_score, industry, checks: [{id, category, status}]}` (§9), poi
   **rivalida** l'output con `auditSummarySchema` a livello di
   orchestratore.
3. Qualsiasi errore (rete, JSON non valido, schema non conforme) →
   ricade sullo stesso template deterministico. La funzione non lancia
   mai eccezioni: l'audit non dipende mai dalla disponibilità dell'AI.

Persistenza: `audit_summaries` (`supabase/migrations/0002_audit_summaries.sql`),
con fallback in-memory (`src/lib/db/summariesRepository.ts`, stesso
pattern `globalThis` delle altre repository). Generata una volta per
audit completato, subito dopo `saveAudit` in `POST /api/audit` — una
sola chiamata AI per audit, non per detector (`AI/MASTER_SPEC.md` §40).

UI: la pagina risultati mostra il testo di `summary.summary` sopra le
priorità; le priorità usano `summary.top_priorities` (title + reason)
quando disponibili, altrimenti ricadono sulla lista calcolata
localmente dai check `fail`/`warning` (compatibilità con eventuali audit
salvati prima di questa fase).

## Analytics interne e funnel (Phase 4)

`src/lib/analytics/`:

- `events.ts` — vocabolario fisso di eventi (`EVENT_NAMES`, coerente con
  `AI/MASTER_SPEC.md` §14): `landing_view`, `audit_started`,
  `audit_completed`, `audit_failed`, `results_viewed`, `email_submitted`,
  `affiliate_clicked`. Nomi arbitrari vengono rifiutati dallo schema Zod
  (`trackEventSchema`), così la tabella resta interrogabile.
- `client.ts` — helper solo client (`"use client"`): `getSessionId()`
  genera/legge un id anonimo per-browser da `localStorage` (fallback a un
  id per-chiamata se non disponibile, non solleva mai eccezioni);
  `trackEvent()` è fire-and-forget verso `POST /api/events` (`keepalive:
  true`, non blocca né rompe mai il flusso utente); `getUtmParams()`
  legge `utm_source`/`utm_medium`/`utm_campaign` dalla query string.

Persistenza: `analytics_events`
(`supabase/migrations/0003_analytics_events.sql` + fallback in-memory,
`src/lib/db/eventsRepository.ts`, stesso pattern delle altre repository).

Dove ogni evento viene emesso:

- `landing_view` / `results_viewed` — client-side al mount
  (`src/components/TrackPageView.tsx`), sulla landing e sulla pagina
  risultati (solo per audit completati).
- `audit_started` / `audit_completed` / `audit_failed` — **server-side**
  dentro `POST /api/audit`, non client-side: più affidabile (non dipende
  dal JS del client che sopravvive fino al completamento della fetch), e
  l'esito (completato/fallito) è noto solo al server. Richiede che il
  client invii `sessionId` nel body.
- `email_submitted` — server-side dentro `POST /api/leads`, stesso motivo.
- `affiliate_clicked` — server-side dentro `GET /go/[partner]`, leggendo
  `session` dalla query string del link (`AffiliateCta.tsx` lo aggiunge
  dopo il mount per evitare un mismatch di idratazione fra markup
  server e client, dato che il session id esiste solo in `localStorage`).

UTM capture: `AuditUrlForm.tsx` legge `getUtmParams()` al submit e li
invia a `POST /api/audit`, che li scrive sulle colonne
`utm_source`/`utm_medium`/`utm_campaign` di `audits` (esistevano dallo
schema di Phase 2 ma non erano mai state popolate).

Funnel in admin (`computeFunnelMetrics`, `src/features/admin/metrics.ts`):
calcola i tassi richiesti da `AI/MASTER_SPEC.md` §33 (landing→audit
avviato, audit avviato→completato, risultati→email, risultati→click
affiliato) contando gli eventi per nome — deliberatamente separato dalle
metriche di Phase 2 (`computeAdminMetrics`, che usa audit/lead/click come
denominatore totale): misurano cose diverse (funnel di un visitatore vs.
conteggi assoluti sulle tabelle di dominio) e cambiare la semantica di
una metrica già in produzione sarebbe stata una breaking change silenziosa.

Verificato end-to-end con un browser reale (Playwright, Chromium
pre-installato in questo sandbox, non aggiunto come dipendenza del
progetto): submit form → pagina risultati → cattura email → click
affiliato → login admin → dashboard con conteggi e tassi corretti.

## Deployment

Vedi `DEPLOYMENT.md` per la guida completa (variabili d'ambiente,
migration da eseguire, checklist pre-lancio). In sintesi: nessuna
decisione di hosting è vincolante — l'app è compatibile con qualsiasi
hosting Node.js che supporti Next.js (Vercel, Netlify, VPS con Node 20+,
container); non si assume Vercel come requisito, come da
`AI/MASTER_SPEC.md` §24. `proxy.ts` richiede un runtime Node.js
(supportato da Node.js server e container; non da static export). Non ci
sono job in background: tutto avviene sincronamente dentro le richieste
HTTP, coerentemente con `AI/MASTER_SPEC.md` §40.
