#!/bin/bash
# Chiave che firma i pacchetti di Orizon. Si crea una volta sola e resta sul PC
# (in ~/orizon-credenziali/gnupg-pacchetti): la parte privata non va mai copiata altrove.
# Esporta la parte pubblica in orizon.eu/repo/orizon.asc, che finisce nei pacchetti e sul sito.
set -euo pipefail
cd "$(dirname "$0")/../.."
export GNUPGHOME="${ORIZON_GNUPG:-$HOME/orizon-credenziali/gnupg-pacchetti}"
NOME="Orizon Pacchetti <info@4orizon.eu>"
mkdir -p "$GNUPGHOME"; chmod 700 "$GNUPGHOME"
if ! gpg --batch --list-secret-keys "$NOME" >/dev/null 2>&1; then
  gpg --batch --passphrase '' --quick-gen-key "$NOME" rsa4096 sign never >/dev/null 2>&1
  echo "   chiave creata in $GNUPGHOME (copiala nel backup delle credenziali)"
fi
gpg --batch --armor --export "$NOME" 2>/dev/null > orizon.eu/repo/orizon.asc
echo "   chiave: $(gpg --batch --with-colons --list-keys "$NOME" 2>/dev/null | awk -F: '/^fpr/{print $10; exit}')"
