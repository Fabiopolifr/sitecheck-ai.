# Current Task — SiteCheck AI

## Scopo del documento

Questo documento descrive il task operativo corrente su cui Claude Code
deve lavorare. Viene aggiornato ad ogni nuovo ciclo di sviluppo.

## Stato

Phase 4 — Launch Analytics: **completata**. Le fasi 0–4 di
`AI/MASTER_SPEC.md` §32 (l'intero MVP v1, §4) sono ora implementate.

## Task completato

Phase 4 (`AI/MASTER_SPEC.md` §32, §14, §33):

- [x] vocabolario eventi fisso e validato (`landing_view`,
      `audit_started`, `audit_completed`, `audit_failed`,
      `results_viewed`, `email_submitted`, `affiliate_clicked`)
- [x] tabella `analytics_events` (Supabase + fallback in-memory)
- [x] tracker client (`localStorage`, fire-and-forget, non blocca mai il
      flusso utente) per gli eventi di pagina
- [x] eventi lifecycle audit/lead/affiliato loggati server-side (più
      affidabile del client-side — vedi `AI/DECISIONS.md` D22)
- [x] cattura UTM (`utm_source`/`utm_medium`/`utm_campaign`) dalla
      landing fino alla persistenza su `audits`
- [x] metriche di funnel in admin dashboard: landing→audit avviato,
      audit avviato→completato, risultati→email, risultati→click
      affiliato
- [x] `DEPLOYMENT.md`: guida al deploy in produzione (env var, migration,
      checklist pre-lancio, limiti noti)
- [x] 50 test totali (6 nuovi per schema eventi + calcolo funnel)
- [x] `npm run lint`, `npm run format:check`, `npm run test` (50/50),
      `npm run build` verdi
- [x] verifica end-to-end con browser reale (Playwright/Chromium,
      installato temporaneamente solo per il QA, non nel progetto):
      submit form → risultati → cattura email → click affiliato → login
      admin → dashboard con conteggi e tassi di conversione corretti
- [x] `AI/ARCHITECTURE.md` e `AI/DECISIONS.md` aggiornati

## Stato del prodotto

Con Phase 4 completa, l'MVP v1 descritto in `AI/MASTER_SPEC.md` §4 è
implementato nella sua interezza: landing, audit engine, Site Score,
risultati, cattura email, persistenza, redirect affiliato + CTA
CookieYes, dashboard admin, eventi analytics di base, e readiness al
deploy in produzione (documentata, non ancora eseguita).

## Nota

Come per le fasi precedenti, due percorsi restano verificati solo per
lettura del codice/test unitari, non con servizi esterni reali in questo
sandbox di sviluppo: Supabase (nessun progetto live disponibile) e il
provider Anthropic reale (nessuna `ANTHROPIC_API_KEY` di prodotto).
`DEPLOYMENT.md` include i passi di smoke test da eseguire al primo deploy
reale per colmare questi due gap.

## Prossimo task consigliato

L'MVP v1 è completo. Le fasi successive di `AI/MASTER_SPEC.md` sono
esplicitamente posteriori al lancio:

- **Phase 5 — Content Engine**: da iniziare solo dopo aver raccolto dati
  reali da audit (§15: soglia minima campione n=30 prima di pubblicare
  statistiche derivate).
- **Phase 6 — SEO Engine** e **Phase 7 — Ads Engine**: esplicitamente
  "deliver later" in `AI/MASTER_SPEC.md` §32.

Il passo più naturale ora non è una fase nuova, ma: (1) deploy reale
seguendo `DEPLOYMENT.md`, (2) raccolta di traffico/dati reali, (3)
verifica dei due gap noti (Supabase live, provider Anthropic reale) in
produzione. In attesa di indicazioni sull'owner su come procedere.
