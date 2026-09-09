# Decisions — SiteCheck AI

## Scopo del documento

Questo documento registra le decisioni architetturali e di prodotto già
prese durante lo sviluppo di SiteCheck AI, con relative motivazioni.

## Stato

Phase 1 — Audit Engine completata.

## Decisioni

### D1 — Stack: Next.js + TypeScript + Tailwind CSS

**Decisione:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
strict, Tailwind CSS v4.

**Motivazione:** stack raccomandato in `AI/MASTER_SPEC.md` §24, moderno,
ampio supporto hosting Node-compatibile, buon rapporto produttività/costo
zero (nessuna licenza), community e tooling maturi.

### D2 — File spec canonico spostato in `AI/MASTER_SPEC.md`

**Decisione:** il file `SiteCheck_AI_MASTER_SPEC.md` caricato da ChatGPT
nella root del repository è stato spostato in `AI/MASTER_SPEC.md`.

**Motivazione:** `CLAUDE.md` indica esplicitamente `AI/MASTER_SPEC.md`
come posizione canonica della specifica di prodotto. Mantenere due copie
avrebbe creato rischio di disallineamento.

### D3 — Database: PostgreSQL via Supabase (decisione preliminare)

**Decisione:** per la persistenza (Phase 2) si userà PostgreSQL, con
Supabase come provider preferito (DB gestito + Auth + free tier).

**Motivazione:** indicazione esplicita in `AI/MASTER_SPEC.md` §10, budget
iniziale ridotto (~€100), necessità di Auth semplice per l'admin (§13) e
riduzione del tempo di sviluppo. L'accesso al DB sarà comunque isolato in
`src/lib/db/` per mantenere portabilità verso un Postgres self-hosted se
necessario in futuro.

**Nota:** nessuna integrazione Supabase è stata implementata in Phase 0.
Questa è una decisione di indirizzo per Phase 2.

### D4 — Environment validation con Zod, tutti i campi opzionali in Phase 0

**Decisione:** `src/lib/config/env.ts` valida `process.env` con uno schema
Zod centralizzato. In Phase 0 tutti i campi sono `optional()`.

**Motivazione:** nessuna feature che dipende da queste variabili
(DB, AI provider, email, PageSpeed, affiliate) è ancora implementata;
rendere i campi obbligatori ora avrebbe bloccato build/dev senza motivo.
Lo schema andrà reso più stringente (campi required) via via che le
feature vengono collegate nelle fasi successive — da tracciare in questo
stesso documento quando accade.

### D5 — Branch di lavoro: nessun push diretto su `main`

**Decisione:** durante Phase 0 tutto il lavoro resta sul branch
`claude/sitecheck-ai-setup-xfrrbo`. Non è stato creato/forzato un branch
`main` separato.

**Motivazione:** `AI/MASTER_SPEC.md` §47 suggerisce di "stabilire `main`
come branch primario durevole se praticabile", ma la policy operativa di
questa sessione vieta di pushare su branch diversi da quello designato
senza autorizzazione esplicita. La promozione a `main` avverrà tramite
merge/PR quando l'owner lo deciderà.

### D6 — Test runner: Vitest (bump a 4.1.11 per fix di sicurezza)

**Decisione:** Vitest è stato aggiunto come test runner. La versione è
pinnata a `^4.1.11` invece di `^3`.

**Motivazione:** `vitest@3.2.7` (installato inizialmente da
`create-next-app`-style setup) dipendeva da una versione vulnerabile di
`@vitest/mocker` (GHSA-82fw-gwwq-j7x9, path traversal / lettura file
arbitraria nel mock loader). La versione 4.1.11 include il fix. Essendo
Phase 0 e con una sola test suite di sanity check, l'aggiornamento a
Vitest 4 non ha comportato breaking change rilevanti.

**Nota tecnica:** l'installazione della nuova versione ha richiesto il
flag `--legacy-peer-deps` per generare il lockfile iniziale (bug noto di
npm 10.9.7 nella risoluzione di peer dependency opzionali di Vitest 4).
Una volta generato il lockfile, `npm install` standard funziona
correttamente per le installazioni successive.

### D7 — Prettier esclude `AI/`

**Decisione:** `.prettierignore` esclude la cartella `AI/`.

**Motivazione:** i documenti di protocollo condiviso (in particolare
`AI/MASTER_SPEC.md`, prodotto da ChatGPT) non devono essere riformattati
automaticamente da Claude Code: si eviterebbe rumore nei diff su contenuti
che non sono codice.

### D8 — Fetch SSRF-safe con pinning DNS via undici, non `fetch` globale

**Decisione:** il fetcher dell'audit (`src/lib/security/safeFetch.ts`) usa
`undici` con un `Agent` e un `connect.lookup` personalizzato che pinna la
connessione TCP all'indirizzo IP già validato dal guard SSRF, invece di
affidarsi al `fetch` globale di Node con una singola validazione DNS
preliminare.

**Motivazione:** una validazione DNS seguita da una `fetch` che risolve di
nuovo il nome a dominio internamente lascia una finestra di DNS rebinding
(l'attaccante fa risolvere l'hostname a un indirizzo pubblico durante la
validazione e a un indirizzo privato durante la connessione reale). Il
pinning a livello di socket chiude questa finestra. Il redirect è gestito
manualmente (`redirect: "manual"`) proprio per poter rivalidare ogni hop
col guard SSRF prima di seguirlo, invece di lasciare che sia il client
HTTP a seguirlo automaticamente.

### D9 — Persistenza mock su `globalThis`, non un modulo-singleton semplice

**Decisione:** `src/lib/db/memoryAuditStore.ts` aggancia la `Map` in
memoria a `globalThis` invece di usare una semplice variabile a livello di
modulo.

**Motivazione:** verificato empiricamente in Phase 1 — Next.js (Turbopack,
sia in dev che in build) compila i route handler (`/api/audit`) e le
pagine (`/audit/[id]`) come grafi di moduli separati. Un `Map`
module-scoped risultava duplicato fra i due, causando `404` sistematici
sulla pagina risultati subito dopo un audit riuscito. `globalThis` è
l'unico riferimento realmente condiviso nell'intero processo Node.

### D10 — Categoria `forms` esclusa dal punteggio (peso 0)

**Decisione:** i check del detector `forms` (§7.6 di `AI/MASTER_SPEC.md`)
hanno tutti peso 0 e non contribuiscono al Site Score; sono mostrati nei
risultati solo a fini informativi.

**Motivazione:** il modello di scoring in `AI/MASTER_SPEC.md` §8 elenca
esplicitamente sei categorie pesate (Technical, SEO, Privacy, Cookie &
Consent, Tracking, Performance) che sommano al 100%; "forms" non compare.
Includerlo nel punteggio avrebbe richiesto inventare un peso non
specificato nella spec.

### D11 — Rate limiting per IP aggiunto in Phase 1 (non solo Phase successive)

**Decisione:** `POST /api/audit` applica un rate limit in-memory per IP
(10 richieste/minuto) fin da Phase 1.

**Motivazione:** l'endpoint fa una richiesta HTTP server-side per conto di
utenti anonimi verso URL arbitrari fornite dall'utente. Anche con il guard
SSRF, si tratta di una superficie di abuso reale (uso improprio del
server come proxy di richieste, esaurimento risorse) fin dal momento in
cui l'endpoint viene esposto pubblicamente — non un'ipotesi futura. Il
rate limiter è deliberatamente minimale (in-memory, non condiviso fra
istanze) e potrà evolvere se necessario, coerentemente con
`AI/MASTER_SPEC.md` §27.

### D12 — Verifica end-to-end Phase 1 contro `pypi.org`, non un dominio arbitrario

**Decisione:** il criterio di successo di Phase 1 ("un URL pubblico reale
produce un Site Score deterministico significativo") è stato verificato
end-to-end contro `https://pypi.org` invece di un sito scelto a caso.

**Motivazione:** l'ambiente sandbox di questa sessione di sviluppo
instrada l'uscita HTTPS attraverso un proxy con allowlist ristretta
(registry pacchetti, GitHub, API Anthropic) — un vincolo della sessione
Claude Code, non del prodotto. `pypi.org` è nell'allowlist e serve HTML
reale, quindi è stato usato come sostituto valido di un "sito pubblico
reale" per la verifica. Risultato: Site Score 72/100, banda "Buono",
breakdown per categoria coerente. Su un hosting di produzione normale
(senza egress proxy ristretto) l'audit funziona contro qualunque URL
pubblico che superi la validazione SSRF — nessuna modifica al codice è
necessaria.
