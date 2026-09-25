<p align="center">
  <a href="https://4orizon.eu"><img src="https://4orizon.eu/orizon-icona-store.png" width="96" alt="Orizon"></a>
</p>

<h1 align="center">Orizon per Linux</h1>

<p align="center">
  Messaggistica cifrata end-to-end, senza numero di telefono e senza pubblicità.<br>
  <a href="https://4orizon.eu">4orizon.eu</a> · <a href="https://4orizon.eu/download">Scarica</a> · <a href="https://4orizon.eu/cifratura">Come proteggiamo le chat</a>
</p>

---

Questa è l'applicazione desktop di **Orizon** per Linux. Si collega al servizio Orizon e usa la
stessa cifratura del client web: i messaggi vengono cifrati sul tuo computer e riaperti solo sul
dispositivo di chi li riceve.

## Installazione

Scarica l'ultima versione dalla pagina delle [release](https://github.com/imcasale/orizon-desktop/releases/latest)
o da [4orizon.eu/download](https://4orizon.eu/download).

**Debian, Ubuntu e derivate (64 bit)**

```bash
sudo apt install ./orizon-desktop_<versione>_amd64.deb
```

**Altre distribuzioni**: scarica l'archivio `.tar.gz`, scompattalo e avvia l'eseguibile che trovi dentro.

Prima di installare puoi verificare il file confrontando la sua impronta SHA-256 con quella
pubblicata nella release:

```bash
sha256sum orizon-desktop_<versione>_amd64.deb
```

## Su cosa è costruito

Orizon per Linux è una versione di [Element Desktop](https://github.com/element-hq/element-desktop),
sviluppato da New Vector Ltd e distribuito con licenza AGPL-3.0. Le modifiche di Orizon riguardano
nome, marchio, aspetto e configurazione del servizio. **Il livello crittografico non è stato toccato.**

Orizon non è affiliato a New Vector Ltd né sponsorizzato da Element. I rispettivi marchi
appartengono ai loro titolari.

## Compilare dai sorgenti

Il procedimento è quello del progetto di origine: trovi le istruzioni nella cartella [`docs/`](../docs).
Il ramo di sviluppo di Orizon è `orizon`.

## Sicurezza

Se trovi una vulnerabilità, scrivi a **security@4orizon.eu** prima di renderla pubblica.
Rispondiamo entro settantadue ore.

## Licenza

AGPL-3.0, come il progetto da cui deriva. Il testo completo è nel file [`LICENSE`](../LICENSE).
I marchi e i loghi Orizon non rientrano nella licenza del software.
