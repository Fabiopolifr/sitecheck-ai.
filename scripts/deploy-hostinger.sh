#!/bin/bash
#
# Deploy di FreeCookieBe su Hostinger Cloud Startup, via SSH.
# Sostituisce il giro: scarica ZIP -> carica su hPanel -> attendi ->
# crea restart.txt a mano. Vedi DEPLOYMENT.md e AI/DECISIONS.md D48.
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
echo "==> Memoria libera: $(free -m | awk '/Mem:/ {print $7}') MB"

# --- 2. Connessione ----------------------------------------------------
# Testata PRIMA di toccare qualunque file, così un problema di rete non
# lascia il sito a metà.
echo "==> Verifico l'accesso a GitHub"
GIT_TERMINAL_PROMPT=0 timeout 30 git ls-remote "$REPO" "$BRANCH" >/dev/null

# --- 3. Controllo di sicurezza sulla cartella --------------------------
# server.js lo genera il pannello Hostinger e NON è nel repository: se
# manca, il symlink 'current' punta altrove e questa non è la cartella
# dell'app. Meglio fermarsi che sovrascrivere la directory sbagliata.
cd "$APP_ROOT"
if [ ! -f server.js ]; then
  echo "ERRORE: server.js non trovato in $APP_ROOT." >&2
  echo "Non sembra la cartella dell'app: deploy annullato." >&2
  exit 1
fi

# --- 4. Aggiornamento del codice ---------------------------------------
# 'reset --hard' sostituisce solo i file tracciati da git. server.js,
# node_modules/, .next/ e tmp/ non sono nel repository (gli ultimi due
# sono anche in .gitignore), quindi restano dove sono.
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

# --- 5. Build ----------------------------------------------------------
# La build viene fatta nella cartella servita da Passenger, quindi una
# build fallita a metà lascerebbe il sito rotto. Per questo .next viene
# spostato (non copiato: nessun raddoppio di spazio su disco) e
# ripristinato automaticamente se qualcosa va storto.
# Nota sul ripristino: rimette in piedi la build precedente, quindi il
# sito continua a funzionare. I file sorgente e node_modules restano però
# quelli nuovi (git reset e npm install girano prima della build): è
# innocuo, perché a runtime Next.js serve solo .next, e il deploy
# successivo riallinea tutto. Corretto il codice, basta rilanciare.
restore_previous_build() {
  if [ -d "$APP_ROOT/.next.previous" ]; then
    echo "" >&2
    echo "ERRORE: build fallita. Ripristino la versione precedente." >&2
    rm -rf "$APP_ROOT/.next"
    mv "$APP_ROOT/.next.previous" "$APP_ROOT/.next"
    mkdir -p "$APP_ROOT/tmp" && touch "$APP_ROOT/tmp/restart.txt"
    echo "Il sito è tornato alla versione funzionante di prima." >&2
  fi
}
trap restore_previous_build ERR

rm -rf .next.previous
if [ -d .next ]; then
  mv .next .next.previous
fi

echo "==> npm install"
npm install --no-audit --no-fund

echo "==> Build (qualche minuto; il sito risponde male finché non finisce)"
npm run build

trap - ERR
rm -rf .next.previous

# --- 6. Riavvio --------------------------------------------------------
mkdir -p tmp && touch tmp/restart.txt

echo ""
echo "==> FATTO."
echo "    Commit attivo: $(git log -1 --pretty='%h %s')"
echo "    Aspetta ~15 secondi, poi ricarica il sito con Ctrl+Shift+R."
