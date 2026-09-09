# SiteCheck AI

Analisi tecnica automatizzata del sito web per agenzie immobiliari (e, in
futuro, altri settori): cookie/consent, privacy, tracking, SEO e
performance, con un Site Score sintetico.

Vedi `AI/MASTER_SPEC.md` per la specifica completa di prodotto e
`AI/ARCHITECTURE.md` per l'architettura tecnica aggiornata.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript (strict)
- Tailwind CSS v4
- Zod (validazione env/schema)
- Vitest (test)
- ESLint + Prettier

## Requisiti

- Node.js 20+
- npm

## Setup

```bash
npm install
cp .env.example .env.local
```

## Comandi

```bash
npm run dev           # avvia il server di sviluppo su http://localhost:3000
npm run build          # build di produzione
npm run start          # avvia il build di produzione
npm run lint           # ESLint
npm run format         # Prettier — scrive
npm run format:check   # Prettier — verifica
npm run test           # Vitest
```

## Struttura del progetto

Vedi `AI/ARCHITECTURE.md` per la struttura dettagliata e le decisioni
architetturali.

## Sviluppo AI-assistito

Questo repository è sviluppato con Claude Code come sviluppatore
principale. Le regole operative sono in `CLAUDE.md`; lo stato del
progetto è tracciato in `AI/CURRENT_TASK.md`, `AI/ARCHITECTURE.md`,
`AI/DECISIONS.md` e `AI/CHANGELOG_AI.md`.
