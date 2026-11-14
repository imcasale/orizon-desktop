#!/usr/bin/env python3
"""Controlla che l'Element Web dentro webapp/ abbia ancora tutto quello su cui si appoggia Orizon.

Orizon (orizon.css, orizon.js, orizon-chiamata.*) sta SOPRA a Element senza toccarne il codice:
riconosce le parti dell'interfaccia dai loro nomi (mx_..., data-testid) e usa il client Matrix
che Element mette a disposizione (mxMatrixClientPeg, mxDispatcher).
Finché si usa la stessa versione di Element (1.12.27, fissata con lo sha256) non cambia niente.
Se un giorno si passa a una versione nuova, questo controllo dice subito cosa non c'è più,
prima di compilare e rilasciare.

Lo lancia prepara-webapp.py alla fine; si può lanciare anche da solo:
  python3 orizon-brand/controlla-element.py [cartella webapp]
Se manca qualcosa si ferma con errore; per andare avanti lo stesso: ORIZON_IGNORA_CONTROLLI=1
"""
import os
import pathlib
import sys

# cosa serve -> a quale parte di Orizon
ELEMENT = [
    ("mxMatrixClientPeg", "Avvia conversazione, Nuova stanza, Elenco, Invita, pannello info"),
    ("mxDispatcher", "il + e le schermate che aprono le stanze"),
    ("mxSdkContext", "pannello info (stanza aperta)"),
    ("mxSettingsStore", "bolle e tema"),
    ("view_start_chat_or_reuse", "aprire una chat da Avvia conversazione"),
    ("view_create_chat", "il + quando le schermate di Orizon non si possono aprire"),
    ("view_user_settings", "la foto in alto (impostazioni)"),
    ("view_room", "aprire una stanza"),
    ("mx_RoomListPanel", "colonna di sinistra (titolo, pillola in basso)"),
    ("mx_RoomListItemView", "lista delle chat"),
    ("primary-filters", "filtri e la loro goccia"),
    ("room-list-search", "il tasto cerca in alto"),
    ("mx_RoomHeader_infoWrapper", "intestazione della chat"),
    ("mx_RoomSummaryCard_container", "tasti tondi Silenzia/Chiama/Video"),
    ("mx_RoomSummaryCard_alias", "indirizzo della persona nel pannello info"),
    ("mx_TabbedView_tabLabel", "sezioni delle impostazioni in pillola"),
    ("mx_TabbedView_tabPanelContent", "impostazioni che scorrono sotto la pillola"),
    ("mx_SettingsDialog_content", "impostazioni che scorrono sotto la pillola"),
    ("mx_SettingsSubsection", "isole delle impostazioni"),
    ("mx_MessageComposer_sendMessage", "tasto per inviare"),
    ("mx_SpacePanel", "scheda Spazi"),
    ("mx_MessageComposer_Menu", "il menu che esce dal + della chat"),
    ("mx_IconizedContextMenu_optionList", "la voce Allegato nel menu del +"),
    ("mx_ContextualMenu_background", "il velo scuro dietro al menu del +"),
    ("mx_MessageComposer_closeButtonMenu", "il + che diventa una x"),
    ("data-radix-popper-content-wrapper", "come entrano ed escono i menu"),
    ("mx_Dialog_wrapper", "come entrano ed escono le finestre"),
    ("mx_JumpToBottomButton_scrollDown", "il tasto tondo per tornare in fondo"),
    ("mx_SpotlightDialog_searchBox", "il campo di ricerca"),
    ("mx_RoomSummaryCard_search", "la ricerca nel pannello delle info"),
    ("mx_InviteDialog_editor", "invita: campo con le persone scelte"),
    ("mx_IncomingCallToast_actionButton", "chiamata in arrivo: pillole rossa e verde"),
    ("_picker_", "il pannello delle emoji"),
    ("_anchorSelected_", "la goccia nelle categorie delle emoji"),
    ("_richItem_", "invita: le persone nelle isole"),
    ("_inline-field_", "impostazioni: il velo sotto le righe"),
]
CHIAMATA = [
    ("footer-container", "pillola della chiamata"),
    ("incall_mute", "tasto del microfono"),
    ("incall_videomute", "tasto della fotocamera"),
    ("incall_leave", "tasto rosso per chiudere"),
    ("incall_screenshare", "condivisione dello schermo"),
]
CHIAMATA_CSS = [
    ("@layer normalize", "microfono e fotocamera bianchi anche quando sono disattivati"),
    ("_buttons_", "pillola della chiamata"),
    ("_menuButton_", "freccina dei dispositivi"),
]


def leggi(cartella, estensioni):
    testo = []
    for f in cartella.rglob("*"):
        if f.suffix in estensioni and f.is_file() and not f.name.endswith(".map"):
            try:
                testo.append(f.read_text(encoding="utf-8", errors="ignore"))
            except OSError:
                pass
    return "\n".join(testo)


def controlla(webapp):
    webapp = pathlib.Path(webapp)
    mancano = []
    js = leggi(webapp / "bundles", {".js", ".css"})
    if not js:
        mancano.append(("bundles/", "tutto: non trovo il codice di Element"))
    for parola, cosa in ELEMENT:
        if parola not in js:
            mancano.append((parola, cosa))
    ec = webapp / "widgets" / "element-call"
    if ec.is_dir():
        ecjs = leggi(ec / "assets", {".js"})
        eccss = leggi(ec / "assets", {".css"})
        for parola, cosa in CHIAMATA:
            if parola not in ecjs:
                mancano.append(("Element Call: " + parola, cosa))
        for parola, cosa in CHIAMATA_CSS:
            if parola not in eccss:
                mancano.append(("Element Call: " + parola, cosa))
    versione = (webapp / "version").read_text().strip() if (webapp / "version").exists() else "?"
    n = len(ELEMENT) + len(CHIAMATA) + len(CHIAMATA_CSS)
    if not mancano:
        print(f"Orizon sopra Element {versione}: c'è tutto quello che serve ({n} controlli)")
        return True
    print(f"ATTENZIONE: in Element {versione} sono cambiate cose su cui si appoggia Orizon:")
    for parola, cosa in mancano:
        print(f"  - non trovo «{parola}»  ->  {cosa}")
    print("Con Element 1.12.27 va tutto; con questa versione quelle parti vanno sistemate prima di rilasciare.")
    return False


if __name__ == "__main__":
    dove = globals().get("WEBAPP") or (sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent / "webapp")
    ok = controlla(dove)
    if not ok and os.environ.get("ORIZON_IGNORA_CONTROLLI") != "1":
        sys.exit(1)
