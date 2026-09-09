# Changelog AI — SiteCheck AI

## Scopo del documento

Questo documento registra tutte le modifiche significative apportate al
progetto da Claude Code, task dopo task.

## Stato

Phase 2 — Persistence + Leads + Affiliate completata.

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
