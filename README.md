# Yatzy Duello – versione online

Yatzy per due giocatori, rosso contro blu, con **carte potenziamento gratta e vinci**, **campagna con 100 livelli e 10 boss**, **negozio con casse**, **230 oggetti**, **musica** e **rango online**. Si gioca in tre modi:

- **sullo stesso telefono** (NUOVA PARTITA): a ogni cambio turno il tavolo ruota di 180° verso l'altro giocatore;
- **online da due telefoni** (GIOCA ONLINE): uno crea la partita e manda il codice o il link, l'altro entra. Ognuno gioca dal proprio telefono e vede l'altro giocare in tempo reale;
- **campagna** da soli: sfide "in tot lanci" e boss contro il computer.

## Link del gioco

- **https://yatzy-duello.onrender.com** (Render, sito statico dalla cartella `dist/`: dopo un push su `main` va ripubblicato con *Manual Deploy* nel pannello di Render, oppure collegando GitHub a Render)
- **https://yatzy-duello.vercel.app** (Vercel: gioco + server degli account, costruito da `main`)

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

## Menu, account e progressi

All'apertura i dadi rotolano sul tavolo, la scritta **YATZY** scoppia e compare **GIOCA**, tutto con la sua sigla (vedi *Musica e suoni*); poi il menu principale: campagna, online, 2 giocatori, negozio, personalizza, profilo, classifica, regole, offerte del giorno e statistiche.

- **Account** (nome utente + password): serve per il **negozio** e per giocare **online**. Senza account si gioca come ospite (campagna e 2 giocatori); creando l'account i progressi da ospite passano all'account. Entrando da un altro telefono si ritrovano monete, oggetti, campagna e rango.
- **Monete**: si guadagnano coi livelli della campagna (di più per quelli difficili e con più stelle; le ripetizioni valgono un quarto), coi boss (da 400 a 1750) e online (vittoria 140, pareggio 60, sconfitta 30).
- **Livello del giocatore**: l'esperienza sale giocando (livelli, boss, partite online e sullo stesso telefono, casse aperte).
- **Account `robertalbuss`**: ha tutto sbloccato, cioè tutti i 230 oggetti e tutti i 100 livelli della campagna (il nome vale anche con maiuscole diverse). Lo sblocco avviene in `normalizeProfile`, quindi sia sul telefono sia sul server degli account; l'elenco dei nomi è `UNLOCK_ALL_USERS` in `src/meta/profile.js`.

## Negozio e casse

- **Cassa gratuita** ogni 24 ore (un oggetto e qualche moneta).
- **Cassa piccola** (150 monete, 1 oggetto), **media** (450, 2 oggetti, almeno uno Non comune), **grande** (1200, 3 oggetti, almeno uno Raro): più la cassa è grande, più conviene e più sono probabili le rarità alte; solo media e grande possono dare un dado **Assurdo**. Le probabilità sono nel negozio.
- **Offerte del giorno**: 4 oggetti comprabili direttamente, cambiano a mezzanotte.
- Gli oggetti doppi diventano monete.

## Casinò Yatzy

Nel negozio c'è l'ingresso del **casinò**: si entra dalle porte, il croupier (occhiali, baffi, gilet e coppa d'oro) accoglie, si sceglie una fiche (10, 50, 100, 500, 1000) e si punta sul panno verde:

| Puntata | Vince se | Paga |
|---|---|---|
| SOTTO | somma dei 5 dadi da 5 a 17 | 2× (50%) |
| SOPRA | somma da 18 a 30 | 2× (50%) |
| PARI / DISPARI | somma pari / dispari | 2× (50%) |
| TRIS | almeno 3 dadi uguali | 4× (21%) |
| SCALA | scala grande | 30× (3,1%) |
| YATZY | 5 dadi uguali | 1000× (0,08%) |

Il croupier agita la coppa, la sbatte sul tavolo e scopre 5 dadi di marmo rosa: la somma si conta dado per dado, le caselle vincenti si illuminano, le fiche perse vanno al banco e quelle vinte volano sul saldo. Ogni vincita ha il suo suono (scatto della cassa, monete che tintinnano e fanfara; per le vincite grosse una cascata di monete più lunga e campanelli), ogni perdita il suo (fiche spazzate via e un "uà-uà-uà-uààà" triste). La linea SOTTO/SOPRA è a 17,5 perché con 5 dadi la somma va da 5 a 30 ed è simmetrica attorno a 17,5: solo così le due scommesse sono esattamente al 50% (con la linea a 15, SOPRA vincerebbe circa 9 volte su 10). Si usano solo le monete del gioco.

## Personalizza

230 oggetti in 7 rarità (Comune, Non comune, Rara, Epica, Leggendaria, Mitica e **Assurda**):

- **Dadi** (80 skin, tutte lucide e ognuna col **suo suono**): classici colorati, legno, marmo, gemme, oro; a tema **Pop It** (scoppiettano), **Pizza Margherita** (punti di salame, crosta croccante), **Anguria** (semini, succosa), **Biscotto** (gocce di cioccolato, croccante), **Formaggio** (buchi), **Ciambella** (codette), **Sushi**, **Paperella** (squittisce), **Pallone**, **Slime**, **Orsetto Gommoso** (boing), **Zampetta** e **Gattino** (miao), **Dollaroni** (monete), **Arcade** (8-bit), **Dadi Musicali** (ogni faccia suona una nota: i dadi fanno una melodia), **Gran Pianoforte** (accordo), **Batteria** (ogni faccia è un tamburo), **Acquario** (bolle), **Tempesta** (tuoni), **Zucca**, **Pianeta**, **Lampada Lava**, **Ologramma**…
- **Dadi Assurdi** (la rarità più alta, solo nelle casse media 0,2% e grande 0,8%): effetti enormi quando atterrano, con suono dedicato: **Dado DJ** (equalizzatore e bass drop), **Buco Nero** (risucchia e fa tremare il vassoio), **Unicorno** (arcobaleno e arpa magica), **Fenice** (fiammata), **Dado Infinito** (caleidoscopio e anelli), **Palla da Discoteca** (luci), **Dinamite** (esplosione), **Gatto Cosmico** (MIAO!), **Tsunami** (onda), **Festa Pazza** (coriandoli e trombetta)
- **Animazioni di lancio** (15, ognuna col suo rumore: super rimbalzo, vortice, bolle, coriandoli, razzo, meteora, fulmine, glitch, portale, stelle cadenti, scia arcobaleno, buco nero…)
- **Carte** (14 skin, anche olografiche, arcobaleno e prisma: cambiano la lamina da grattare e il suono quando gratti)
- **Tavolo** (13 temi, ognuno col suo sottofondo: uccellini, onde, grilli, vento, vulcano, spazio, città neon, arpa…)
- **Avatar**: parte standard e si veste con cappelli, accessori del viso, magliette, pantaloni, scarpe, ali/mantelli; carnagione libera
- **Profilo**: cornici e titoli

In partita ognuno tira con i propri dadi e la propria animazione (online si vedono e si sentono quelli dell'avversario).

## Musica e suoni

Tutto è sintetizzato dal vivo (Web Audio, nessun file audio):

- **sigla dell'intro**: rullo di tamburi che cresce mentre i dadi entrano rotolando, colpo d'orchestra (piatto, ottoni, cassa) quando scoppia la scritta YATZY, poi un tema allegro (marimba, basso, battiti di mani) fino a GIOCA, quando parte la musica del menu. Se il browser blocca l'audio, prima dell'intro compare **TOCCA PER INIZIARE**: il tocco sblocca i suoni e l'intro parte con la musica;
- **musica rilassante** nel menu (lo-fi: piano elettrico, basso morbido, spazzole, fruscio del vinile), **ambient** tranquilla durante le partite e **musica da scontro** contro i boss (batteria, basso incalzante, accordi minori; più veloce per i boss finali), con dissolvenza tra un brano e l'altro;
- **ogni mondo della campagna ha la sua canzone** con i rumori del posto, che cambia scorrendo la cartina e resta durante le sfide del mondo:

  | Mondo | Musica | Ambiente |
  |---|---|---|
  | 1. Stagno | kalimba e marimba morbide | ruscello, grilli, gocce, ranocchi |
  | 2. Spiaggia | ukulele, steel drum, shaker | onde e gabbiani |
  | 3. Bosco nebbioso | arpa, flauto, pad misterioso | vento, gufi, grilli |
  | 4. Ghiaccio | carillon e celesta | vento gelido, cristalli che tintinnano |
  | 5. Mari del pirata | canzone marinaresca con fisarmonica | onde, scricchiolii della nave, gabbiani |
  | 6. Deserto del drago | liuto, tamburo a cornice, bordone | vento |
  | 7. Torre del caos | arpeggi elettronici, sub basso | ronzio, scintille, folate |
  | 8. Castello oscuro | organo, clavicembalo, campana | vento, corvi, grilli |
  | 9. Cieli in tempesta | archi in tremolo, timpani | pioggia e tuoni |
  | 10. Trono dei dadi | fanfara di ottoni, timpani, clavicembalo | arpa e campanelli |

- **casinò**: jazz in swing (walking bass, spazzole, piano elettrico) con brusio della sala, fiche e slot machine in sottofondo, più i suoni di vincita e perdita;
- effetti **ASMR**: dadi con colpo nitido, corpo morbido, stereo e un filo di riverbero; tocchi a bolla; ogni skin dei dadi ha agitazione, atterraggio e "tieni" diversi;
- in Impostazioni ci sono **Musica** e **Suoni** separati (il pulsante audio in partita spegne tutto). La musica parte al primo tocco, come richiedono i browser.

## Campagna

100 livelli in 10 mondi, ognuno con la sua **cartina disegnata vista dall'alto**: lo stagno del Re Ranocchio (ninfee sotto ogni livello, canne, fiori di loto, girini, libellule), la spiaggia del granchio (mare, isolotti di sabbia, conchiglie, ombrelloni), il bosco nebbioso (ceppi, funghi, lucciole), le montagne di ghiaccio (lastre di ghiaccio, pupazzi di neve), i mari del pirata (isolotti, nave, tesoro), il deserto del drago (piramide, oasi, oro), la torre del caos (rocce volanti, cristalli), il castello oscuro (lastre di pietra, lapidi, pipistrelli), i cieli in tempesta (nuvole, fulmini, pioggia) e il trono dei dadi (marmo, tappeto rosso). Ogni livello è una moneta d'oro con 3 stelle, il tuo avatar sta sul livello attuale e il boss aspetta in fondo dentro una grande moneta.

I livelli normali sono sfide "realizza qualcosa in tot lanci" (per esempio *Full + Scala grande in 15 lanci*): si tengono i dadi come nel gioco, si tocca l'obiettivo quando è pronto e i dadi ripartono; le stelle dipendono dai lanci avanzati. I lanci di ogni livello sono tarati con un giocatore automatico: si passa dal 97% di vittorie dei primi livelli al 45% circa dell'ultimo mondo (`scripts/gen-levels.mjs`).

Ogni 10 livelli c'è un **boss**: una partita intera (13 round, senza carte) contro il computer, sempre più bravo, con un potere strano:

| Boss | Potere |
|---|---|
| Re Ranocchio | dopo il tuo primo lancio un dado salta e cambia faccia |
| Granchio Pinzetta | a ogni turno un dado non si può tenere |
| Strega Nebbiolina | niente anteprime dei punti, il suo punteggio è nascosto |
| Golem di Ghiaccio | dopo il primo lancio un dado si congela per tutto il turno |
| Capitan Specchio | all'ultimo lancio un dado si capovolge (6↔1, 5↔2, 4↔3) |
| Drago Avaro | ogni 3 round ti ruba 8 punti dalla casella migliore |
| Mago del Caos | a ogni turno una tua casella è maledetta |
| Conte Vampiro | il tuo bonus richiede 73 punti; ogni tuo 0 gli dà 10 punti |
| Regina Tempesta | nei round pari hai solo 2 lanci e un dado non si può tenere |
| Signore dei Dadi | 2 lanci nei round pari, un dado non si può tenere, ogni 4 round ti ruba 10 punti |

## Rango online

Ogni partita online cambia il rango (Bronzo, Argento, Oro, Platino, Diamante, Maestro, Campione, Leggenda): si sale di più battendo chi ha più punti. A fine partita si vedono monete e punti rango guadagnati; la **classifica** mostra i migliori 50.

## Dove stanno i dati

Gli account sono su Vercel: le funzioni in `api/` (registrazione, accesso, profilo, classifica) salvano i dati in un archivio Vercel Blob privato; le password sono salvate solo come impronta (scrypt con sale) e l'accesso usa un gettone firmato (`AUTH_SECRET`). Il gioco su Render chiama l'API su `yatzy-duello.vercel.app`. Il profilo resta anche sul telefono, così si gioca senza rete e si sincronizza appena torna.

## Giocare sullo stesso telefono, anche offline

- Copia `dist/index.html` sul telefono e aprilo con il browser: è un unico file (circa 510 KB) con grafica, font, suoni e libreria online incorporati. Offline funziona la partita sullo stesso telefono; per l'online serve internet.
- Dal computer: `npm run dev` e apri `http://localhost:5173/` (anche le API degli account girano in locale, dati in `.data/`). Con `?classic` si apre direttamente il vecchio menu a 2 giocatori.

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

60 carte in 6 rarità: carte d'**attacco**, carte di **difesa e reazione** (Specchio Riflesso, Contrattacco, Antidoto), carte che cambiano i **lanci**, carte che aumentano i **punteggi** e carte da **combo** e **rimonta**. Ogni carta ha una forza adatta alla sua rarità (misurata col bot: `node scripts/card-balance.mjs`).

**Rimonta**: chi all'inizio del proprio turno è indietro di 60 punti o più gratta una carta in più (vale per entrambi i giocatori).

| Rarità | Probabilità | Carte |
|---|---|---|
| Comune (11) | 44,9% | **Ritira Fortuna** – Rilancia fino a 3 dadi senza consumare un lancio. · **Scudo di Legno** – Protegge due caselle da un attacco. · **Occhio del Destino** – Rivela il prossimo risultato di TUTTI i dadi non conservati: sai già cosa uscirà. · **Mano Veloce** – Pesca una carta aggiuntiva. · **Sabotaggio** – Blocca una casella libera dell'avversario per tutto il suo prossimo turno e ti dà 5 punti. · **Spicciolo Fortunato** – Il punteggio di questo turno vale 8 punti in più (se non è zero). · **Sei Fortunato** – Il dado più basso sale di 2 (fino a 6). · **Spinta Gentile** – Tutti gli 1 diventano 2 e tutti i 2 diventano 3. · **Pacca sulla Spalla** – Guadagni subito 6 punti. · **Rimbalzo** – Rilancia tutti i dadi non conservati senza consumare un lancio. · **Antidoto** – Cancella maledizioni, sabotaggi, Mezza Luna, Trappole e Catene che ti colpiscono; in più 5 punti. |
| Rara (18) | 28% | **Dado Gemello** – Scegli due dadi: il primo diventa uguale al secondo. · **Dado Truccato** – Modifica il risultato di un dado di +1 o −1 e pesca una carta. · **Furto di Fortuna** – Ruba 10 punti all'avversario. · **Scudo Arcano** – Protegge tre caselle dagli effetti nemici. · **Doppio Lancio** – Permette un rilancio aggiuntivo in questo turno. · **Gelo Eterno** – Al prossimo lancio dell'avversario due dadi si congelano: non potrà conservarli in quel turno. · **Mano Lesta** – Ruba una carta dalla mano dell'avversario. · **Lancio Benedetto** – Ai prossimi due lanci i dadi che fanno 1 o 2 vengono rilanciati da soli. · **Calamita** – Scegli un dado: un altro dado a caso diventa uguale. · **Rete di Salvataggio** – Se in questo turno segni 0, ricevi comunque 20 punti. · **Tassa del Re** – Ruba 3 punti da ognuna delle tre caselle migliori dell'avversario (gli scudi le proteggono). · **Raddoppio Superiore** – Se in questo turno segni nella parte sinistra (Uno…Sei), il punteggio vale doppio. · **Trappola** – Il prossimo punteggio segnato dall'avversario perde 12 punti. · **Investimento** – All'inizio del tuo prossimo turno ricevi 15 punti. · **Specchio Riflesso** – Il prossimo attacco dell'avversario contro di te rimbalza: viene annullato e tu guadagni 10 punti (le maledizioni tornano a lui). · **Rivincita** – Se sei in svantaggio guadagni metà della differenza (fino a 40 punti), altrimenti 5. · **Combo** – Se in questo turno hai già giocato un'altra carta, guadagni 15 punti e peschi una carta. · **Lancio Rubato** – Nel suo prossimo turno l'avversario ha un lancio in meno. |
| Epica (14) | 16% | **Maledizione del Caos** – Per tutto il prossimo turno dell'avversario, dopo OGNI suo lancio due dadi a caso (anche conservati) vengono rilanciati. · **Riscrittura del Destino** – Trasforma un risultato di un dado in un altro numero. · **Saccheggio Reale** – Ruba 20 punti all'avversario. · **Prigione Temporale** – Blocca TUTTE le carte dell'avversario per il suo prossimo turno. · **Mezza Luna** – Il prossimo punteggio segnato dall'avversario viene dimezzato. · **Scambio di Sorte** – Scegli una casella in cui l'avversario ha più punti di te: gli rubi la differenza. · **Tempesta di Lanci** – Tre lanci in più in questo turno. · **Moltiplicatore** – Il punteggio di questo turno vale una volta e mezza (fino a 40 punti extra). · **Ladro di Lanci** – Due lanci in più per te adesso e uno in meno per l'avversario nel suo prossimo turno. · **Eco** – Guadagni di nuovo i punti della tua ultima casella segnata (fino a 30). · **Terremoto** – Ogni casella dell'avversario perde 3 punti (gli scudi la proteggono). · **Jackpot** – Se in questo turno segni Full, Scala, Poker o Yatzy con punti, +30. · **Catene** – Nel suo prossimo turno l'avversario non può conservare nessun dado. · **Contrattacco** – Carta di reazione: la prossima volta che l'avversario ti ruba punti, ne riprendi il doppio. |
| Leggendaria (9) | 9% | **Mano degli Dei** – Scegli il valore di tutti e cinque i dadi e guadagna un lancio in più. · **Rewind Temporale** – Annulla l'ultimo effetto di una carta avversaria e pesca una carta. · **Apocalisse dei Dadi** – Al prossimo lancio l'avversario rilancia tutti i dadi, anche quelli conservati, un dado non si può più conservare e perde un lancio. · **Corona del Destino** – Raddoppia il punteggio del turno, fino a un massimo di 100 punti extra. · **Re dei Ladri** – Ruba 50 punti all'avversario. · **Scudo Divino** – Protegge tutte le tue caselle con uno scudo. · **Tesoro dei Draghi** – Guadagni subito 40 punti. · **Tempesta Perfetta** – L'avversario subisce insieme Maledizione del Caos, un lancio in meno e Mezza Luna. · **Fontana dei Desideri** – Guadagni 5 punti per ogni casella che hai già segnato (fino a 60). |
| Mitica (7) | 2% | **Big Bang** – Tutti i dadi diventano 6: YATZY! E hai un lancio in più. · **Furto Cosmico** – Ruba TUTTI i punti della casella migliore dell'avversario, ignorando gli scudi. · **Tempo Infinito** – Otto lanci in più in questo turno, e a ogni lancio gli 1 e i 2 si rilanciano da soli. · **Benedizione Eterna** – Per questo turno e i tuoi prossimi 4: un lancio in più e i dadi che fanno 1 o 2 si rilanciano da soli a ogni lancio. · **Buco Nero** – Inghiotte tutte le carte dell'avversario e lo maledice con l'Apocalisse dei Dadi. · **Clonazione** – Copia nella tua mano tutte le carte dell'avversario (finché c'è posto, fino a 5). · **Pioggia d'Oro** – Guadagni subito 75 punti. |
| Assurda (1) | 0,1% | **Dominio Assoluto** – Per questo turno e i tuoi prossimi 4 turni, ogni lancio è uno YATZY. |

Le carte mitiche hanno una rivelazione tutta loro: carta cosmica che cambia colore, lampo, terremoto, pioggia di coriandoli e colpo d'orchestra. L'unica carta **Assurda** (0,1%), **Dominio Assoluto**, ha una rivelazione ancora più grande: onda d'urto azzurra, doppio colpo e pioggia infinita di coriandoli; per 5 turni ogni lancio diventa uno Yatzy (il valore più presente nei dadi), con i bonus +100 dal secondo in poi.

Dettagli delle regole:

- **Furti** (Furto, Saccheggio, Re dei Ladri, Scambio di Sorte): si sceglie una casella avversaria già segnata; i punti tolti (al massimo il valore della casella) passano al ladro. Una casella con scudo blocca il furto e perde una carica di scudo (tranne il Furto Cosmico). I furti non tolgono il bonus +35 già ottenuto né il diritto ai bonus +100 degli Yatzy.
- **Maledizioni** (Caos, Apocalisse, Gelo Eterno, Buco Nero, Tempesta Perfetta): una alla volta; il Caos dura tutto il turno dell'avversario (dopo ogni lancio due dadi a caso, anche conservati, si rilanciano); il giocatore colpito la vede arrivare (segno viola) e può annullarla con Rewind Temporale prima di lanciare.
- **Difese**: uno scudo ferma un attacco sulla sua casella; lo **Specchio Riflesso** ferma il prossimo attacco di qualsiasi tipo, dà 10 punti al difensore e rimanda indietro le maledizioni; il **Contrattacco** fa riprendere il doppio dei punti rubati. Il Furto Cosmico ignora scudi e specchi.
- **Sabotaggio**, **Mezza Luna** e **Trappola** si fermano con uno scudo sulla casella colpita. Una casella sabotata si può usare comunque se è l'ultima libera.
- **Rewind Temporale** annulla l'ultimo effetto avversario ancora annullabile: un furto (i punti tornano indietro), una maledizione non ancora scattata, una prigione, la Corona e le carte bonus, gli scudi, un sabotaggio o un lancio rubato non ancora scattati, la Mezza Luna (anche dopo), una carta rubata, le carte inghiottite dal Buco Nero.
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
  meta/                  catalogo degli oggetti, casse ed economia, casinò, profilo del giocatore
  campaign/              livelli (levelData.js generato), sfide in tot lanci, boss e loro poteri
  ai/bot.js              avversario automatico dei boss (Monte Carlo, bravura regolabile)
  net/                   modalità online e account
    account.js           accesso, profilo sul telefono e sul server
    peerLoader.js        carica PeerJS (vendor/peerjs.min.js)
    transport.js         stanze con codice, collegamento e riconnessione
    session.js           protocollo: seme comune, mosse, verifiche, ripresa, rivincita
  ui/                    interfaccia: stage scalato, tabella, vassoio dadi 3D,
                         pulsanti, intestazione, mano, gratta e vinci,
                         bersagli delle carte, schermate, controller
  anim/                  animazioni (dadi 3D, voli, rotazione), effetti ed effetti delle carte
  audio/sound.js         effetti sonori sintetizzati (Web Audio, riverbero, stereo)
  audio/voices.js        suoni delle skin: dadi, animazioni di lancio, carte
  audio/music.js         musica generata dal vivo (intro, menu, partita, 10 mondi, boss, casinò) e ambienti
  styles/                CSS
  ui/meta/               intro, menu principale, negozio e casse, casinò, armadio, profilo,
                         classifica, accesso, campagna, sfide, boss
api/                     funzioni Vercel: register, login, profile, leaderboard, health
scripts/                 build, server di sviluppo (anche API), test e2e, taratura livelli
tests/                   test unitari (node:test)
vendor/                  PeerJS (licenza MIT)
dist/index.html          versione compilata in un unico file
```

## Comandi

```
npm install          # esbuild, PeerJS e il server PeerJS per i test
npm run dev          # server locale su http://localhost:5173/
npm run build        # crea dist/index.html
npm test             # 119 test: punteggi, regole, carte, partite online allineate, catalogo, casse, profilo, rango, campagna, boss, bot, API account
npm run test:e2e     # partita completa nel browser su vari schermi (richiede Playwright)
npm run test:online  # due "telefoni" che giocano online tramite un server PeerJS locale
npm run test:meta    # intro con sigla, account, casse, casinò, armadio, campagna, boss, classifica, secondo telefono
node scripts/gen-levels.mjs   # ritara i 90 livelli normali
npm run peer         # server PeerJS locale (porta 9000) per provare l'online senza internet
```

`npm run test:online` apre due browser separati e controlla: creazione della partita e ingresso dal link, una partita intera con stati identici dopo ogni turno, chi non è di turno non può giocare, caduta della connessione con riconnessione automatica, ricarica della pagina con ripresa, correzione automatica di uno stato divergente, rivincita, avviso quando l'altro esce, codice sbagliato.

`npm run test:e2e` controlla: layout su 7 dimensioni di schermo, carte grattate col dito, una partita completa giocata toccando l'interfaccia e usando le carte con verifica di dadi, caselle e totali, rotazione del tavolo, furti, scudi, maledizioni, prigione, Dottore e Satana, +35, +100 con spunte, salvataggio e ripresa, fluidità a 60 fps con CPU rallentata 4×. Per verificare la versione compilata: `E2E_PAGE=dist/index.html npm run test:e2e`.

## Note

I disegni (avatar, boss, croupier, casse, cartine) passano tutti dalla stessa rifinitura cartoon (`src/ui/toon.js`): contorno scuro dello stesso colore, sfumatura di volume e piccole luci.


La grafica (icone, dadi, colori, logo) è originale: riprende flusso di gioco, disposizione della tabella e animazioni del riferimento, senza copiarne le immagini. Il font è [Fredoka](https://fonts.google.com/specimen/Fredoka) (SIL Open Font License, vedi `assets/fonts/OFL.txt`).
