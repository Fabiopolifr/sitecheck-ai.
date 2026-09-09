# Deployment — SiteCheck AI

Guida per portare SiteCheck AI in produzione. Vedi `AI/ARCHITECTURE.md`
per i dettagli implementativi di ogni componente citato qui.

## Requisiti dell'hosting

L'app è un progetto Next.js 16 standard (App Router). Non richiede nulla
di esotico — qualunque hosting che soddisfi questi requisiti va bene
(Vercel, Netlify, un VPS con Node, un container):

- **Node.js 20+** in esecuzione lato server (non è compatibile con
  export statico: usa route handler dinamici, `proxy.ts` e pagine
  server-rendered).
- **Nessun job/worker in background**: tutto avviene sincronamente
  dentro le richieste HTTP (audit, generazione summary AI, invio email).
  Non serve un sistema di code.
- **Nessuno storage persistente su filesystem locale**: tutto lo stato
  vive su Supabase (quando configurato) o in memoria di processo. Un
  hosting stateless/serverless va bene, con l'unico caveat che senza
  Supabase configurato i dati in memoria non sopravvivono a un riavvio o
  a più istanze — per questo **Supabase è fortemente raccomandato in
  produzione**, non solo opzionale come in sviluppo.
- **`proxy.ts` richiede runtime Node.js**: supportato da hosting Node
  standard e container; non da adapter edge-only.

## Variabili d'ambiente

Vedi `.env.example` per l'elenco completo. Minimo raccomandato per un
lancio reale (oltre a quanto già funziona senza configurazione):

```env
# Persistenza reale — vedi README "Configurazione Supabase"
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Dashboard admin
ADMIN_PASSWORD=

# URL pubblico dell'app (usato nei link delle email)
APP_URL=https://tuodominio.it
```

Opzionali ma consigliate appena il budget lo permette:

```env
# Riassunto AI dei risultati (fallback deterministico se assente)
AI_PROVIDER=anthropic
AI_API_KEY=
AI_MODEL=claude-haiku-4-5

# Email transazionale reale (altrimenti solo loggata in console)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=
EMAIL_FROM=

# Performance reale via Google PageSpeed Insights (altrimenti fallback
# al tempo di risposta interno)
PAGESPEED_API_KEY=

# Affiliato CookieYes
COOKIEYES_AFFILIATE_URL=

# Content engine — scheduler esterno per POST /api/content/generate
CONTENT_GENERATION_SECRET=
```

**Mai** committare valori reali di queste variabili nel repository.
`SUPABASE_SERVICE_ROLE_KEY` in particolare ha accesso completo al
database e bypassa la Row Level Security — trattalo come una password di
root.

## Checklist pre-lancio

1. **Build pulita**: `npm ci && npm run lint && npm run test && npm run build`
   devono passare senza errori.
2. **Migration Supabase**: esegui in ordine tutti i file in
   `supabase/migrations/` (attualmente `0001_init.sql`, poi
   `0002_audit_summaries.sql`, poi `0003_analytics_events.sql`, poi
   `0004_content_engine.sql`) sul progetto Supabase di produzione,
   tramite il SQL Editor o la CLI Supabase. Verifica che le tabelle
   abbiano RLS abilitata (le migration la abilitano già) e nessuna
   policy pubblica: l'unico accesso previsto è tramite la service role
   key lato server.
3. **`ADMIN_PASSWORD`**: imposta una password robusta, diversa da quella
   usata in sviluppo. La dashboard `/admin` è protetta da un singolo
   cookie firmato HMAC — non è un sistema multi-utente (vedi
   `AI/DECISIONS.md` D15 per il perché di questa scelta invece di
   Supabase Auth in questa fase).
4. **Smoke test manuale post-deploy**: esegui un audit reale contro un
   sito pubblico, verifica che la pagina risultati mostri uno score e un
   riassunto, invia un'email di test dal form di cattura lead, e apri
   `/admin` per controllare che le metriche si aggiornino.
5. **Se `AI_PROVIDER=anthropic` è attivo**: verifica che
   `audit_summaries.provider` riporti `"anthropic"` (non
   `"deterministic"`) dopo un audit reale — un fallback silenzioso a
   `"deterministic"` indica una chiave API non valida o un problema di
   rete verso l'API Anthropic (questa condizione non blocca l'audit, ma
   va investigata).
6. **Rate limiting**: gli endpoint pubblici (`/api/audit`, `/api/leads`,
   `/api/events`, `/api/admin/login`) hanno un rate limit in-memory per
   IP (vedi `src/lib/security/rateLimit.ts`). Su un hosting con più
   istanze/repliche, il limite è per-istanza, non globale — accettabile
   per il volume di traffico atteso in questa fase; da rivedere se il
   traffico cresce (es. store condiviso Redis).
7. **Content engine (opzionale)**: se `CONTENT_GENERATION_SECRET` è
   impostato, configura uno scheduler esterno (Vercel Cron o
   equivalente) che chiami `POST /api/content/generate` con header
   `x-content-secret`, secondo la cadenza desiderata (l'app stessa non
   pianifica nulla). I post generati restano in coda su
   `/admin/content`: la pubblicazione reale avviene tramite il flusso
   Claude Code + Metricool esistente, non automaticamente.

## Cosa NON è ancora pronto per un lancio ad alto traffico

- Nessuna vera coda per l'invio email o la generazione AI: se uno di
  questi step è lento, allunga la risposta di `POST /api/audit`. Con
  Haiku 4.5 e Resend la latenza aggiuntiva è tipicamente contenuta, ma
  vale la pena monitorarla.
- Il rate limiter è per-istanza (vedi sopra).
- Nessun sistema di cache per audit ripetuti sullo stesso URL — ogni
  richiesta rifà fetch + parsing + detector da zero.

Nessuno di questi è un blocco per un lancio in piccola scala (coerente
col budget e l'obiettivo "lean" di `AI/MASTER_SPEC.md` §1); sono punti
da rivedere se il traffico cresce sensibilmente.
