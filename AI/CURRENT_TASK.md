# Current Task — SiteCheck AI

## Scopo del documento

Questo documento descrive il task operativo corrente su cui Claude Code
deve lavorare. Viene aggiornato ad ogni nuovo ciclo di sviluppo.

## Stato

Phase 0 — Foundation: **completata**, in attesa di approvazione per
Phase 1 (Audit Engine).

## Task completato

Phase 0 — Foundation (`AI/MASTER_SPEC.md` §32, §47):

- [x] repository ispezionato (repo GitHub vuoto all'avvio)
- [x] file spec canonico consolidato in `AI/MASTER_SPEC.md`
- [x] progetto Next.js 16 + TypeScript strict inizializzato
- [x] ESLint configurato (flat config, `eslint-config-next`)
- [x] Prettier configurato
- [x] validazione env centralizzata con Zod (`src/lib/config/env.ts`)
- [x] `.env.example` creato
- [x] struttura modulare del progetto stabilita (`src/features/*`, `src/lib/*`)
- [x] landing page shell (statica, non funzionale) creata
- [x] `AI/ARCHITECTURE.md` aggiornato
- [x] `AI/DECISIONS.md` aggiornato
- [x] `npm install`, `npm run lint`, `npm run test`, `npm run build` verdi
- [x] app verificata in `next dev` (HTTP 200 sulla home)
- [x] commit della foundation

## Prossimo task consigliato

Phase 1 — Audit Engine (`AI/MASTER_SPEC.md` §32):

- form URL collegato a un endpoint reale
- normalizzazione URL
- protezione SSRF (`src/lib/security/`)
- fetcher sicuro (timeout, limite dimensione risposta, limite redirect)
- detector modulari (`src/features/audit/`) per technical/SEO/privacy/
  cookie-consent/tracking/forms/performance
- calcolo score per sezione e Site Score totale
- UI risultati (progressive disclosure come da §37)
- persistenza locale/mock (Supabase non ancora richiesto in questa fase)

In attesa di approvazione esplicita prima di iniziare, come richiesto da
`AI/MASTER_SPEC.md` §47 ("Then wait for approval before Phase 1").
