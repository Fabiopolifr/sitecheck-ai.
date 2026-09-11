#!/bin/bash
#
# Deploy di FreeCookieBe su Hostinger Cloud Startup, via SSH.
# Sostituisce il giro: scarica ZIP -> carica su hPanel -> attendi ->
# crea restart.txt a mano. Vedi DEPLOYMENT.md e AI/DECISIONS.md D48/D49.
#
# Va tenuto FUORI dalla cartella dell'app (in ~/deploy.sh): durante il
# deploy i file dell'app vengono sostituiti, e bash legge lo script
# mentre lo esegue — eseguirlo da dentro significherebbe cambiargli il
# codice sotto i piedi a metà esecuzione.
#
set -euo pipefail

# Sovrascrivibili dall'ambiente, così lo script è verificabile fuori da
# Hostinger senza modificarne il contenuto.
REPO="${REPO:-https://github.com/Fabiopolifr/sitecheck-ai.}"
BRANCH="${BRANCH:-main}"
APP_ROOT="${APP_ROOT:-$HOME/domains/cookie.freesbe.it/hbuilds/current/nodejs}"

# Copia del lock file dell'ultima installazione riuscita: serve a capire
# se le dipendenze vanno reinstallate o se si può saltare (vedi sotto).
DEPS_STAMP=".deploy-installed-lock"

# Spazio minimo richiesto: durante l'installazione coesistono il
# node_modules vecchio (messo da parte per il ripristino) e quello nuovo.
MIN_FREE_MB=3000

# I backup per il ripristino vanno FUORI dalla cartella dell'app, non
# rinominati al suo interno: tsconfig.json esclude "node_modules", non
# "node_modules.previous", quindi una copia lasciata dentro l'app root
# verrebbe inclusa nella compilazione TypeScript, caricando una seconda
# volta i tipi di React/Next e facendo fallire la build con errori che
# non c'entrano niente col codice. Sta in $HOME, stesso filesystem
# dell'app (mv resta istantaneo, nessuna copia di 800 MB).
BACKUP_DIR="${DEPLOY_BACKUP_DIR:-$HOME/.freecookiebe-deploy-backup}"

# --- 1. Node -----------------------------------------------------------
# Non è nel PATH della shell SSH: su CloudLinux sta in /opt/alt/.
# Next.js 16 richiede Node >= 20, quindi si parte dalla più recente.
NODE_BIN=""
for v in 24 22 20; do
  candidate="/opt/alt/alt-nodejs$v/root/usr/bin"
  if [ -x "$candidate/node" ]; then
    NODE_BIN="$candidate"
    break
  fi
done

if [ -z "$NODE_BIN" ]; then
  echo "ERRORE: nessun Node >= 20 in /opt/alt/. Deploy annullato." >&2
  exit 1
fi

export PATH="$NODE_BIN:$PATH"
echo "==> Node $(node -v)"

# Ci si sposta subito in una directory che esiste di sicuro. Il pannello
# Hostinger ruota le cartelle sotto hbuilds/versions/, quindi chi lancia
# lo script stando dentro `current/nodejs` può ritrovarsi con una cwd
# cancellata: git e npm fallirebbero con un "Unable to read current
# working directory" che non ha nulla a che vedere con il deploy.
# L'avviso di bash viene silenziato: uscire da una cwd cancellata non è
# un problema, ma il messaggio fa sembrare rotto il deploy.
cd "$HOME" 2>/dev/null || cd /

# --- 2. Controlli preliminari ------------------------------------------
# Tutti PRIMA di toccare qualunque file, così un problema di rete, di
# spazio o di percorso non lascia il sito a metà.

echo "==> Verifico l'accesso a GitHub"
GIT_TERMINAL_PROMPT=0 timeout 30 git ls-remote "$REPO" "$BRANCH" >/dev/null

# server.js lo genera il pannello Hostinger e NON è nel repository: se
# manca, il symlink 'current' punta altrove e questa non è la cartella
# dell'app. Meglio fermarsi che sovrascrivere la directory sbagliata.
cd "$APP_ROOT"
if [ ! -f server.js ]; then
  echo "ERRORE: server.js non trovato in $APP_ROOT." >&2
  echo "Non sembra la cartella dell'app: deploy annullato." >&2
  exit 1
fi

AVAILABLE_MB=$(df -Pm "$APP_ROOT" | awk 'NR==2 {print $4}')
echo "==> Spazio libero: ${AVAILABLE_MB} MB"
if [ "$AVAILABLE_MB" -lt "$MIN_FREE_MB" ]; then
  echo "ERRORE: servono almeno ${MIN_FREE_MB} MB liberi per un deploy" >&2
  echo "ripristinabile in sicurezza. Deploy annullato." >&2
  exit 1
fi

# --- 3. Ripristino automatico in caso di errore ------------------------
# Install e build avvengono nella cartella servita da Passenger: un
# fallimento a metà lascerebbe il sito senza dipendenze o con una build
# troncata. node_modules e .next vengono quindi spostati (mv, istantaneo
# e senza copie) e rimessi al loro posto se qualcosa va storto, così si
# torna a uno stato coerente — non a un misto di vecchio e nuovo.
MOVED_MODULES=0
MOVED_NEXT=0

rollback() {
  echo "" >&2
  echo "ERRORE: deploy fallito. Ripristino lo stato precedente." >&2

  if [ "$MOVED_MODULES" = 1 ] && [ -d "$BACKUP_DIR/node_modules" ]; then
    rm -rf "$APP_ROOT/node_modules"
    mv "$BACKUP_DIR/node_modules" "$APP_ROOT/node_modules"
  fi

  if [ "$MOVED_NEXT" = 1 ] && [ -d "$BACKUP_DIR/.next" ]; then
    rm -rf "$APP_ROOT/.next"
    mv "$BACKUP_DIR/.next" "$APP_ROOT/.next"
  fi

  mkdir -p "$APP_ROOT/tmp" && touch "$APP_ROOT/tmp/restart.txt"
  echo "Il sito è tornato alla versione funzionante di prima." >&2
}

# Anche su INT/TERM, non solo su errore: la build con le binding WASM può
# durare diversi minuti e sembrare bloccata. Senza questo, un Ctrl+C a
# metà lascerebbe il sito senza node_modules e senza .next (entrambi
# spostati nel backup) — cioè completamente giù, nel momento in cui
# l'utente pensa solo di aver annullato un comando.
trap rollback ERR INT TERM

rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# --- 4. Aggiornamento del codice ---------------------------------------
# 'reset --hard' sostituisce solo i file tracciati da git. server.js,
# node_modules/, .next/, tmp/ e i log non sono nel repository, quindi
# restano dove sono.
if [ ! -d .git ]; then
  echo "==> Prima esecuzione: collego la cartella al repository"
  git init -q
  git remote add origin "$REPO"
fi

git remote set-url origin "$REPO"
echo "==> Scarico il codice dal branch $BRANCH"
git fetch -q --depth=1 origin "$BRANCH"
git reset -q --hard FETCH_HEAD
echo "==> Codice aggiornato: $(git log -1 --pretty='%h %s')"

# --- 5. Dipendenze -----------------------------------------------------
# Verifica a livello di risoluzione, non di numero di versione: è così
# che si scopre un pacchetto presente ma con file mancanti al suo
# interno. È il caso reale che ha fatto fallire il primo deploy —
# react-dom@19.2.8 installato ma senza client.js, e npm install lo
# considerava a posto perché la versione combaciava (AI/DECISIONS.md D49).
deps_resolve_ok() {
  node -e "
    require.resolve('next');
    require.resolve('react');
    require.resolve('react-dom');
    require.resolve('react-dom/client');
  " >/dev/null 2>&1
}

if [ -f "$DEPS_STAMP" ] && cmp -s package-lock.json "$DEPS_STAMP" &&
  deps_resolve_ok; then
  echo "==> Dipendenze già allineate al lock file, salto l'installazione"
else
  echo "==> Installo le dipendenze da zero (npm ci)"
  # npm ci, non npm install: ricostruisce node_modules esattamente dal
  # lock file. npm install si limita a confrontare i numeri di versione
  # di quello che trova già installato, quindi non ripara un pacchetto
  # incompleto.
  if [ -d node_modules ]; then
    mv node_modules "$BACKUP_DIR/node_modules"
    MOVED_MODULES=1
  fi

  npm ci --no-audit --no-fund

  if ! deps_resolve_ok; then
    echo "ERRORE: dopo npm ci le dipendenze non risolvono ancora." >&2
    false
  fi

  cp package-lock.json "$DEPS_STAMP"
fi

# --- 6. Build ----------------------------------------------------------
if [ -d .next ]; then
  mv .next "$BACKUP_DIR/.next"
  MOVED_NEXT=1
fi

echo "==> Build (qualche minuto; il sito risponde male finché non finisce)"
npm run build

# Riuscito: si disarma il ripristino e si liberano le copie di sicurezza.
trap - ERR
rm -rf "$BACKUP_DIR"

# --- 7. Riavvio --------------------------------------------------------
mkdir -p tmp && touch tmp/restart.txt

echo ""
echo "==> FATTO."
echo "    Commit attivo: $(git log -1 --pretty='%h %s')"
echo "    Aspetta ~15 secondi, poi ricarica il sito con Ctrl+Shift+R."
