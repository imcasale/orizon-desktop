#!/bin/bash
# Aggiunge al repository di Orizon (~/orizon-repo/arch/x86_64) il pacchetto pacman della versione attuale,
# fatto dal .deb già presente nel repository, firmato con la chiave dei pacchetti.
# Va lanciato dentro la scatola Arch (orizon-arch), dopo prepara-repo.sh. Poi lo pubblica pubblica-repo.sh.
set -euo pipefail
cd "$(dirname "$0")/../.."
export GNUPGHOME="${ORIZON_GNUPG:-$HOME/orizon-credenziali/gnupg-pacchetti}"
NOME="Orizon Pacchetti <info@4orizon.eu>"
OUT="${ORIZON_REPO_DIR:-$HOME/orizon-repo}"
URL="${ORIZON_REPO_URL:-https://4orizon.eu/repo}"
TIENI=3
for c in gpg gpgv makepkg repo-add updpkgsums; do
  command -v $c >/dev/null || { echo "   manca $c: sudo pacman -S --needed base-devel pacman-contrib gnupg"; exit 1; }
done
FPR=$(gpg --batch --with-colons --list-secret-keys "$NOME" 2>/dev/null | awk -F: '/^fpr/{print $10; exit}')
[ -n "$FPR" ] || { echo "   non trovo la chiave in $GNUPGHOME"; exit 1; }
VER=$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' package.json | head -1)
DEB="$OUT/deb/pool/main/orizon-desktop_${VER}_amd64.deb"
[ -f "$DEB" ] || { echo "   non trovo $DEB: prima prepara-repo.sh"; exit 1; }
B=$(mktemp -d); T=$(mktemp -d); trap 'rm -rf "$B" "$T"' EXIT

# pacchetto
cp orizon.eu/repo/arch/PKGBUILD "$B/"; cp "$DEB" "$B/"
sed -i "s/^pkgver=.*/pkgver=$VER/" "$B/PKGBUILD"
( cd "$B" && updpkgsums >/dev/null 2>&1 && makepkg -sf --noconfirm --cleanbuild > "$B/makepkg.log" 2>&1 ) \
  || { tail -20 "$B/makepkg.log"; echo "   PACCHETTO NON RIUSCITO"; exit 1; }
PKG=$(ls "$B"/orizon-desktop-"$VER"-*-x86_64.pkg.tar.zst | head -1)
N=$(basename "$PKG")

# repository: pacchetto firmato e indice firmato
A="$OUT/arch/x86_64"; mkdir -p "$A"
cp -f "$PKG" "$A/"
gpg --batch --yes --local-user "$FPR" --detach-sign -o "$A/$N.sig" "$A/$N"
repo-add -q --sign --key "$FPR" "$A/orizon.db.tar.gz" "$A/$N" 2>&1 | grep -v "^==> \(Extracting\|Creating\|Signing\|Adding\|Updating\|Checking\|Generating\|Created\)" || true
ls -1t "$A"/orizon-desktop-*.pkg.tar.zst | tail -n +$((TIENI + 1)) | while read -r f; do rm -f "$f" "$f.sig"; done
printf '[orizon]\nServer = %s/arch/$arch\n' "$URL" > "$OUT/orizon-pacman.conf"

# controllo delle firme, come le controllerebbe pacman
gpg --batch --no-default-keyring --keyring "$T/k.gpg" --import orizon.eu/repo/orizon.asc 2>/dev/null
gpgv --keyring "$T/k.gpg" "$A/$N.sig" "$A/$N" 2>/dev/null && echo "   pacchetto firmato: ok" || { echo "   ATTENZIONE: firma del pacchetto non valida"; exit 1; }
gpgv --keyring "$T/k.gpg" "$A/orizon.db.tar.gz.sig" "$A/orizon.db.tar.gz" 2>/dev/null && echo "   indice firmato: ok" || { echo "   ATTENZIONE: firma dell'indice non valida"; exit 1; }
echo "   repository pacman pronto: $N"

# comando di installazione per Arch e CachyOS
cp -f orizon.eu/repo/installa-arch.sh "$OUT/installa-arch.sh"
