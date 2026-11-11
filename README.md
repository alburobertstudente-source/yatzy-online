# Yatzy Duello – versione online

Yatzy per due giocatori, rosso contro blu, con **carte potenziamento gratta e vinci**. Si gioca in due modi:

- **sullo stesso telefono** (NUOVA PARTITA): a ogni cambio turno il tavolo ruota di 180° verso l'altro giocatore;
- **online da due telefoni** (GIOCA ONLINE): uno crea la partita e manda il codice o il link, l'altro entra. Ognuno gioca dal proprio telefono e vede l'altro giocare in tempo reale.

## Link del gioco

- **https://yatzy-duello.onrender.com** (Render, si aggiorna da solo a ogni push su `main`, dalla cartella `dist/`)
- **https://yatzy-duello.vercel.app** (Vercel, copia di riserva)

Basta mandare uno dei due link agli amici. Per installarlo come app:

- **Android / Chrome**: apri il link, tocca **INSTALLA** nel menu del gioco, oppure ⋮ → **Installa app** / **Aggiungi a schermata Home**.
- **iPhone / Safari**: apri il link, tocca **Condividi** → **Aggiungi alla schermata Home**.

L'app installata si apre a schermo intero, con la sua icona; per giocare online serve internet.

Il repository va bene anche per **GitHub Pages** (Settings → Pages → Deploy from a branch, `main`, `/ (root)`).

## Come giocare online

1. Il primo apre il gioco e tocca **GIOCA ONLINE → CREA PARTITA**: compare un codice di 5 caratteri (per esempio `K7QPZ`).
2. Tocca **CONDIVIDI IL LINK** e lo manda all'amico (WhatsApp, SMS…), oppure gli detta il codice.
3. L'amico apre il link (entra da solo) oppure apre il gioco, tocca **GIOCA ONLINE** e scrive il codice.
4. Chi crea la partita gioca col **ROSSO** e inizia; chi entra gioca col **BLU**.

Durante la partita:

- quando non è il tuo turno vedi le mosse dell'altro (dadi, carte grattate, effetti) e i tuoi pulsanti restano grigi;
- in alto il tuo colore è segnato con **TU**;
- se la connessione cade (telefono bloccato, rete che cambia) compare "Connessione persa" e la partita riprende da sola appena i telefoni si ricollegano; se l'amico ricarica la pagina, riaprendo il link rientra nella stessa partita;
- a fine partita **RIVINCITA** fa ripartire subito una nuova partita per entrambi.

Come funziona: i telefoni si parlano direttamente (WebRTC, libreria [PeerJS](https://peerjs.com), inclusa in `vendor/`). Il server pubblico gratuito di PeerJS serve solo a farli trovare. Entrambi eseguono lo stesso motore con lo stesso seme casuale (scelto insieme dai due telefoni) e si scambiano solo le mosse; dopo ogni mossa confrontano un'impronta dello stato e, se qualcosa non torna, il telefono del rosso rimanda lo stato completo.

Per usare un server PeerJS proprio basta aggiungere all'indirizzo `?peerHost=mio.server.it&peerPort=443&peerSecure=1`.

## Giocare sullo stesso telefono, anche offline

- Copia `dist/index.html` sul telefono e aprilo con il browser: è un unico file (334 KB) con grafica, font, suoni e libreria online incorporati. Offline funziona la partita sullo stesso telefono; per l'online serve internet.
- Dal computer: `npm run dev` e apri `http://localhost:5173/`.

Il gioco è pensato per il telefono in verticale: in orizzontale compare l'invito a ruotarlo.

## Regole

| Casella | Punti |
|---|---|
| Uno … Sei | somma dei dadi di quel valore |
| Bonus | **+35** con almeno 63 punti nella parte sinistra (l'anello mostra `x/63`) |
| Tris (3×) | 3 uguali: somma di tutti i dadi |
| Poker (4×) | 4 uguali: somma di tutti i dadi |
| Full | tris + coppia: 25 |
| Scala piccola | 4 in fila: 30 |
| Scala grande | 5 in fila: 40 |
| Yatzy | 5 uguali: 50 |
| Chance | somma di tutti i dadi |

- Ogni turno: fino a **3 lanci**. Tocca un dado per **tenerlo** (bordo dorato e lucchetto): i dadi tenuti non vengono rilanciati.
- Tocca una casella libera: compare il punteggio in verde. Puoi cambiare idea; poi premi **SEGNA**.
- Ogni casella si usa una sola volta. Dopo 13 round vince chi ha più punti.
- **+100 YATZY BONUS**: ogni Yatzy dopo il primo (con 50 già segnato nella casella Yatzy) vale 100 punti in più, sommati subito al totale, con un'animazione dedicata e una **spunta** sopra la casella Yatzy del giocatore. Uno Yatzy aggiuntivo vale anche come jolly per Full e Scale.

## Tradizioni della casa

Tre momenti speciali con animazioni dedicate (si saltano con un tocco):

- **Contratto col Dottore** – quando un Full viene segnato nella casella Full: arriva il Dottore, la penna firma il contratto, il timbro "FIRMATO" sbatte sul foglio e il contratto finisce nella casella, che resta con la croce del Dottore.
- **Rifiuti il Dottore** – quando esce un Full ma lo si segna in un'altra casella (con il Full ancora libero): il Dottore ci resta male, il contratto si strappa in due e niente visita.
- **Rinuncia a Satana** – quando si mette 0 nella casella Yatzy: schermo rosso, fiamme e diavoletto, poi la luce lo scaccia in una nuvola di fumo, "RINUNCIO!" e un'aureola resta sulla casella Yatzy.

Quando esce un Full e la casella Full è libera compare anche l'avviso "FULL! IL DOTTORE TI ASPETTA". Nella schermata finale i distintivi ricordano chi ha firmato col Dottore e chi ha rinunciato a Satana.

## Carte potenziamento (gratta e vinci)

All'inizio di **ogni turno** il giocatore di turno gratta col dito una carta argentata e scopre un potenziamento casuale. Più della metà grattata, la carta si rivela con un effetto diverso per rarità. Le carte restano in mano (massimo 5: se ne arriva una sesta si sceglie quale scartare) e si usano toccandole durante il proprio turno, prima di segnare.

I dadi sono **equi per entrambi i giocatori**: nessun vantaggio nascosto. Anche le probabilità delle carte sono le stesse per tutti.

| Rarità | Probabilità | Carte |
|---|---|---|
| Comune | 52% | **Ritira Fortuna** – rilancia fino a 2 dadi (senza consumare lanci) · **Scudo di Legno** – protegge una casella da un attacco · **Occhio del Destino** – rivela il prossimo risultato di un dado prima di decidere · **Mano Veloce** – pesca una carta aggiuntiva |
| Rara | 28% | **Dado Truccato** – un dado +1 o −1 · **Furto di Fortuna** – ruba 10 punti da una casella avversaria · **Scudo Arcano** – protegge due caselle · **Doppio Lancio** – un lancio in più nel turno |
| Epica | 14% | **Maledizione del Caos** – al prossimo lancio l'avversario rilancia per forza due dadi non conservati · **Riscrittura del Destino** – trasforma un dado in un altro numero · **Saccheggio Reale** – ruba 25 punti · **Prigione Temporale** – blocca una carta avversaria per un turno |
| Leggendaria | 6% | **Mano degli Dei** – scegli il valore di tutti e cinque i dadi · **Rewind Temporale** – annulla l'ultimo effetto di una carta avversaria · **Apocalisse dei Dadi** – al prossimo lancio l'avversario rilancia tutti i dadi non conservati e un dado non si può conservare · **Corona del Destino** – raddoppia il punteggio del turno (massimo +50) |

Dettagli delle regole:

- **Furti**: si sceglie una casella avversaria già segnata; i punti tolti (al massimo il valore della casella) passano al ladro. Una casella con scudo blocca il furto e perde una carica di scudo. I furti non tolgono il bonus +35 già ottenuto né il diritto ai bonus +100 degli Yatzy.
- **Maledizioni**: una alla volta; il giocatore colpito la vede arrivare (segno viola) e può annullarla con Rewind Temporale prima di lanciare.
- **Rewind Temporale** annulla l'ultimo effetto avversario ancora annullabile: un furto (i punti tornano indietro), una maledizione non ancora scattata, una prigione, la Corona, gli scudi.
- Le probabilità e i limiti si cambiano in `src/config.js` (`CARD_RULES`).

## Struttura del progetto

```
src/
  config.js              regole, carte (probabilità e limiti), tempi delle animazioni
  core/                  logica pura, senza DOM
    scoring.js           calcolo dei punteggi di ogni categoria
    scorecard.js         tabella di un giocatore (+35, bonus Yatzy separato)
    dice.js              dadi, dadi tenuti, lanci rimasti
    probability.js       dadi equi (generatore crittografico)
    cards.js             le 16 carte e la pescata per rarità
    powers.js            effetti delle carte e Rewind Temporale
    memes.js             tradizioni della casa (Dottore, Satana)
    turns.js             ordine dei turni e round
    game.js              motore di gioco (eventi, salvataggio, impronta dello stato)
  net/                   modalità online
    peerLoader.js        carica PeerJS (vendor/peerjs.min.js)
    transport.js         stanze con codice, collegamento e riconnessione
    session.js           protocollo: seme comune, mosse, verifiche, ripresa, rivincita
  ui/                    interfaccia: stage scalato, tabella, vassoio dadi 3D,
                         pulsanti, intestazione, mano, gratta e vinci,
                         bersagli delle carte, schermate, controller
  anim/                  animazioni (dadi 3D, voli, rotazione), effetti ed effetti delle carte
  audio/sound.js         effetti sonori sintetizzati (Web Audio)
  styles/                CSS
scripts/                 build, server di sviluppo, test e2e, statistiche
tests/                   test unitari (node:test)
vendor/                  PeerJS (licenza MIT)
dist/index.html          versione compilata in un unico file
```

## Comandi

```
npm install          # esbuild, PeerJS e il server PeerJS per i test
npm run dev          # server locale su http://localhost:5173/
npm run build        # crea dist/index.html
npm test             # 69 test: punteggi, regole, turni, bonus, carte, tradizioni, partite online allineate
npm run test:e2e     # partita completa nel browser su vari schermi (richiede Playwright)
npm run test:online  # due "telefoni" che giocano online tramite un server PeerJS locale
npm run peer         # server PeerJS locale (porta 9000) per provare l'online senza internet
```

`npm run test:online` apre due browser separati e controlla: creazione della partita e ingresso dal link, una partita intera con stati identici dopo ogni turno, chi non è di turno non può giocare, caduta della connessione con riconnessione automatica, ricarica della pagina con ripresa, correzione automatica di uno stato divergente, rivincita, avviso quando l'altro esce, codice sbagliato.

`npm run test:e2e` controlla: layout su 7 dimensioni di schermo, carte grattate col dito, una partita completa giocata toccando l'interfaccia e usando le carte con verifica di dadi, caselle e totali, rotazione del tavolo, furti, scudi, maledizioni, prigione, Dottore e Satana, +35, +100 con spunte, salvataggio e ripresa, fluidità a 60 fps con CPU rallentata 4×. Per verificare la versione compilata: `E2E_PAGE=dist/index.html npm run test:e2e`.

## Note

La grafica (icone, dadi, colori, logo) è originale: riprende flusso di gioco, disposizione della tabella e animazioni del riferimento, senza copiarne le immagini. Il font è [Fredoka](https://fonts.google.com/specimen/Fredoka) (SIL Open Font License, vedi `assets/fonts/OFL.txt`).
