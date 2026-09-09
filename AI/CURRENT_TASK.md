# Current Task — SiteCheck AI

## Scopo del documento

Questo documento descrive il task operativo corrente su cui Claude Code
deve lavorare. Viene aggiornato ad ogni nuovo ciclo di sviluppo.

## Stato

Phase 3 — AI Summaries: **completata**, in attesa di feedback prima di
Phase 4 (Launch Analytics).

## Task completato

Phase 3 (`AI/MASTER_SPEC.md` §32, §9):

- [x] interfaccia `AIProvider` provider-agnostica (`src/lib/ai/types.ts`)
- [x] implementazione Anthropic (`@anthropic-ai/sdk`, modello di default
      `claude-haiku-4-5`, configurabile via `AI_PROVIDER`/`AI_API_KEY`/`AI_MODEL`)
- [x] prompt strutturato: input JSON minimale (site_score, industry,
      checks[{id, category, status}]), output JSON validato
- [x] validazione Zod dell'output AI, sia nel provider sia — di nuovo,
      centralmente — nell'orchestratore (bug trovato e corretto, vedi
      `AI/DECISIONS.md` D19)
- [x] fallback deterministico basato su template, sempre disponibile;
      l'audit non dipende mai dalla disponibilità AI
- [x] persistenza `audit_summaries` (Supabase + fallback in-memory)
- [x] UI risultati aggiornata: mostra il summary AI/deterministico e le
      priorità con titolo + motivazione
- [x] `npm run lint`, `npm run format:check`, `npm run test` (44/44),
      `npm run build` verdi
- [x] verifica end-to-end reale (senza AI configurata, percorso
      deterministico): audit contro `pypi.org` → summary e priorità
      corrette e visibili in UI
- [x] `AI/ARCHITECTURE.md` e `AI/DECISIONS.md` aggiornati

## Nota

Il percorso con provider Anthropic reale non è stato verificato con una
chiamata effettiva all'API (nessuna `ANTHROPIC_API_KEY` di prodotto
disponibile in questa sessione di sviluppo) — solo per lettura del codice
e test unitari con provider mockato. Prima del primo deploy con
`AI_PROVIDER=anthropic` attivo, eseguire almeno un audit reale con la
chiave impostata e verificare che `audit_summaries.provider` /
`audit_summaries.model` riportino `"anthropic"` / il modello configurato,
e che il testo generato sia sensato.

## Prossimo task consigliato

Phase 4 — Launch Analytics (`AI/MASTER_SPEC.md` §32, §14):

- tracking eventi interni: `landing_view`, `audit_started`,
  `audit_completed`, `audit_failed`, `results_viewed`, `email_submitted`,
  `affiliate_clicked`
- tabella `analytics_events` (Supabase + fallback in-memory, stesso
  pattern delle altre repository)
- cattura UTM (`utm_source`, `utm_medium`, `utm_campaign`) — i campi
  esistono già su `audits` ma non sono ancora popolati
- metriche di conversione in admin dashboard: landing→audit start,
  audit start→completion, results→email capture, results→affiliate click
- documentazione di deployment in produzione

In attesa di feedback esplicito prima di iniziare Phase 4.
