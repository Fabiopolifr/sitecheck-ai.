# Deployment — SiteCheck AI

Guida per portare SiteCheck AI in produzione. Vedi `AI/ARCHITECTURE.md`
per i dettagli implementativi di ogni componente citato qui.

## Setup di produzione effettivo: Hostinger Cloud Startup (ZIP) + Neon

Il resto di questo documento descrive l'opzione VPS (app + Postgres
entrambi self-hosted), ma il deploy reale in uso è diverso, deciso più
avanti nel progetto (vedi `AI/DECISIONS.md`): **Hostinger Cloud
Startup**, che non dà accesso SSH/root, solo un pannello "Deploy Web
App" con upload ZIP (esegue `npm install && npm run build` lato
server via Phusion Passenger), più **Neon** come Postgres gestito
esterno (`DATABASE_URL` puntato lì).

**Passo che va ripetuto a ogni upload di un nuovo ZIP, non solo la
prima volta:** Passenger tiene un processo Node già avviato in memoria
e **non lo riavvia da solo** quando arrivano file nuovi — il sito
continua a servire la build precedente (CSS/JS compresi) finché non
gli si dice esplicitamente di ricaricare. Dopo ogni upload:

1. Nel file manager di hPanel, vai in
   `hbuilds/current/nodejs/tmp/`.
2. Elimina il file `restart.txt` se esiste già, poi ricrealo vuoto
   (New file → `restart.txt`).
3. Aspetta una decina di secondi, poi ricarica il sito con un refresh
   forzato (Ctrl+Shift+R) per verificare.

Saltare questo passo è la causa più probabile se dopo un upload il
sito continua a mostrare la grafica/i contenuti vecchi, o mostra CSS
completamente assente (link a un file che la build nuova ha già
sovrascritto con un altro nome) — vedi `AI/DECISIONS.md` D36 per il
caso reale che ha portato a scoprirlo.

### Scorciatoia: il bottone "Riavvia il sito" in /admin

Dal deploy in cui è stato introdotto (D45) in poi, il giro nel file
manager si può saltare: in `/admin`, accanto a "Esci", c'è **"Riavvia
il sito"**, che scrive lui il `restart.txt`.

Perché funziona: dopo l'upload di uno ZIP il processo Node **vecchio**
è ancora in esecuzione e serve ancora `/admin` — quindi il bottone
(che fa parte del build precedente) è lì e può toccare il file, e a
quel punto Passenger carica il build nuovo.

Richiede la variabile d'ambiente `PASSENGER_RESTART_FILE` impostata nel
pannello Hostinger al percorso **assoluto** del file, passando per il
symlink `current`:

```
/home/<utente>/domains/<dominio>/hbuilds/current/nodejs/tmp/restart.txt
```

Deve passare per `current` e non per `hbuilds/versions/<id>/...`: il
processo in esecuzione ha come working directory la cartella della
_sua_ versione (quella vecchia), mentre Passenger guarda il percorso
via `current`, che dopo l'upload punta già al build nuovo. Senza la
variabile il bottone ripiega su `<cwd>/tmp/restart.txt`, che su
Hostinger è quasi certamente la cartella sbagliata — in caso di errore
il bottone mostra il percorso che ha tentato, così si vede subito.

### Se la grafica si vede male solo entrando dalla home

Sintomo: `https://<dominio>/` si vede senza stili, ma passando prima da
`/admin` e poi tornando alla home si vede bene. Non è Passenger: è
**HTML vecchio in cache**. La home è una pagina statica e può essere
cachata (dal browser o dalla CDN di Hostinger), mentre `/admin` è
dinamica e non lo è mai — quindi serve i link ai CSS del build nuovo.
Da lì la navigazione verso la home avviene lato client e riusa il CSS
già caricato, mascherando il problema.

Come si isola:

1. Ricarica la home con **Ctrl+Shift+R**. Se si sistema, era la cache
   del browser e basta così.
2. Se non si sistema, aprila in **finestra anonima**. Se anche lì è
   rotta, la cache non è del browser ma della **CDN**.
3. In quel caso, in hPanel vai nella sezione CDN dell'app e usa
   **svuota cache** (in alternativa, disattiva temporaneamente la CDN
   per verificare).

Conferma definitiva: apri gli strumenti per sviluppatori (F12) →
scheda **Network** → ricarica: se un file `.css` risponde **404**,
l'HTML servito è di un build precedente e sta chiedendo un file che non
esiste più.

## Migration del database (Neon) — come si eseguono

Non c'è nessuno strumento automatico di migration in questo progetto
(niente Prisma/Drizzle): le migration sono file `.sql` in `migrations/`
che vanno eseguiti **a mano** sul database Neon. Non vengono eseguite
dal deploy: caricare uno ZIP nuovo NON aggiorna lo schema del database.

**Procedura (5 minuti, si fa dal browser):**

1. Vai su [console.neon.tech](https://console.neon.tech) e apri il tuo
   progetto.
2. Nel menu a sinistra clicca **SQL Editor**.
3. Apri il file `migrations/RUN_ALL.sql` di questo repository, copia
   **tutto** il contenuto e incollalo nell'editor.
4. Clicca **Run**.
5. In fondo al file c'è una query di verifica: deve restituire 10
   righe (i nomi delle tabelle). Se le vedi tutte, è fatto.

`RUN_ALL.sql` contiene tutte le migration da `0001` a oggi, in ordine.
**È sicuro eseguirlo più volte** e anche se parte delle tabelle esiste
già: ogni istruzione usa `if not exists`, quindi salta ciò che c'è e
non tocca i dati esistenti. Questo è il motivo per cui non serve
tenere traccia di "quali migration ho già fatto": in caso di dubbio,
riesegui `RUN_ALL.sql` e sei allineato.

Quando viene aggiunta una migration nuova va aggiunta in coda anche a
`RUN_ALL.sql`, e va rieseguita la procedura qui sopra prima (o subito
dopo) il deploy dello ZIP che la richiede.

**Sintomo tipico di una migration mancante:** la funzionalità sembra
funzionare ma i dati "non si salvano" / spariscono dopo qualche ora.
Il codice ha un fallback in memoria per ogni repository (vedi
`AI/DECISIONS.md` D13/D21): se la tabella non esiste, la scrittura su
Postgres fallisce, viene loggata in `console.log` e il dato resta solo
nella memoria del processo Node — che Passenger prima o poi riavvia.

## Requisiti dell'hosting

L'app è un progetto Next.js 16 standard (App Router). Non richiede nulla
di esotico — qualunque hosting che soddisfi questi requisiti va bene
(Vercel, Netlify, un VPS con Node, un container). Questa guida copre nel
dettaglio l'opzione **VPS Hostinger** (app + PostgreSQL entrambi
self-hosted), scelta esplicita del progetto per restare su infrastruttura
a costo minimo (vedi `AI/DECISIONS.md`).

- **Node.js 20+** in esecuzione lato server (non è compatibile con
  export statico: usa route handler dinamici, `proxy.ts` e pagine
  server-rendered).
- **Nessun job/worker in background**: tutto avviene sincronamente
  dentro le richieste HTTP (audit, generazione summary AI, invio email).
  Non serve un sistema di code.
- **Nessuno storage persistente su filesystem locale**: tutto lo stato
  vive su PostgreSQL (quando configurato) o in memoria di processo. Un
  hosting stateless/serverless va bene, con l'unico caveat che senza
  `DATABASE_URL` configurato i dati in memoria non sopravvivono a un
  riavvio o a più istanze — per questo **un database Postgres è
  fortemente raccomandato in produzione**, non solo opzionale come in
  sviluppo.
- **`proxy.ts` richiede runtime Node.js**: supportato da hosting Node
  standard, VPS e container; non da adapter edge-only.

Nota: l'hosting **condiviso** Hostinger (shared hosting) non supporta
processi Node.js persistenti né un server PostgreSQL self-managed — serve
un **piano VPS** (Hostinger VPS, qualunque taglia con almeno 1 vCPU / 1GB
RAM per iniziare va bene per il volume "lean" atteso in questa fase).

## Guida: VPS Hostinger (app + database)

### 1. Provisioning del VPS

1. Crea un piano VPS Hostinger con immagine **Ubuntu 22.04 LTS** (o
   successiva).
2. Accedi via SSH come root, poi crea un utente non-root dedicato:
   ```bash
   adduser sitecheck
   usermod -aG sudo sitecheck
   su - sitecheck
   ```
3. Aggiorna il sistema:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### 2. Installa Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # deve riportare v20.x o superiore
```

### 3. Installa e configura PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

Nella shell `psql`:

```sql
CREATE DATABASE sitecheck_ai;
CREATE USER sitecheck WITH ENCRYPTED PASSWORD '<password robusta>';
GRANT ALL PRIVILEGES ON DATABASE sitecheck_ai TO sitecheck;
\c sitecheck_ai
GRANT ALL ON SCHEMA public TO sitecheck;
\q
```

Per impostazione predefinita PostgreSQL su Ubuntu ascolta solo su
`localhost` (`listen_addresses = 'localhost'` in
`/etc/postgresql/*/main/postgresql.conf`) — corretto per questo setup,
dato che l'app gira sulla stessa macchina: **non esporre la porta 5432
pubblicamente**. Se l'app e il database restano sullo stesso VPS non
serve TLS tra loro (nessun traffico lascia la macchina); la connection
string non deve quindi includere `sslmode=require` (vedi
`src/lib/db/pgClient.ts`, che lo attiva solo se esplicitamente richiesto
nella stringa).

### 4. Esegui le migration

Clona il repository sul VPS (o trasferisci solo la cartella
`migrations/`), poi:

```bash
cd sitecheck-ai
for f in migrations/*.sql; do
  psql "postgres://sitecheck:<password>@localhost:5432/sitecheck_ai" -f "$f"
done
```

Esegui i file **in ordine** (`0001_init.sql`, `0002_audit_summaries.sql`,
`0003_analytics_events.sql`, `0004_content_engine.sql`) — dipendono l'uno
dall'altro. Verifica che non ci siano errori prima di procedere.

### 5. Clona e builda l'app

```bash
git clone <url-del-repo> sitecheck-ai
cd sitecheck-ai
npm ci
```

Crea `.env` (non `.env.local` in produzione — vedi sezione variabili
d'ambiente sotto) con almeno:

```env
DATABASE_URL=postgres://sitecheck:<password>@localhost:5432/sitecheck_ai
ADMIN_PASSWORD=<password robusta, diversa da sviluppo>
APP_URL=https://tuodominio.it
```

Build di produzione:

```bash
npm run build
```

### 6. Process manager (PM2)

```bash
sudo npm install -g pm2
pm2 start npm --name sitecheck-ai -- start
pm2 save
pm2 startup   # segui l'istruzione stampata per abilitare l'avvio al boot
```

L'app di default ascolta su `localhost:3000` (`npm run start` / `next
start`); PM2 la mantiene viva e la riavvia in caso di crash.

### 7. Reverse proxy Nginx + SSL

```bash
sudo apt install -y nginx
```

Crea `/etc/nginx/sites-available/sitecheck-ai`:

```nginx
server {
    listen 80;
    server_name tuodominio.it;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sitecheck-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Punta il DNS del dominio (record A) all'IP del VPS Hostinger, poi abilita
HTTPS con Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tuodominio.it
```

Certbot configura automaticamente Nginx per HTTPS e imposta il rinnovo
automatico del certificato.

### 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Non esporre mai direttamente la porta 3000 (Next.js) o 5432 (Postgres) a
Internet: solo Nginx (80/443) deve essere raggiungibile dall'esterno.

### 9. Aggiornamenti successivi

```bash
cd sitecheck-ai
git pull
npm ci
npm run build
pm2 restart sitecheck-ai
```

Se una nuova release aggiunge migration, eseguile (in ordine, solo quelle
non ancora applicate) prima del restart.

## Variabili d'ambiente

Vedi `.env.example` per l'elenco completo. Minimo raccomandato per un
lancio reale (oltre a quanto già funziona senza configurazione):

```env
# Persistenza reale — vedi README "Configurazione PostgreSQL" e la guida
# Hostinger sopra
DATABASE_URL=postgres://sitecheck:<password>@localhost:5432/sitecheck_ai

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
`DATABASE_URL` in particolare contiene le credenziali complete del
database — trattalo come una password di root.

## Checklist pre-lancio

1. **Build pulita**: `npm ci && npm run lint && npm run test && npm run build`
   devono passare senza errori.
2. **Migration**: esegui in ordine tutti i file in `migrations/`
   (attualmente `0001_init.sql`, poi `0002_audit_summaries.sql`, poi
   `0003_analytics_events.sql`, poi `0004_content_engine.sql`) sul
   database Postgres di produzione, tramite `psql` (vedi guida sopra).
   Il database non ha alcun accesso pubblico: l'unico accesso previsto è
   dall'app stessa, tramite `DATABASE_URL` (rete locale/privata sullo
   stesso VPS).
3. **`ADMIN_PASSWORD`**: imposta una password robusta, diversa da quella
   usata in sviluppo. La dashboard `/admin` è protetta da un singolo
   cookie firmato HMAC — non è un sistema multi-utente (vedi
   `AI/DECISIONS.md` D15 per il perché di questa scelta).
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
   IP (vedi `src/lib/security/rateLimit.ts`). Su un singolo processo PM2
   (come nella guida Hostinger sopra) il limite è già effettivamente
   globale; se in futuro si passa a più istanze, da rivedere (es. store
   condiviso Redis).
7. **Content engine (opzionale)**: se `CONTENT_GENERATION_SECRET` è
   impostato, configura uno scheduler esterno (un cron job sul VPS stesso
   con `curl`, o un servizio esterno) che chiami `POST
/api/content/generate` con header `x-content-secret`, secondo la
   cadenza desiderata (l'app stessa non pianifica nulla). I post generati
   restano in coda su `/admin/content`: la pubblicazione reale avviene
   tramite il flusso Claude Code + Metricool esistente, non
   automaticamente.
8. **Backup del database**: su un Postgres self-managed i backup sono a
   carico tuo (Supabase li includeva). Imposta almeno un `pg_dump`
   pianificato via cron, es.:
   ```bash
   pg_dump "postgres://sitecheck:<password>@localhost:5432/sitecheck_ai" \
     | gzip > /home/sitecheck/backups/sitecheck_ai_$(date +%F).sql.gz
   ```
   e ruota/copia altrove i file periodicamente (non lasciarli solo sul
   VPS che stai facendo il backup di).

## Cosa NON è ancora pronto per un lancio ad alto traffico

- Nessuna vera coda per l'invio email o la generazione AI: se uno di
  questi step è lento, allunga la risposta di `POST /api/audit`. Con
  Haiku 4.5 e Resend la latenza aggiuntiva è tipicamente contenuta, ma
  vale la pena monitorarla.
- Il rate limiter è per-processo (vedi sopra).
- Nessun sistema di cache per audit ripetuti sullo stesso URL — ogni
  richiesta rifà fetch + parsing + detector da zero.
- Nessun backup automatico del database out-of-the-box: va configurato
  manualmente (vedi checklist punto 8).

Nessuno di questi è un blocco per un lancio in piccola scala (coerente
col budget e l'obiettivo "lean" di `AI/MASTER_SPEC.md` §1); sono punti
da rivedere se il traffico cresce sensibilmente.
