#!/bin/bash
# Installa Orizon su Arch, CachyOS, Manjaro, EndeavourOS dal repository di Orizon.
# Uso:  curl -fsSL https://4orizon.eu/repo/installa-arch.sh | sudo bash
# Dopo, Orizon si aggiorna con il resto del sistema (sudo pacman -Syu).
set -euo pipefail
URL=https://4orizon.eu/repo
FPR=DCD12B0D07D128AF40015AC4690D189F110EBE60

[ "$(id -u)" = 0 ] || { echo "Va lanciato con sudo:  curl -fsSL $URL/installa-arch.sh | sudo bash"; exit 1; }
command -v pacman >/dev/null || { echo "Questo comando è per Arch, CachyOS, Manjaro, EndeavourOS (pacman)."; exit 1; }
[ "$(uname -m)" = x86_64 ] || { echo "Orizon per Linux c'è solo per processori a 64 bit (x86_64)."; exit 1; }

echo "== Orizon 1/3: chiave dei pacchetti"
pacman-key --init >/dev/null 2>&1 || true
T=$(mktemp); trap 'rm -f "$T"' EXIT
curl -fsSL "$URL/orizon.asc" -o "$T"
TROVATA=$(gpg --batch --with-colons --import-options show-only --import "$T" 2>/dev/null | awk -F: '/^fpr/{print $10; exit}')
[ "$TROVATA" = "$FPR" ] || { echo "La chiave scaricata non è quella di Orizon: mi fermo."; exit 1; }
pacman-key --add "$T" >/dev/null
pacman-key --lsign-key "$FPR" >/dev/null
echo "   chiave di Orizon aggiunta (impronta ...110E BE60)"

echo "== Orizon 2/3: repository"
if grep -q '^\[orizon\]' /etc/pacman.conf; then
  echo "   già presente in /etc/pacman.conf"
else
  printf '\n[orizon]\nServer = %s/arch/$arch\n' "$URL" >> /etc/pacman.conf
  echo "   aggiunto in /etc/pacman.conf"
fi

echo "== Orizon 3/3: installazione"
pacman -Sy --needed --noconfirm orizon-desktop
echo
echo "Fatto: Orizon è nel menu delle applicazioni."
echo "Si aggiorna insieme al resto del sistema (sudo pacman -Syu)."
