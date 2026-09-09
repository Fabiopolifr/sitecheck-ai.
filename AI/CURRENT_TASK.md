# Current Task — SiteCheck AI

## Scopo del documento

Questo documento descrive il task operativo corrente su cui Claude Code
deve lavorare. Viene aggiornato ad ogni nuovo ciclo di sviluppo.

## Stato

Phase 5 — Content Engine: **completata come infrastruttura**. Nessuna
approvazione richiesta prima di procedere era stata posta come gate
esplicito da questa fase (a differenza delle Phase 1–4): la spec stessa
(§15) prevede un funzionamento a zero dati reali (modalità evergreen).

## Task completato

Phase 5 (`AI/MASTER_SPEC.md` §15–§19):

- [x] soglia minima campione (n=30) per statistiche derivate da dati
      reali, mai bypassata (`computeCookieConsentInsight`)
- [x] libreria di contenuti evergreen, uno o più per ciascuno dei sei
      formati (§16), nessuna statistica inventata (verificato anche da
      test dedicato)
- [x] cadenza settimanale di esempio da §16 (lun. Data Insight, mer.
      Educational, ven. Conversione)
- [x] pipeline di generazione: seleziona insight reale se disponibile,
      altrimenti evergreen — mai il contrario
- [x] persistenza `content_insights`, `content_posts`,
      `content_publications` (Supabase + fallback in-memory)
- [x] endpoint `POST /api/content/generate`, pensato per uno scheduler
      esterno (Vercel Cron o simile), protetto da secret
- [x] interfaccia `SocialPublisher` (§17); implementazione di default
      "queue-only" — nessuna integrazione HTTP diretta con Metricool
      indovinata senza documentazione API confermata (vedi
      `AI/DECISIONS.md` D27)
- [x] pagina admin di sola lettura `/admin/content` per la coda
- [x] 60 test totali (10 nuovi: soglia campione, selezione evergreen vs
      insight, integrità statistiche, scheduling settimanale)
- [x] `npm run lint`, `npm run format:check`, `npm run test` (60/60),
      `npm run build` verdi
- [x] verifica end-to-end reale: generazione forzata sotto soglia →
      evergreen confermato in coda; poi 30 audit reali inviati
      attraverso l'endpoint pubblico (rispettando il rate limit,
      comportamento confermato corretto) → rigenerazione dello stesso
      tipo → post basato su insight reale confermato in coda
- [x] `AI/ARCHITECTURE.md` e `AI/DECISIONS.md` aggiornati

## Deliberatamente non implementato in questa fase

- **Rendering PNG delle creative** (§18): nessuna nuova dipendenza di
  rendering (Playwright/Puppeteer/Satori/Sharp) aggiunta finché non c'è
  contenuto reale da pubblicare che la richieda (`AI/DECISIONS.md` D28).
- **Integrazione HTTP diretta con l'API Metricool**: il setup di
  pubblicazione esistente dell'owner (Metricool, via i tool MCP di
  Claude Code e la skill `carosello-freesbe`) resta il meccanismo di
  pubblicazione reale; l'app genera e mette in coda, non pubblica da
  sola (`AI/DECISIONS.md` D27).

## Prossimo task consigliato

Non Phase 6 (SEO Engine) o Phase 7 (Ads Engine) — `AI/MASTER_SPEC.md`
§32 le marca esplicitamente "deliver later", da valutare solo dopo il
lancio e con dati di conversione reali.

Il lavoro applicativo utile ora è operativo, non di sviluppo:

1. **Deploy reale** seguendo `DEPLOYMENT.md`.
2. **Raccolta di traffico reale** verso l'audit engine.
3. Quando `content_insights` inizia a produrre insight reali (n≥30),
   **usare il flusso Claude Code + Metricool esistente** per pubblicare
   effettivamente i contenuti in coda su `/admin/content` — questo è un
   task operativo ricorrente, non una modifica al codice.
4. Chiudere i gap di verifica noti (Supabase live, provider Anthropic
   reale) al primo deploy.

In attesa di indicazioni sull'owner su come procedere.
