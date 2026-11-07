#!/bin/bash
# Pubblica il repository preparato da prepara-repo.sh su https://4orizon.eu/repo
# (cartella /opt/chat/www/repo sul server). Va lanciato dal PC, fuori dalla scatola.
# Il cambio è istantaneo: prima carica tutto in repo.nuovo, poi scambia le cartelle.
set -euo pipefail
SRC="${ORIZON_REPO_DIR:-$HOME/orizon-repo}"
SERVER="${ORIZON_SERVER:-gian@204.168.158.190}"
CHIAVE_SSH="${ORIZON_SSH_KEY:-$HOME/.ssh/orizon_fisso}"
DEST="${ORIZON_REPO_DEST:-/opt/chat/www/repo}"
URL="${ORIZON_REPO_URL:-https://4orizon.eu/repo}"
[ -f "$SRC/deb/dists/stable/InRelease" ] && [ -f "$SRC/rpm/repodata/repomd.xml.asc" ] || { echo "   in $SRC non c'è un repository pronto: prima prepara-repo.sh"; exit 1; }
mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh"
SSH="ssh -i $CHIAVE_SSH ${ORIZON_SSH_OPZ:-} -o ControlMaster=auto -o ControlPath=$HOME/.ssh/oz-%C -o ControlPersist=180"
remoto() { $SSH "$SERVER" "$@"; }
trap '$SSH -O exit "$SERVER" >/dev/null 2>&1 || true' EXIT

echo "   server: preparo $DEST.nuovo"
ESITO=$(remoto "set -e; P=\$(dirname '$DEST'); mkdir -p \"\$P\"; rm -rf '$DEST.nuovo'
  if [ -d '$DEST' ]; then cp -al '$DEST' '$DEST.nuovo'; else mkdir -p '$DEST.nuovo'; fi
  echo \"spazio libero: \$(df -h \"\$P\" | awk 'NR==2{print \$4}')\"; command -v rsync >/dev/null && echo RSYNC || true")
echo "$ESITO" | grep -v RSYNC | sed 's/^/   /'
if echo "$ESITO" | grep -q RSYNC && command -v rsync >/dev/null; then
  echo "   carico i file cambiati (rsync)..."
  rsync -a --delete -e "$SSH" "$SRC/" "$SERVER:$DEST.nuovo/"
else
  echo "   carico tutto (tar)..."
  tar -C "$SRC" -czf - . | remoto "rm -rf '$DEST.nuovo' && mkdir -p '$DEST.nuovo' && tar -xzf - -C '$DEST.nuovo'"
fi
remoto "set -e; chmod -R a+rX '$DEST.nuovo'; rm -rf '$DEST.vecchio'; if [ -d '$DEST' ]; then mv '$DEST' '$DEST.vecchio'; fi; mv '$DEST.nuovo' '$DEST'; rm -rf '$DEST.vecchio'"
echo "   pubblicato in $DEST"

echo "   controllo online:"
ok=1
for f in rpm/repodata/repomd.xml deb/dists/stable/InRelease orizon.asc orizon.repo; do
  if curl -fsS --max-time 30 "$URL/$f" -o /tmp/orizon-controllo.$$ 2>/dev/null && cmp -s /tmp/orizon-controllo.$$ "$SRC/$f"; then
    echo "   $URL/$f ok"
  else
    echo "   ATTENZIONE: $URL/$f non risponde o è diverso"; ok=0
  fi
done
rm -f /tmp/orizon-controllo.$$
[ $ok = 1 ] && echo "   repository online" || exit 1
