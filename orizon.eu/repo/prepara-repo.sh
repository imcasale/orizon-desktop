#!/bin/bash
# Prepara il repository firmato di Orizon (in ~/orizon-repo) con il deb e l'rpm appena compilati.
# Va lanciato dentro la scatola orizon-pacchetti, dopo la compilazione. Poi lo pubblica pubblica-repo.sh.
set -euo pipefail
cd "$(dirname "$0")/../.."
export GNUPGHOME="${ORIZON_GNUPG:-$HOME/orizon-credenziali/gnupg-pacchetti}"
NOME="Orizon Pacchetti <info@4orizon.eu>"
OUT="${ORIZON_REPO_DIR:-$HOME/orizon-repo}"
URL="${ORIZON_REPO_URL:-https://4orizon.eu/repo}"
TIENI=3   # versioni tenute nel repository, per poter tornare indietro
for c in gpg rpm rpmsign createrepo_c apt-ftparchive; do
  command -v $c >/dev/null || { echo "   manca $c: sudo apt-get install -y gnupg rpm createrepo-c apt-utils"; exit 1; }
done
FPR=$(gpg --batch --with-colons --list-secret-keys "$NOME" 2>/dev/null | awk -F: '/^fpr/{print $10; exit}')
[ -n "$FPR" ] || { echo "   non trovo la chiave in $GNUPGHOME: lancia prima orizon.eu/repo/chiave.sh"; exit 1; }
VER=$(python3 -c "import json;print(json.load(open('package.json'))['version'])")
DEB="dist/orizon-desktop_${VER}_amd64.deb"; RPM="dist/orizon-desktop-${VER}.x86_64.rpm"
[ -f "$DEB" ] && [ -f "$RPM" ] || { echo "   non trovo $DEB e $RPM: prima va compilata la versione $VER"; exit 1; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$OUT/rpm" "$OUT/deb/pool/main" "$OUT/deb/dists/stable/main/binary-amd64"

# rpm: firmo il pacchetto e l'indice
cp -f "$RPM" "$OUT/rpm/"
rpmsign --addsign --define "_gpg_name $FPR" --define "_gpg_path $GNUPGHOME" --define "__gpg $(command -v gpg)" "$OUT/rpm/$(basename "$RPM")" >/dev/null
ls -1t "$OUT"/rpm/*.rpm | tail -n +$((TIENI + 1)) | xargs -r rm -f
rm -rf "$OUT/rpm/repodata"
createrepo_c --quiet "$OUT/rpm"
gpg --batch --yes --armor --local-user "$FPR" --detach-sign -o "$OUT/rpm/repodata/repomd.xml.asc" "$OUT/rpm/repodata/repomd.xml"

# deb: copio il pacchetto, rifaccio l'indice e lo firmo
cp -f "$DEB" "$OUT/deb/pool/main/"
ls -1t "$OUT"/deb/pool/main/*.deb | tail -n +$((TIENI + 1)) | xargs -r rm -f
D="$OUT/deb/dists/stable"
rm -f "$D/Release" "$D/InRelease" "$D/Release.gpg"
( cd "$OUT/deb" && apt-ftparchive packages pool/main > dists/stable/main/binary-amd64/Packages )
gzip -9kf "$D/main/binary-amd64/Packages"
apt-ftparchive -o APT::FTPArchive::Release::Origin=Orizon -o APT::FTPArchive::Release::Label=Orizon \
  -o APT::FTPArchive::Release::Suite=stable -o APT::FTPArchive::Release::Codename=stable \
  -o APT::FTPArchive::Release::Architectures=amd64 -o APT::FTPArchive::Release::Components=main \
  release "$D" > "$T/Release"
mv "$T/Release" "$D/Release"
gpg --batch --yes --local-user "$FPR" --clearsign -o "$D/InRelease" "$D/Release"
gpg --batch --yes --local-user "$FPR" --armor --detach-sign -o "$D/Release.gpg" "$D/Release"

# file per chi vuole aggiungere il repository a mano
cp -f orizon.eu/repo/orizon.asc "$OUT/orizon.asc"
printf '[orizon]\nname=Orizon\nbaseurl=%s/rpm\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=%s/orizon.asc\nmetadata_expire=6h\n' "$URL" "$URL" > "$OUT/orizon.repo"
printf 'Types: deb\nURIs: %s/deb\nSuites: stable\nComponents: main\nArchitectures: amd64\nSigned-By: /usr/share/keyrings/orizon-archive-keyring.asc\n' "$URL" > "$OUT/orizon.sources"

# controllo delle firme, come le controllerebbero dnf e apt
rpm --dbpath "$T/rpmdb" --initdb >/dev/null 2>&1 || true
rpm --dbpath "$T/rpmdb" --import "$OUT/orizon.asc"
rpm --dbpath "$T/rpmdb" -K "$OUT/rpm/$(basename "$RPM")" | grep -q "signatures OK" && echo "   rpm firmato: ok" || { echo "   ATTENZIONE: firma rpm non valida"; exit 1; }
gpg --batch --no-default-keyring --keyring "$T/k.gpg" --import "$OUT/orizon.asc" 2>/dev/null
gpgv --keyring "$T/k.gpg" "$OUT/rpm/repodata/repomd.xml.asc" "$OUT/rpm/repodata/repomd.xml" 2>/dev/null && echo "   indice rpm firmato: ok"
gpgv --keyring "$T/k.gpg" "$D/InRelease" 2>/dev/null && echo "   indice deb firmato: ok"
echo "   repository pronto in $OUT: versione $VER ($(du -sh "$OUT" | cut -f1))"
