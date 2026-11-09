#!/bin/bash
# Rilascio di Orizon desktop per Linux, con un solo comando.
#   bash ~/dev/orizon-desktop/orizon.eu/rilascia.sh 1.12.28      nuova versione
#   bash ~/dev/orizon-desktop/orizon.eu/rilascia.sh 1.12.28-2    stessa versione, pacchetti rifatti (revisione 2)
#   bash ~/dev/orizon-desktop/orizon.eu/rilascia.sh --prova      prova generale: prepara tutto, non pubblica niente
# In ordine:
#   1. versione in package.json, electron-builder.ts e PKGBUILD
#   2. compila deb, rpm, pacman e tar.gz                (scatola orizon-pacchetti)
#   3. repository deb e rpm firmato                       (scatola orizon-pacchetti)
#   4. repository pacman firmato, per Arch e CachyOS     (scatola orizon-arch)
#   5. Flatpak firmato
#   6. pubblica il repository su https://4orizon.eu/repo  (apt, dnf, pacman, flatpak lo vedono da qui)
#   7. sito: file in /dl, impronte, versione e data nella pagina di download
#   8. salva in git (senza inviare)
#   9. Snap Store: costruzione sui server di Canonical e caricamento sul canale stable
# Se un passo si ferma, rilancia lo stesso comando: riparte da dove si era fermato.
# Per saltare dei passi:  SALTA="snap flatpak" bash .../rilascia.sh 1.12.28
#   (nomi: versione compila repo arch flatpak pubblica sito git snap)
# La passphrase della chiave ssh la chiede una volta sola. Si lancia dal PC, FUORI dalle scatole.
set -euo pipefail
D="${D:-$HOME/dev/orizon-desktop}"
SNAPDIR="${ORIZON_SNAP_DIR:-$HOME/dev/orizon-snap}"
SCATOLA="${SCATOLA:-orizon-pacchetti}"
SCATOLA_ARCH="${ORIZON_ARCH_BOX:-orizon-arch}"
REPO_VERO="${ORIZON_REPO_DIR:-$HOME/orizon-repo}"
URL="${ORIZON_REPO_URL:-https://4orizon.eu/repo}"
SITO="${ORIZON_SITO:-https://4orizon.eu}"
SERVER="${ORIZON_SERVER:-gian@204.168.158.190}"
CHIAVE_SSH="${ORIZON_SSH_KEY:-$HOME/.ssh/orizon_fisso}"
W="${ORIZON_WWW:-/opt/chat/www}"
export GNUPGHOME="${ORIZON_GNUPG:-$HOME/orizon-credenziali/gnupg-pacchetti}"
NOME_CHIAVE="Orizon Pacchetti <info@4orizon.eu>"
APP=eu._4orizon.Orizon
SNAP_NOME="${SNAP_NOME:-orizon}"
CACHE="$HOME/.cache/orizon-flatpak"
STATI="$HOME/.cache/orizon-rilascio"
SALTA="${SALTA:-}"
export PATH="$PATH:/var/lib/snapd/snap/bin"
export BROWSER="${BROWSER:-true}"   # snapcraft non deve provare ad aprire il browser
mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh"
SSH="ssh -i $CHIAVE_SSH ${ORIZON_SSH_OPZ:-} -o ControlMaster=auto -o ControlPath=$HOME/.ssh/oz-%C -o ControlPersist=600"
TMP=$(mktemp -d)
INIZIO=$(date +%s)
PROVA=0; ARG="${1:-}"; STATO=""; AGENTE=""

uso() { sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'; }
fine() {
  c=$?
  $SSH -O exit "$SERVER" >/dev/null 2>&1 || true
  [ -n "$AGENTE" ] && ssh-agent -k >/dev/null 2>&1 || true
  rm -rf "$TMP"
  if [ $c != 0 ] && [ -n "$STATO" ]; then
    echo; echo "== Fermato. Quando hai risolto, rilancia lo stesso comando: riparte da qui."
    echo "   bash $0 $ARG"
  fi
}
trap fine EXIT

case "$ARG" in
  --prova) PROVA=1;;
  [0-9]*) [[ "$ARG" =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-([1-9][0-9]*))?$ ]] || { uso; exit 1; }
          VER=${BASH_REMATCH[1]}; REV=${BASH_REMATCH[3]:-1};;
  *) uso; exit 1;;
esac

echo "== 0. Controlli"
if [ -n "${CONTAINER_ID:-}" ] || [ -e /run/.containerenv ]; then echo "   va lanciato FUORI dalle scatole"; exit 1; fi
salta() { [[ " $SALTA " == *" $1 "* ]]; }
mancano=""
for c in distrobox git python3 curl ssh ssh-agent ssh-add gpg flatpak flatpak-builder sha256sum; do
  command -v $c >/dev/null || mancano="$mancano $c"
done
salta snap || command -v snapcraft >/dev/null || mancano="$mancano snapcraft"
[ -z "$mancano" ] || { echo "   mancano:$mancano"; exit 1; }
cd "$D" 2>/dev/null || { echo "   non trovo $D"; exit 1; }
for f in package.json electron-builder.ts webapp.asar orizon.eu/release/build.json \
         orizon.eu/repo/prepara-repo.sh orizon.eu/repo/pubblica-repo.sh orizon.eu/repo/prepara-arch.sh orizon.eu/repo/arch/PKGBUILD \
         orizon.eu/flatpak/$APP.yml orizon.eu/flatpak/orizon-avvio.sh orizon.eu/flatpak/$APP.metainfo.xml; do
  [ -f "$f" ] || { echo "   manca $D/$f"; exit 1; }
done
salta snap || [ -f "$SNAPDIR/snap/snapcraft.yaml" ] || { echo "   manca $SNAPDIR/snap/snapcraft.yaml (si crea con snap-orizon.sh)"; exit 1; }
scatole=$(distrobox list 2>/dev/null | awk -F'|' 'NR>1{gsub(/ /,"",$2); print $2}')
for b in "$SCATOLA" "$SCATOLA_ARCH"; do
  echo "$scatole" | grep -qx "$b" || { echo "   manca la scatola $b"; exit 1; }
done
FPR=$(gpg --batch --with-colons --list-secret-keys "$NOME_CHIAVE" 2>/dev/null | awk -F: '/^fpr/{print $10; exit}')
[ -n "$FPR" ] || { echo "   non trovo la chiave dei pacchetti in $GNUPGHOME"; exit 1; }
[ -f "$CHIAVE_SSH" ] || { echo "   non trovo la chiave ssh $CHIAVE_SSH"; exit 1; }
if ! salta snap; then
  snapcraft whoami 2>/dev/null | grep -q '^email:' || { echo "   non sei collegato allo Snap Store: lancia  snapcraft login  (oppure SALTA=snap)"; exit 1; }
fi
libero=$(df -Pk "$HOME" | awk 'NR==2{print int($4/1048576)}')
[ "$libero" -ge 5 ] || echo "   ATTENZIONE: solo $libero GB liberi nella home (ne servono circa 5)"

ATTUALE=$(python3 -c "import json;print(json.load(open('package.json'))['version'])")
REV_ATTUALE=$(grep -o '"--iteration", "[0-9]*"' electron-builder.ts | head -1 | sed 's/.*"\([0-9]*\)"$/\1/')
[ -n "$REV_ATTUALE" ] || { echo "   electron-builder.ts: non trovo --iteration"; exit 1; }
if [ $PROVA = 1 ]; then VER=$ATTUALE; REV=$REV_ATTUALE; fi
DEBVER="$VER-$REV"
[ "$REV" = 1 ] && VR=$VER || VR="$VER-$REV"
PACCHETTI=("orizon-desktop_${VER}_amd64.deb" "orizon-desktop-${VER}.x86_64.rpm" "orizon-desktop-${VER}.pacman" "orizon-desktop-${VER}.tar.gz")
ULTIMA=$(sed -n 's/^Version: //p' "$REPO_VERO/deb/dists/stable/main/binary-amd64/Packages" 2>/dev/null | sort -V | tail -1)

if [ $PROVA = 1 ]; then
  OUT="$HOME/orizon-repo-prova"
  echo "   PROVA GENERALE con la versione attuale $VR: preparo tutto in $OUT, non pubblico niente"
else
  OUT="$REPO_VERO"
  mkdir -p "$STATI"
  if [ -f "$STATI/$DEBVER" ]; then
    grep -qx fine "$STATI/$DEBVER" && { echo "   la $VR è già stata rilasciata del tutto"; exit 0; }
    echo "   riprendo il rilascio della $VR (passi già fatti: $(grep -v fine "$STATI/$DEBVER" | tr '\n' ' '))"
  elif [ -n "$ULTIMA" ]; then
    piu_nuova=$(printf '%s\n%s\n' "$ULTIMA" "$DEBVER" | sort -V | tail -1)
    if [ "$piu_nuova" != "$DEBVER" ] || [ "$ULTIMA" = "$DEBVER" ]; then
      echo "   nel repository c'è già la $ULTIMA: la $DEBVER non è più nuova, apt e dnf non la installerebbero"
      if [ "${ULTIMA%-*}" = "$VER" ]; then
        echo "   per rifare i pacchetti della stessa versione usa la revisione dopo:  $VER-$(( ${ULTIMA##*-} + 1 ))"
      else
        echo "   usa una versione più nuova della ${ULTIMA%-*}"
      fi
      exit 1
    fi
  fi
  STATO="$STATI/$DEBVER"
fi
echo "   versione $VR (pacchetti $DEBVER) | nel repository: ${ULTIMA:-nessuna} | cartella $D"
cambiati=$(git status --porcelain | grep -v -E ' (package\.json|electron-builder\.ts|orizon\.eu/repo/arch/PKGBUILD|orizon\.eu/flatpak/.*|orizon\.eu/rilascia\.sh)$' || true)
[ -z "$cambiati" ] || { echo "   modifiche non salvate in git (finiranno nei pacchetti):"; echo "$cambiati" | head -10 | sed 's/^/     /'; }
[ -z "$SALTA" ] || echo "   salto: $SALTA"
if [ "${SI:-}" != 1 ]; then
  read -r -p "   Procedo? [s/N] " R
  [ "$R" = s ] || [ "$R" = S ] || { echo "   Non faccio niente."; STATO=""; exit 0; }
fi
[ -z "$STATO" ] || touch "$STATO"

fatto_gia() { [ -n "$STATO" ] && grep -qx "$1" "$STATO"; }
N=0; SALTATI=""
passo() {  # passo <nome> <titolo> <funzione>
  N=$((N + 1))
  if salta "$1"; then echo "== $N. $2: saltato"; SALTATI="$SALTATI $1"; return 0; fi
  if fatto_gia "$1"; then echo "== $N. $2: già fatto"; return 0; fi
  echo "== $N. $2"
  "$3"
  [ -z "$STATO" ] || echo "$1" >> "$STATO"
}
nella_scatola() { distrobox enter "$SCATOLA" -- bash -c "set -o pipefail; cd '$D' && $1"; }
agente() {
  [ -n "$AGENTE" ] && return 0
  eval "$(ssh-agent -s)" >/dev/null; AGENTE=1
  echo "   passphrase della chiave ssh (una volta sola per tutto il rilascio):"
  ssh-add "$CHIAVE_SSH"
}
online() { curl -fsSI --max-time 30 -o /dev/null "$1"; }

p_versione() {
  if [ $PROVA = 1 ]; then echo "   prova: lascio $VR"; return 0; fi
  python3 - "$VER" "$REV" <<'PY'
import json, re, sys
ver, rev = sys.argv[1], sys.argv[2]
s = open("package.json").read()
s2, n = re.subn(r'("version":\s*")[^"]+(")', lambda m: m.group(1) + ver + m.group(2), s, count=1)
if n != 1: sys.exit("   package.json: non trovo version")
open("package.json", "w").write(s2)
t = open("electron-builder.ts").read()
t2, k = re.subn(r'"--iteration", "\d+"', f'"--iteration", "{rev}"', t)
if k == 0: sys.exit("   electron-builder.ts: non trovo --iteration")
open("electron-builder.ts", "w").write(t2)
a = "orizon.eu/repo/arch/PKGBUILD"; u = open(a).read()
u2, j = re.subn(r"^pkgrel=.*$", f"pkgrel={rev}", u, count=1, flags=re.M)
if j != 1: sys.exit("   PKGBUILD: non trovo pkgrel")
open(a, "w").write(u2)
print(f"   package.json {json.loads(s2)['version']} | revisione {rev} ({k} pacchetti) | PKGBUILD pkgrel={rev}")
PY
}

p_compila() {
  LOG="$HOME/orizon-compilazione.log"
  echo "   qualche minuto (registro: $LOG)"
  nella_scatola "export SQLCIPHER_BUNDLED=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0; rm -rf dist; VARIANT_PATH=orizon.eu/release/build.json ${BUILD_CMD:-pnpm run build:64} > '$LOG' 2>&1" \
    || { tail -30 "$LOG"; echo "   COMPILAZIONE NON RIUSCITA"; return 1; }
  for f in "${PACCHETTI[@]}"; do [ -f "dist/$f" ] || { echo "   manca dist/$f"; return 1; }; done
  v=$(nella_scatola "dpkg-deb -f 'dist/${PACCHETTI[0]}' Version" | tail -1 | tr -d '\r')
  [ "$v" = "$DEBVER" ] || { echo "   il .deb ha la versione $v invece di $DEBVER"; return 1; }
  for f in "${PACCHETTI[@]}"; do echo "   $(du -h "dist/$f" | cut -f1)  $f"; done
}

p_repo() {
  if [ $PROVA = 1 ]; then
    rm -rf "$OUT"; cp -a --reflink=auto "$REPO_VERO" "$OUT"
    echo "   copia del repository in $OUT"
  fi
  nella_scatola "ORIZON_REPO_DIR='$OUT' bash orizon.eu/repo/prepara-repo.sh 2>&1 | grep -v GPG_TTY"
  grep -qx "Version: $DEBVER" "$OUT/deb/dists/stable/main/binary-amd64/Packages" || { echo "   il repository deb non contiene la $DEBVER"; return 1; }
}

p_arch() {
  distrobox enter "$SCATOLA_ARCH" -- bash -c "set -eo pipefail
    sudo pacman -S --needed --noconfirm base-devel pacman-contrib gnupg >/dev/null 2>&1 || true
    cd '$D' && ORIZON_REPO_DIR='$OUT' bash orizon.eu/repo/prepara-arch.sh"
  ls "$OUT"/arch/x86_64/orizon-desktop-"$VER"-"$REV"-x86_64.pkg.tar.zst >/dev/null 2>&1 \
    || { echo "   nel repository pacman non c'è orizon-desktop-$VER-$REV"; return 1; }
}

p_flatpak() {
  DEB="$OUT/deb/pool/main/orizon-desktop_${VER}_amd64.deb"
  SHA=$(sha256sum "$DEB" | cut -d' ' -f1)
  F=orizon.eu/flatpak
  if [ $PROVA = 1 ]; then mkdir -p "$TMP/progetto"; cp "$F"/* "$TMP/progetto/"; F="$TMP/progetto"; fi
  mkdir -p "$TMP/costruzione"
  python3 - "$F/$APP.yml" "$F/$APP.metainfo.xml" "$VER" "$VR" "$SHA" "$TMP/costruzione/$APP.yml" "$DEB" <<'PY'
import datetime, re, sys
man, meta, ver, vr, sha, locale, deb = sys.argv[1:8]
s = open(man).read()
s2, n = re.subn(r"(url: \S*/orizon-desktop_)[^_/\s]+(_amd64\.deb[ \t]*\n[ \t]*sha256: )[0-9a-f]{64}",
                lambda m: m.group(1) + ver + m.group(2) + sha, s)
if n != 1: sys.exit("   manifest Flatpak: non trovo url e sha256 del .deb")
open(man, "w").write(s2)
m = open(meta).read(); oggi = datetime.date.today().isoformat()
r = re.compile(r'<release version="' + re.escape(vr) + r'"[^>]*/>')
if r.search(m):
    m2 = r.sub(f'<release version="{vr}" date="{oggi}"/>', m, count=1)
else:
    m2, k = re.subn(r"<releases>", lambda x: x.group(0) + f'\n    <release version="{vr}" date="{oggi}"/>', m, count=1)
    if k != 1: sys.exit("   scheda Flatpak: non trovo <releases>")
open(meta, "w").write(m2)
# per costruire: il .deb dal disco (sul sito non c'è ancora)
l, k = re.subn(r"url: \S*/orizon-desktop_[^_/\s]+_amd64\.deb[ \t]*\n[ \t]*sha256: [0-9a-f]{64}", lambda x: "path: " + deb, s2)
if k != 1: sys.exit("   manifest Flatpak: non riesco a fare la copia per costruire")
open(locale, "w").write(l)
print(f"   manifest {ver} (.deb {sha[:16]}…), scheda {vr} del {oggi}")
PY
  cp "$F/orizon-avvio.sh" "$F/$APP.metainfo.xml" "$TMP/costruzione/"
  flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
  mkdir -p "$CACHE" "$OUT/flatpak"
  FLOG="$CACHE/build.log"
  echo "   costruisco (registro: $FLOG)"
  flatpak-builder --user --install-deps-from=flathub --force-clean --disable-rofiles-fuse \
    --state-dir="$CACHE/state" --repo="$OUT/flatpak" --default-branch=stable \
    --gpg-sign="$FPR" --gpg-homedir="$GNUPGHOME" \
    "$CACHE/build" "$TMP/costruzione/$APP.yml" > "$FLOG" 2>&1 || { tail -30 "$FLOG"; echo "   FLATPAK NON RIUSCITO"; return 1; }
  flatpak build-update-repo --generate-static-deltas --prune --prune-depth=3 \
    --gpg-sign="$FPR" --gpg-homedir="$GNUPGHOME" --title=Orizon "$OUT/flatpak" >/dev/null
  echo "   Flatpak pronto ($(du -sh "$OUT/flatpak" | cut -f1))"
}

p_pubblica() {
  if [ $PROVA = 1 ]; then echo "   prova: non pubblico"; return 0; fi
  agente
  ORIZON_REPO_DIR="$OUT" bash orizon.eu/repo/pubblica-repo.sh
  curl -fsS --max-time 30 "$URL/deb/dists/stable/main/binary-amd64/Packages" | grep -qx "Version: $DEBVER" \
    || { echo "   ATTENZIONE: online il repository deb non ha la $DEBVER"; return 1; }
  for f in "deb/pool/main/${PACCHETTI[0]}" "rpm/${PACCHETTI[1]}" arch/x86_64/orizon.db flatpak/summary orizon.flatpakref installa-arch.sh; do
    online "$URL/$f" && echo "   $URL/$f ok" || { echo "   ATTENZIONE: $URL/$f non risponde"; return 1; }
  done
}

p_sito() {
  agente
  if [ $PROVA = 0 ]; then
    echo "   carico pacman e tar.gz in $W/dl (circa 270 MB)"
    if command -v rsync >/dev/null && $SSH "$SERVER" "command -v rsync" >/dev/null 2>&1; then
      rsync -a --partial --chmod=F644 -e "$SSH" "dist/${PACCHETTI[2]}" "dist/${PACCHETTI[3]}" "$SERVER:$W/dl/"
    else
      for f in "${PACCHETTI[2]}" "${PACCHETTI[3]}"; do $SSH "$SERVER" "cat > '$W/dl/$f.part' && chmod 644 '$W/dl/$f.part' && mv '$W/dl/$f.part' '$W/dl/$f'" < "dist/$f"; done
    fi
  else
    echo "   prova: guardo la pagina di download senza cambiarla"
  fi
  $SSH "$SERVER" "VER='$VER' VR='$VR' W='$W' DRY='$PROVA' python3 -" <<'PY'
import datetime, hashlib, os, pathlib, re, sys, tarfile
ver = os.environ["VER"]; vr = os.environ["VR"]; w = pathlib.Path(os.environ["W"]); dry = os.environ.get("DRY") == "1"
dl = w / "dl"
if not dl.is_dir(): sys.exit(f"   manca {dl}")
if not dry and not os.access(dl, os.W_OK): sys.exit(f"   non posso scrivere in {dl}")
FISSI = {
    "orizon-desktop-linux-amd64.deb": f"../repo/deb/pool/main/orizon-desktop_{ver}_amd64.deb",
    "orizon-desktop-linux-x86_64.rpm": f"../repo/rpm/orizon-desktop-{ver}.x86_64.rpm",
    "orizon-desktop-linux-x86_64.pacman": f"orizon-desktop-{ver}.pacman",
    "orizon-desktop-linux-x64.tar.gz": f"orizon-desktop-{ver}.tar.gz",
}
MESI = {
    "it": "gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre",
    "en": "January February March April May June July August September October November December",
    "fr": "janvier février mars avril mai juin juillet août septembre octobre novembre décembre",
    "es": "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre",
    "de": "Januar Februar März April Mai Juni Juli August September Oktober November Dezember",
}
def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

# com'è adesso il sito: versione (dall'indirizzo fisso del .tar.gz) e impronte in SHA256SUMS
vecchia = None
t = dl / "orizon-desktop-linux-x64.tar.gz"
if t.is_symlink():
    m = re.fullmatch(r"orizon-desktop-(\d+\.\d+\.\d+)\.tar\.gz", os.path.basename(os.readlink(t)))
    if m: vecchia = m.group(1)
vecchi = {}
if (dl / "SHA256SUMS").is_file():
    for riga in (dl / "SHA256SUMS").read_text().splitlines():
        p = riga.split()
        if len(p) == 2 and re.fullmatch(r"[0-9a-f]{64}", p[0]): vecchi[p[1]] = p[0]
print(f"   sul sito ora: versione {vecchia or '?'}, {len(vecchi)} impronte in SHA256SUMS")

# indirizzi fissi e SHA256SUMS
nuovi = {}
if not dry:
    for nome, dest in FISSI.items():
        vero = (dl / dest).resolve()
        if not vero.is_file(): sys.exit(f"   manca {dest} sul server")
        nuovi[nome] = sha(vero)
    for nome, dest in FISSI.items():
        tmp = dl / (nome + ".nuovo")
        if tmp.is_symlink() or tmp.exists(): tmp.unlink()
        os.symlink(dest, tmp); os.replace(tmp, dl / nome)
        print(f"   /dl/{nome} -> {dest}")
    tmp = dl / "SHA256SUMS.nuovo"
    tmp.write_text("".join(f"{nuovi[n]}  {n}\n" for n in FISSI)); os.chmod(tmp, 0o644); os.replace(tmp, dl / "SHA256SUMS")

# pagine di download
pagine = []
for f in sorted(w.rglob("*.html")):
    parti = f.relative_to(w).parts
    if parti[0] == "repo" or parti[0].startswith("dl"): continue
    if 'href="/dl/orizon-desktop-linux-' in f.read_text(encoding="utf-8", errors="replace"): pagine.append(f)
if not pagine: sys.exit("   ERRORE: non trovo le pagine di download")
if not dry:
    copia = w.parent / f"www-prima-del-rilascio-{vr}.tgz"
    if not copia.exists():
        with tarfile.open(copia, "w:gz") as tf:
            for f in pagine: tf.add(f, arcname=str(f.relative_to(w)))
    print(f"   copia delle pagine: {copia}")
rx_ver = re.compile(r"(?<![\d.])" + re.escape(vecchia) + r"(?![\d])") if vecchia and vecchia != ver else None
oggi = datetime.date.today()
def nuova_data(s, lingua):
    if lingua not in MESI: return s
    mesi = MESI[lingua].split()
    rx = re.compile(r"\b(" + "|".join(mesi) + r")\b", re.I)
    def data(m):
        t = m.group(2)
        if not rx.search(t): return m.group(0)
        nuovo = mesi[oggi.month - 1]
        t = rx.sub(lambda x: nuovo if x.group(0)[0].isupper() == nuovo[0].isupper() else (nuovo.capitalize() if x.group(0)[0].isupper() else nuovo.lower()), t, count=1)
        t = re.sub(r"(?<!\d)\d{1,2}(?!\d)", str(oggi.day), t, count=1)
        t = re.sub(r"(?<!\d)20\d\d(?!\d)", str(oggi.year), t, count=1)
        return m.group(1) + t + m.group(3)
    return re.sub(r'(<div class="agg">)(.*?)(</div>)', data, s, count=1, flags=re.S)
avvisi = 0
for f in pagine:
    rel = f.relative_to(w); s = f.read_text(encoding="utf-8"); prima = s; note = []
    m = re.search(r'<html[^>]*\blang="([a-zA-Z]{2})', s)
    lingua = m.group(1).lower() if m else (rel.parts[0] if len(rel.parts) > 1 else "it")
    # versione: ovunque tranne nel riquadro "Aggiornamenti automatici" (lì la 1.12.27 è quella da cui partono gli aggiornamenti)
    if rx_ver:
        a = s.find('<h3 id="aggiornamenti"')
        if a < 0: a = b = len(s)
        else:
            b = s.find("<h3", a + 5)
            if b < 0: b = s.find("</section>", a)
            if b < 0: b = len(s)
        n = len(rx_ver.findall(s[:a])) + len(rx_ver.findall(s[b:]))
        s = rx_ver.sub(ver, s[:a]) + s[a:b] + rx_ver.sub(ver, s[b:])
        note.append(f"versione {vecchia} -> {ver}: {n} volte")
        if n == 0: avvisi += 1
    # impronte del .deb (e degli altri, se la pagina le mostra)
    nh = 0
    for nome, h in vecchi.items():
        if h in s:
            nh += s.count(h)
            if not dry and nuovi.get(nome) and nuovi[nome] != h: s = s.replace(h, nuovi[nome])
    note.append(f"impronte: {nh}")
    # data dell'ultimo aggiornamento
    s2 = nuova_data(s, lingua)
    if '<div class="agg">' not in s: note.append("data: non trovata"); avvisi += 1
    elif s2 != s: note.append("data aggiornata")
    s = s2
    if not dry and s != prima:
        tmp = f.with_name(f.name + ".nuovo"); tmp.write_text(s, encoding="utf-8")
        os.chmod(tmp, f.stat().st_mode & 0o777); os.replace(tmp, f)
    print(f"   {rel} [{lingua}]: " + ", ".join(note) + (" (prova: non cambiata)" if dry else ""))
if vecchia == ver: print(f"   stessa versione {ver}: cambiano solo impronte e data")

# file vecchi in /dl: tengo la versione nuova e quella di prima
tenere = {ver} | ({vecchia} if vecchia else set())
for p in sorted(dl.iterdir()):
    m = re.fullmatch(r"orizon-desktop-(\d+\.\d+\.\d+)\.(pacman|tar\.gz)", p.name)
    if m and p.is_file() and not p.is_symlink() and m.group(1) not in tenere:
        mb = p.stat().st_size // 1048576
        if dry: print(f"   da togliere: /dl/{p.name} ({mb} MB)")
        else: p.unlink(); print(f"   tolto /dl/{p.name} ({mb} MB)")
if avvisi: print(f"   ATTENZIONE: {avvisi} cose da controllare nella pagina (vedi sopra)")
PY
  if [ $PROVA = 0 ]; then
    curl -fsS --max-time 30 "$SITO/dl/SHA256SUMS" > "$TMP/somme"
    attese=("$(sha256sum "$OUT/deb/pool/main/${PACCHETTI[0]}" | cut -d' ' -f1)" "$(sha256sum "$OUT/rpm/${PACCHETTI[1]}" | cut -d' ' -f1)"
            "$(sha256sum "dist/${PACCHETTI[2]}" | cut -d' ' -f1)" "$(sha256sum "dist/${PACCHETTI[3]}" | cut -d' ' -f1)")
    i=0
    for n in orizon-desktop-linux-amd64.deb orizon-desktop-linux-x86_64.rpm orizon-desktop-linux-x86_64.pacman orizon-desktop-linux-x64.tar.gz; do
      grep -qx "${attese[$i]}  $n" "$TMP/somme" && online "$SITO/dl/$n" && echo "   $SITO/dl/$n ok" \
        || { echo "   ATTENZIONE: $SITO/dl/$n non risponde o ha un'impronta diversa"; return 1; }
      i=$((i + 1))
    done
  fi
}

p_git() {
  if [ $PROVA = 1 ]; then echo "   prova: non salvo niente"; return 0; fi
  git add package.json electron-builder.ts orizon.eu/repo/arch/PKGBUILD orizon.eu/flatpak
  [ -f orizon.eu/rilascia.sh ] && git add orizon.eu/rilascia.sh
  if git -c user.name="$(git config user.name || echo 'Gianluca Casale')" -c user.email="$(git config user.email || echo info@4orizon.eu)" \
       commit -q -m "Orizon desktop $VR"; then
    echo "   fatto: $(git log -1 --format='%h %s') (non inviato)"
  else
    echo "   niente da salvare"
  fi
}

p_snap() {
  Y="$SNAPDIR/snap/snapcraft.yaml"
  DEB_URL="$URL/deb/pool/main/${PACCHETTI[0]}"
  SHA=$(sha256sum "$OUT/deb/pool/main/${PACCHETTI[0]}" | cut -d' ' -f1)
  if [ $PROVA = 1 ]; then cp "$Y" "$TMP/snapcraft.yaml"; Y="$TMP/snapcraft.yaml"; fi
  python3 - "$Y" "$VR" "$DEB_URL" "$SHA" <<'PY'
import re, sys
p, vr, url, sha = sys.argv[1:5]; s = open(p).read()
s, a = re.subn(r"^version: .*$", f"version: '{vr}'", s, count=1, flags=re.M)
s, b = re.subn(r"^([ \t]*source: )\S+\.deb[ \t]*$", lambda m: m.group(1) + url, s, count=1, flags=re.M)
s, c = re.subn(r"^([ \t]*source-checksum: sha256/)[0-9a-f]{64}[ \t]*$", lambda m: m.group(1) + sha, s, count=1, flags=re.M)
if (a, b, c) != (1, 1, 1): sys.exit(f"   snapcraft.yaml: non trovo version, source o source-checksum ({a}{b}{c})")
open(p, "w").write(s); print(f"   snapcraft.yaml: versione {vr}, .deb {sha[:16]}…")
PY
  if [ $PROVA = 1 ]; then echo "   prova: non costruisco e non carico ($(snapcraft whoami 2>/dev/null | sed -n 's/^email: *//p'))"; return 0; fi
  online "$DEB_URL" || { echo "   $DEB_URL non risponde: prima va pubblicato il repository"; return 1; }
  (
    cd "$SNAPDIR"
    rm -f ./*.snap
    for x in '*.snap' '*.txt'; do grep -qxF "$x" .gitignore 2>/dev/null || echo "$x" >> .gitignore; done
    git add -A
    git -c user.name="$(git config user.name || echo 'Gianluca Casale')" -c user.email="$(git config user.email || echo info@4orizon.eu)" \
      commit -q -m "Snap $VR" >/dev/null 2>&1 || true
  )
  echo "   costruzione sui server di Canonical (10-20 minuti; se chiede di autorizzare Launchpad, apri l'indirizzo nel browser)"
  ( cd "$SNAPDIR" && snapcraft remote-build --launchpad-accept-public-upload --build-for=amd64 )
  S=$(ls -t "$SNAPDIR"/"$SNAP_NOME"_*_amd64.snap 2>/dev/null | head -1)
  [ -n "$S" ] || { echo "   SNAP NON COSTRUITO: guarda il registro *.txt in $SNAPDIR"; return 1; }
  echo "   costruito: $(basename "$S") ($(du -h "$S" | cut -f1))"
  snapcraft upload --release=stable "$S"
}

passo versione "Versione"                                       p_versione
passo compila  "Compilo deb, rpm, pacman e tar.gz"              p_compila
passo repo     "Repository deb e rpm firmato"                   p_repo
passo arch     "Repository pacman firmato (Arch, CachyOS)"      p_arch
passo flatpak  "Flatpak firmato"                                p_flatpak
passo pubblica "Pubblico il repository su $URL"                 p_pubblica
passo sito     "Sito: /dl, impronte, versione e data"           p_sito
passo git      "Salvo in git"                                   p_git
passo snap     "Snap Store"                                     p_snap
[ -z "$STATO" ] || [ -n "$SALTATI" ] || echo fine >> "$STATO"
min=$(( ($(date +%s) - INIZIO) / 60 ))
if [ $PROVA = 1 ]; then
  echo "== Prova finita in $min minuti: è andato tutto bene, non ho pubblicato niente."
  echo "   (la copia di prova del repository è in $OUT: puoi cancellarla con  rm -rf $OUT)"
else
  echo "== Orizon $VR rilasciata in $min minuti"
  echo "   sito:    $SITO/download"
  echo "   apt, dnf, pacman e flatpak la vedono al prossimo aggiornamento; lo Snap Store la distribuisce da solo"
  salta snap || echo "   snap:    https://snapcraft.io/$SNAP_NOME"
  [ -z "$SALTATI" ] || echo "   saltati:$SALTATI. Per farli dopo: bash $0 $ARG"
fi
