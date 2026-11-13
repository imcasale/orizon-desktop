#!/usr/bin/env python3
"""Prepara la cartella webapp/ dell'app desktop Orizon.

Parte dal pacchetto ufficiale di Element Web e ci mette sopra il brand di Orizon,
uguale a quello di app.4orizon.eu (che lì aggiunge Caddy):

  brand/orizon.css, brand/orizon.js, brand/translations.json, brand/pages/*
  vector-icons/*                      icone
  themes/element/img/logos/*          logo nella pagina di accesso
  img/element-desktop-logo*.svg       logo bianco
  config.json                         orizon.eu/release/config.json

e nell'index.html collega orizon.css e orizon.js e mette il titolo Orizon.

Uso, dalla cartella del repository:
  python3 orizon-brand/prepara-webapp.py element-v1.12.27.tar.gz
poi:
  pnpm run asar-webapp
"""
import hashlib
import json
import pathlib
import shutil
import sys
import tarfile
import tempfile

QUI = pathlib.Path(__file__).resolve().parent          # orizon-brand/
REPO = QUI.parent
WEBAPP = REPO / "webapp"
CONFIG = REPO / "orizon.eu" / "release" / "config.json"


def esci(msg):
    print("ERRORE:", msg)
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        esci("indica il pacchetto di Element Web, per esempio element-v1.12.27.tar.gz")
    pacchetto = pathlib.Path(sys.argv[1]).resolve()
    if not pacchetto.is_file():
        esci(f"non trovo {pacchetto}")
    attesa = sys.argv[2] if len(sys.argv) > 2 else ""
    if attesa:
        h = hashlib.sha256(pacchetto.read_bytes()).hexdigest()
        if h != attesa:
            esci(f"il pacchetto di Element non è quello giusto (sha256 {h})")
        print("pacchetto Element verificato")

    # 1. Element Web pulito
    with tempfile.TemporaryDirectory() as t:
        with tarfile.open(pacchetto) as tf:
            for m in tf.getmembers():
                if m.name.startswith("/") or ".." in pathlib.PurePosixPath(m.name).parts:
                    esci(f"percorso non valido nel pacchetto: {m.name}")
            try:
                tf.extractall(t, filter="data")
            except TypeError:  # Python senza filtri per tar
                tf.extractall(t)
        cartelle = [p for p in pathlib.Path(t).iterdir() if p.is_dir()]
        if len(cartelle) != 1 or not (cartelle[0] / "index.html").is_file():
            esci("il pacchetto non sembra Element Web")
        if WEBAPP.is_symlink() or WEBAPP.is_file():
            WEBAPP.unlink()
        elif WEBAPP.exists():
            shutil.rmtree(WEBAPP)
        shutil.copytree(cartelle[0], WEBAPP)
    versione = (WEBAPP / "version").read_text().strip() if (WEBAPP / "version").exists() else "?"
    print("Element Web", versione)

    # 2. brand
    b = WEBAPP / "brand"
    (b / "pages").mkdir(parents=True, exist_ok=True)
    for f in ["orizon.css", "orizon.js", "orizon-chiamata.css", "orizon-chiamata.js", "translations.json"]:
        shutil.copy2(QUI / f, b / f)
    for f in (QUI / "pages").glob("*.html"):
        shutil.copy2(f, b / "pages" / f.name)
    for f in (QUI / "vector-icons").iterdir():
        shutil.copy2(f, WEBAPP / "vector-icons" / f.name)
    for f in (QUI / "logos").iterdir():
        shutil.copy2(f, WEBAPP / "themes" / "element" / "img" / "logos" / f.name)
    (WEBAPP / "img").mkdir(exist_ok=True)
    for f in (QUI / "img").iterdir():
        shutil.copy2(f, WEBAPP / "img" / f.name)
    shutil.copy2(QUI / "manifest.json", WEBAPP / "manifest.json")

    # 3. index.html: tema e script di Orizon, titolo
    idx = WEBAPP / "index.html"
    html = idx.read_text(encoding="utf-8")
    for pezzo in ["</head>", "</body>", "<title>Element</title>"]:
        if html.count(pezzo) != 1:
            esci(f"index.html: non trovo una sola volta {pezzo}")
    html = (html.replace("</head>", '<link rel="stylesheet" href="brand/orizon.css"></head>')
                .replace("</body>", '<script src="brand/orizon.js"></script></body>')
                .replace("<title>Element</title>", "<title>Orizon</title>"))
    idx.write_text(html, encoding="utf-8")

    # 3b. la chiamata (Element Call dentro Orizon): stesso vetro e stessa goccia dell'app Android
    ec = WEBAPP / "widgets" / "element-call" / "index.html"
    if ec.is_file():
        h = ec.read_text(encoding="utf-8")
        if "orizon-chiamata" not in h:
            if h.count("</head>") != 1 or h.count("</body>") != 1:
                esci("widgets/element-call/index.html: non trovo </head> o </body>")
            h = (h.replace("</head>", '<link rel="stylesheet" href="../../brand/orizon-chiamata.css"></head>')
                  .replace("</body>", '<script src="../../brand/orizon-chiamata.js"></script></body>'))
            ec.write_text(h, encoding="utf-8")
        print("chiamata: stile di Orizon collegato a Element Call")
    else:
        print("ATTENZIONE: in questo Element Web non c'e' Element Call (widgets/element-call), la chiamata resta com'e'")

    # 4. configurazione dell'app desktop
    c = json.loads(CONFIG.read_text(encoding="utf-8"))
    (WEBAPP / "config.json").write_text(json.dumps(c, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")

    # 5. controllo
    manca = [p for p in ["brand/orizon.css", "brand/orizon.js", "brand/orizon-chiamata.css", "brand/orizon-chiamata.js", "brand/translations.json", "brand/pages/welcome.html",
                         "vector-icons/512.png", "config.json"] if not (WEBAPP / p).is_file()]
    if manca:
        esci("mancano: " + ", ".join(manca))
    print("webapp pronta:", sum(1 for _ in WEBAPP.rglob("*")), "file;",
          "traduzioni:", len(json.loads((b / "translations.json").read_text(encoding="utf-8"))),
          "| tema:", c.get("default_theme"), "| bolle:", c.get("setting_defaults", {}).get("layout"))


if __name__ == "__main__":
    main()
