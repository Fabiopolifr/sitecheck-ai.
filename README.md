# SiteCheck AI

Analisi tecnica automatizzata del sito web per agenzie immobiliari (e, in
futuro, altri settori): cookie/consent, privacy, tracking, SEO e
performance, con un Site Score sintetico.

Vedi `AI/MASTER_SPEC.md` per la specifica completa di prodotto,
`AI/ARCHITECTURE.md` per l'architettura tecnica aggiornata e
`DEPLOYMENT.md` per la guida al deploy in produzione.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript (strict)
- Tailwind CSS v4
- Zod (validazione env/schema)
- PostgreSQL (`pg`, self-managed — es. su un VPS Hostinger) — opzionale
  in sviluppo, fallback automatico su store in-memory se non configurato
- `@anthropic-ai/sdk` — opzionale, fallback deterministico se non
  configurato
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

L'app funziona anche senza configurare nulla in `.env.local`: audit,
lead ed eventi affiliati vengono salvati in memoria (non persistono al
riavvio) e le email vengono solo loggate in console. Utile per sviluppo
locale rapido.

## Configurazione PostgreSQL (persistenza reale)

L'app parla Postgres puro (via `pg`, nessun client proprietario): va bene
qualunque istanza, inclusa una self-managed su un VPS Hostinger. Per la
guida completa al deploy su Hostinger vedi `DEPLOYMENT.md`.

Per abilitare la persistenza reale in locale/sviluppo:

1. Avvia un Postgres (locale, Docker, o un'istanza remota).
2. Esegui in ordine tutti i file in `migrations/` (`0001_init.sql`,
   `0002_audit_summaries.sql`, `0003_analytics_events.sql`,
   `0004_content_engine.sql`), ad esempio:
   ```bash
   for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
   ```
3. In `.env.local`, imposta:
   ```env
   DATABASE_URL=postgres://user:password@host:5432/sitecheck_ai
   ```
4. Riavvia l'app: da questo momento audit, lead e click affiliati
   vengono scritti su Postgres. `DATABASE_URL` contiene le credenziali del
   database — non esporlo mai al client, non committarlo.

## Configurazione admin

La dashboard `/admin` richiede `ADMIN_PASSWORD` in `.env.local` (minimo 8
caratteri). Senza questa variabile, `/admin` reindirizza sempre al login
e nessuna password verrà mai accettata.

## Configurazione affiliato CookieYes

Per attivare il redirect `/go/cookieyes`, imposta
`COOKIEYES_AFFILIATE_URL` in `.env.local` con il link di affiliazione
reale. Senza questa variabile la rotta risponde 404 invece di reindirizzare
verso un URL non configurato.

## Configurazione AI (riassunto audit)

Senza configurazione, ogni audit riceve comunque un riassunto e delle
priorità, generati da un template deterministico (nessuna chiamata
esterna). Per usare Claude al posto del template:

```env
AI_PROVIDER=anthropic
AI_API_KEY=<chiave API Anthropic>
AI_MODEL=claude-haiku-4-5
```

`AI_MODEL` è opzionale (default `claude-haiku-4-5`, il modello Claude più
economico disponibile). Se la chiamata AI fallisce per qualunque motivo
(rete, output non valido), l'app ricade automaticamente sul template
deterministico — non è mai un punto di rottura.

## Content engine (Phase 5)

`POST /api/content/generate` genera un post per la coda contenuti
(`/admin/content`), protetto da header `x-content-secret`:

```env
CONTENT_GENERATION_SECRET=<genera con `openssl rand -hex 32`>
```

Senza dati reali sufficienti (minimo 30 audit completati), il contenuto
generato è evergreen (scritto a mano, nessuna statistica). Superata la
soglia, i post di tipo "Data Insight" usano dati reali aggregati.
L'endpoint è pensato per essere chiamato da uno scheduler esterno
(Vercel Cron o simile) — l'app non esegue job in background da sola.

La pubblicazione effettiva sui social avviene tramite il flusso Claude
Code + Metricool già in uso dall'owner, non da questa app: la coda
contenuti prepara i testi, la pubblicazione resta un passo manuale/
agent-assistito (vedi `AI/DECISIONS.md` D27).

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
