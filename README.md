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
- Supabase (`@supabase/supabase-js`) — opzionale in sviluppo, fallback
  automatico su store in-memory se non configurato
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

## Configurazione Supabase (persistenza reale)

Per abilitare la persistenza reale:

1. Crea un progetto su [supabase.com](https://supabase.com) (free tier).
2. Nel SQL Editor del progetto, esegui il contenuto di
   `supabase/migrations/0001_init.sql`.
3. In `.env.local`, imposta:
   ```env
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service role key, non la anon key>
   ```
4. Riavvia l'app: da questo momento audit, lead e click affiliati
   vengono scritti su Postgres. `SUPABASE_SERVICE_ROLE_KEY` è un segreto
   con accesso completo al database — non esporlo mai al client, non
   committarlo, non usarlo in codice che gira nel browser.

## Configurazione admin

La dashboard `/admin` richiede `ADMIN_PASSWORD` in `.env.local` (minimo 8
caratteri). Senza questa variabile, `/admin` reindirizza sempre al login
e nessuna password verrà mai accettata.

## Configurazione affiliato CookieYes

Per attivare il redirect `/go/cookieyes`, imposta
`COOKIEYES_AFFILIATE_URL` in `.env.local` con il link di affiliazione
reale. Senza questa variabile la rotta risponde 404 invece di reindirizzare
verso un URL non configurato.

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
