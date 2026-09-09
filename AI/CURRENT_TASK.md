# Current Task — SiteCheck AI

## Scopo del documento

Questo documento descrive il task operativo corrente su cui Claude Code
deve lavorare. Viene aggiornato ad ogni nuovo ciclo di sviluppo.

## Stato

Phase 1 — Audit Engine: **completata**, in attesa di feedback prima di
Phase 2 (Persistence + Leads + Affiliate).

## Task completato

Phase 1 — Audit Engine (`AI/MASTER_SPEC.md` §32):

- [x] form URL collegato a un endpoint reale (`POST /api/audit`)
- [x] normalizzazione URL (`src/features/audit/url.ts`)
- [x] protezione SSRF con validazione IP post-DNS e pinning del socket
      (`src/lib/security/ssrf.ts`, `src/lib/security/safeFetch.ts`)
- [x] fetcher sicuro: timeout, limite dimensione risposta, limite redirect,
      gestione manuale dei redirect con nuova validazione SSRF ad ogni hop
- [x] rate limiting per IP sull'endpoint di audit
      (`src/lib/security/rateLimit.ts`)
- [x] detector modulari: technical, SEO, privacy, cookie/consent, tracking,
      performance (con fallback se `PAGESPEED_API_KEY` non è configurata),
      forms (informativo)
- [x] calcolo score per categoria e Site Score totale
      (`src/features/audit/scoring.ts`)
- [x] UI risultati con progressive disclosure, 3 priorità principali,
      wording italiano non-legale conforme a `AI/MASTER_SPEC.md` §5
- [x] persistenza mock in-memory (`src/lib/db/memoryAuditStore.ts`)
- [x] test unitari: normalizzazione URL, SSRF guard, scoring, un detector
      (37 test totali)
- [x] `npm run lint`, `npm run format:check`, `npm run test`,
      `npm run build` verdi
- [x] verifica end-to-end reale: audit contro `https://pypi.org` (sito
      pubblico reale, raggiungibile dall'ambiente sandbox di sviluppo) →
      Site Score 72/100, banda "Buono", breakdown per categoria coerente
- [x] verifica SSRF: `127.0.0.1`, `localhost`, `169.254.169.254`
      (metadata endpoint cloud), `192.168.1.1` bloccati correttamente,
      producono un audit con stato "failed" invece di eseguire la richiesta
- [x] `AI/ARCHITECTURE.md` e `AI/DECISIONS.md` aggiornati

## Nota tecnica

Il test end-to-end contro un vero sito pubblico non è stato eseguito
contro un dominio arbitrario a scelta: l'ambiente di sviluppo di questa
sessione instrada l'uscita HTTPS attraverso un proxy con allowlist
ristretta (registry pacchetti, GitHub, API Anthropic). `pypi.org` è
servito HTML reale ed è nell'allowlist, quindi è stato usato come sito
pubblico reale per la verifica end-to-end. Questo è un vincolo
dell'ambiente di sviluppo, non del codice: su un hosting di produzione
normale (senza egress proxy ristretto) l'audit funziona contro qualunque
URL pubblico passi la validazione SSRF.

## Prossimo task consigliato

Phase 2 — Persistence + Leads + Affiliate (`AI/MASTER_SPEC.md` §32):

- integrazione PostgreSQL/Supabase, sostituendo `memoryAuditStore`
- persistenza reale della tabella `audits` (e `audit_checks`)
- cattura lead (email) con consenso marketing separato dal servizio
- adapter email transazionale (Resend o equivalente, con modalità mock)
- redirect affiliato tracciato (`/go/[partner]`, inizialmente CookieYes)
- dashboard admin di base (audit totali, lead, click affiliati)

In attesa di feedback esplicito prima di iniziare Phase 2.
