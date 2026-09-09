# Architecture — SiteCheck AI

## Scopo del documento

Questo documento descrive l'architettura tecnica aggiornata del progetto
SiteCheck AI: stack, componenti principali, flussi dati e integrazioni
esterne. Va aggiornato ogni volta che l'architettura cambia.

## Stato

Phase 0 — Foundation completata.

## Stack tecnologico

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Linguaggio:** TypeScript 5, `strict: true`
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Validazione env / schema:** Zod
- **Lint:** ESLint 9 (flat config, `eslint-config-next`)
- **Formattazione:** Prettier 3
- **Test:** Vitest 4 (runner `node`, alias `@/*` → `src/*`)
- **Package manager:** npm (lockfile `package-lock.json`)
- **Database (deciso, non ancora implementato):** PostgreSQL via Supabase
  (vedi `AI/DECISIONS.md`)

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
│   ├── app/                # Next.js App Router (landing page, layout, globals.css)
│   ├── components/         # Componenti UI generici e riutilizzabili
│   ├── features/           # Logica di business divisa per dominio
│   │   ├── audit/          # Motore di audit (Phase 1)
│   │   ├── affiliate/      # Tracking e redirect affiliati (Phase 2)
│   │   ├── leads/          # Cattura email (Phase 2)
│   │   ├── analytics/      # Eventi interni (Phase 4)
│   │   ├── admin/          # Dashboard amministrativa (Phase 2)
│   │   └── content/        # Motore contenuti automatico (Phase 5)
│   └── lib/
│       ├── config/         # Configurazione centralizzata (env.ts)
│       ├── db/             # Accesso al database (Phase 2)
│       ├── ai/             # Layer AI provider-agnostico (Phase 3)
│       └── security/       # SSRF guard, validazione, rate limiting (Phase 1)
├── scripts/                # Script operativi futuri
├── tests/                  # Test Vitest
├── public/                 # Asset statici
├── .env.example
├── CLAUDE.md
└── README.md
```

Questa struttura ricalca la proposta in `AI/MASTER_SPEC.md` §25. Le
cartelle non ancora popolate contengono un file `.gitkeep` per preservare
la struttura in git fino all'implementazione delle relative feature.

## Configurazione ambiente

`src/lib/config/env.ts` centralizza la lettura e validazione (Zod) delle
variabili d'ambiente elencate in `.env.example`. In questa fase tutte le
variabili sono opzionali perché nessuna feature runtime (DB, AI, email,
performance API) è ancora implementata: l'obiettivo di Phase 0 è avere lo
schema pronto, non bloccare build/dev in assenza di credenziali. Quando
una feature diventa dipendente da una variabile, il relativo campo dovrà
diventare obbligatorio nello schema.

## Landing page (shell)

`src/app/page.tsx` implementa la struttura descritta in `AI/MASTER_SPEC.md`
§36 (Hero, Cosa controlliamo, Come funziona, CTA finale) in modo
completamente statico. Il form URL (`src/components/AuditUrlForm.tsx`) è
un client component che intercetta il submit e mostra un messaggio
placeholder: il motore di audit reale sarà collegato in Phase 1.

## Deployment

Nessuna decisione di hosting è ancora vincolante: l'app è compatibile con
qualsiasi hosting Node.js che supporti Next.js (Vercel, Netlify, VPS con
Node 20+, container). Non si assume Vercel come requisito, come da
`AI/MASTER_SPEC.md` §24.
