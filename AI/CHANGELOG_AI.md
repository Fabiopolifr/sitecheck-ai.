# Changelog AI — SiteCheck AI

## Scopo del documento

Questo documento registra tutte le modifiche significative apportate al
progetto da Claude Code, task dopo task.

## Stato

Phase 0 — Foundation completata.

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
