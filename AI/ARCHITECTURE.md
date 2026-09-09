# Architecture — SiteCheck AI

## Scopo del documento

Questo documento descrive l'architettura tecnica aggiornata del progetto
SiteCheck AI: stack, componenti principali, flussi dati e integrazioni
esterne. Va aggiornato ogni volta che l'architettura cambia.

## Stato

Phase 1 — Audit Engine completata.

## Stack tecnologico

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Linguaggio:** TypeScript 5, `strict: true`
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Validazione env / schema:** Zod
- **Parsing HTML:** Cheerio
- **HTTP client con controllo socket-level:** undici (`Agent` con `connect.lookup`
  personalizzato, per il pinning DNS anti-SSRF-rebinding)
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

## Deployment

Nessuna decisione di hosting è ancora vincolante: l'app è compatibile con
qualsiasi hosting Node.js che supporti Next.js (Vercel, Netlify, VPS con
Node 20+, container). Non si assume Vercel come requisito, come da
`AI/MASTER_SPEC.md` §24.
