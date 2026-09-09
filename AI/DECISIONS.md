# Decisions — SiteCheck AI

## Scopo del documento

Questo documento registra le decisioni architetturali e di prodotto già
prese durante lo sviluppo di SiteCheck AI, con relative motivazioni.

## Stato

Phase 0 — Foundation completata.

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
