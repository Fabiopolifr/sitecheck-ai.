# Current Task — SiteCheck AI

## Scopo del documento

Questo documento descrive il task operativo corrente su cui Claude Code
deve lavorare. Viene aggiornato ad ogni nuovo ciclo di sviluppo.

## Stato

Phase 2 — Persistence + Leads + Affiliate: **completata**, in attesa di
feedback prima di Phase 3 (AI Summaries).

## Task completato

Phase 2 (`AI/MASTER_SPEC.md` §32):

- [x] integrazione Supabase (`@supabase/supabase-js`, client service-role
      server-only) con fallback automatico su store in-memory quando non
      configurata
- [x] schema SQL (`supabase/migrations/0001_init.sql`): `audits`,
      `audit_checks`, `leads`, `affiliate_clicks`, RLS abilitata senza
      policy pubbliche
- [x] persistenza reale degli audit (`src/lib/db/auditsRepository.ts`)
- [x] cattura lead con consenso marketing separato dal servizio
      (`POST /api/leads`, `src/components/EmailCaptureForm.tsx`)
- [x] adapter email provider-agnostico (`src/lib/email/`): Resend +
      mock/dev di default
- [x] redirect affiliato generico e tracciato (`GET /go/[partner]`,
      partner `cookieyes` configurato via `COOKIEYES_AFFILIATE_URL`)
- [x] CTA affiliato sui risultati quando Cookie & Consent ha criticità
- [x] dashboard admin (`/admin`) con metriche aggregate: audit totali/
      oggi/7gg, score medio, lead, tasso cattura email, click affiliati,
      CTR, problemi e tecnologie più rilevate, audit recenti
- [x] autenticazione admin: password singola + cookie firmato HMAC,
      gate applicato da `src/proxy.ts` (convenzione Next.js 16, sostituisce
      `middleware.ts` deprecato)
- [x] `npm run lint`, `npm run format:check`, `npm run test` (37/37),
      `npm run build` verdi
- [x] verifica end-to-end reale (store in-memory, senza Supabase):
      audit → lead capture → email mock → redirect affiliato con UTM →
      dashboard admin con numeri corretti
- [x] bug di sicurezza trovato e corretto durante il testing: il matcher
      del proxy non proteggeva `/admin` nudo (solo `/admin/*`) — vedi
      `AI/DECISIONS.md` D17
- [x] `AI/ARCHITECTURE.md` e `AI/DECISIONS.md` aggiornati

## Nota

Non essendo disponibile un progetto Supabase live in questa sessione di
sviluppo, l'integrazione Supabase non è stata verificata contro un
database reale — solo tramite lettura del codice e coerenza dello schema
SQL con le query. Prima del primo deploy con Supabase attivo, eseguire la
migration (`supabase/migrations/0001_init.sql`) sul progetto reale e
verificare un ciclo audit→lead→affiliato→dashboard end-to-end.

## Prossimo task consigliato

Phase 3 — AI Summaries (`AI/MASTER_SPEC.md` §32, §9):

- interfaccia `AIProvider` provider-agnostica
- configurazione modello economico via env (`AI_PROVIDER`, `AI_API_KEY`,
  `AI_MODEL`)
- prompt strutturato: input JSON (site_score, industry, checks), output
  JSON validato (summary + top_priorities)
- fallback deterministico a template se la chiamata AI fallisce o non è
  configurata (l'audit non deve mai dipendere dalla disponibilità AI)
- persistenza in `audit_summaries`

In attesa di feedback esplicito prima di iniziare Phase 3.
