# Carte potenziamento: progetto di gioco

Questo documento spiega **perché** le carte sono fatte così. I numeri esatti (punti, probabilità) sono in `src/core/cards.js` e `src/config.js`; la forza di ogni carta si misura con `node scripts/card-balance.mjs`.

## Obiettivi

1. **Ogni turno una decisione.** Pescare una carta non basta: bisogna scegliere *quando* giocarla (prima o dopo il lancio, adesso o tenerla come reazione), *quale* giocare (senza limite per turno, tranne sotto Sigillo) e *contro cosa* (quale casella, quale dado).
2. **Ogni attacco ha una risposta.** Furti → scudi, Specchio Riflesso, Contrattacco, Muro Invalicabile. Maledizioni → Antidoto, Esorcismo, Specchio. Carte → Contromossa, Prigione, Sigillo. Difese → Sfondamento. Economia di carte → Rogo, Buco Nero.
3. **Nessun blocco senza uscita.** Mai due maledizioni insieme; una casella sabotata si può usare se è l'ultima libera; si può perdere al massimo un certo numero di punti per turno avversario; c'è sempre almeno un lancio.
4. **Rimonta sì, premio a chi gioca male no.** Chi è indietro di 50+ punti gratta una carta in più e alcune carte (Rivincita, Elemosina, Rimonta Furiosa) valgono di più se sei indietro; ma le carte migliori restano quelle giocate al momento giusto, non quelle "di consolazione".
5. **Abilità più che fortuna.** Le probabilità sono uguali per tutti e due; le carte di rischio (scommesse) sono scelte consapevoli; le carte forti vanno *preparate* (combo, finali di partita, reazioni).

## Economia delle carte

| Regola | Valore | Perché |
|---|---|---|
| Carte grattate per turno | 1 (+1 se sei indietro di 50+) | ritmo costante, rimonta |
| Mano massima | 5 | obbliga a scegliere cosa tenere |
| **Carte giocabili per turno** | **senza limite** (1 sotto Sigillo) | libertà di combo nello stesso turno; il freno sono la mano da 5 e le reazioni avversarie |
| Pesca extra | solo da carte (Mano Veloce, Pesca Doppia, Biblioteca, Tempesta di Carte…) | la pesca è una scelta che costa una giocata |
| Punti persi per turno avversario | al massimo **45** (furti, terremoti, tasse) | anti-frustrazione: nessun turno disastroso |

Non serve un sistema di "energia" né un limite di giocate per turno: la mano da 5 carte, il tetto di 45 punti persi per turno avversario e le reazioni (Contromossa, Sigillo, Specchio) bastano a frenare le combo, restando semplice da capire.

## Momenti in cui le carte agiscono

- **Nel tuo turno**: prima di lanciare (lanci extra, Occhio del Destino, scommesse), dopo un lancio (cambiare dadi), prima di segnare (moltiplicatori, bonus).
- **Reazioni preparate**: si giocano nel proprio turno e scattano da sole durante il turno avversario: Contromossa (annulla la prossima carta), Specchio Riflesso, Contrattacco, Invidia, Spia, Allarme, Muro Invalicabile.
- **Inizio del turno**: Investimento, Salvadanaio, Ritmo, Benedizione, Tempo Infinito, Dominio Assoluto; e gli effetti subiti (Sabotaggio, Catene, Lancio Rubato, Sigillo).

## Archetipi (e le loro sinergie)

| Archetipo | Carte chiave | Sinergia | Punto debole |
|---|---|---|---|
| **Aggressione / furti** | Furto, Saccheggio, Rapina, Re dei Ladri, Tassa del Re, Valanga, Ladro Supremo | Sfondamento toglie le difese prima del furto | scudi, Specchio, Contrattacco, tetto di 45 punti per turno |
| **Controllo / maledizioni** | Caos, Gelo, Tiro Mancino, Catene, Lancio Rubato, Sigillo, Tempesta Perfetta | Prigione/Sigillo impediscono le risposte | Antidoto, Esorcismo (rimanda la maledizione), Specchio |
| **Difesa / riflessi** | Scudi, Specchio, Contrattacco, Fortezza, Muro Invalicabile, Allarme | i riflessi trasformano gli attacchi in punti | Sfondamento, Furto Cosmico (ignora gli scudi) |
| **Combo / moltiplicatori** | Corona, Moltiplicatore, Jackpot, Slancio, Combo, Turno Perfetto, Ultimo Atto | carte di dadi (Calamita, Big Bang) + moltiplicatore nello stesso turno | Sigillo, Contromossa, Mezza Luna/Trappola |
| **Economia / pesca** | Mano Veloce, Pesca Doppia, Biblioteca, Tempesta di Carte, Clonazione, Scambio di Carte | più carte = più scelte e più reazioni | Rogo, Buco Nero, Bancarotta |
| **Rischio / scommesse** | Piccola Scommessa, Scommessa sullo Yatzy, Grande Scommessa, Jackpot Cosmico, Patto col Diavolo | scommettere dopo aver visto i dadi (o con Occhio del Destino) | se va male si perdono punti |
| **Finale di partita** | Ultimo Atto, Gran Finale, Fontana dei Desideri | valgono di più negli ultimi round | deboli a inizio partita: vanno tenute in mano (bluff) |

## Bluff e informazioni nascoste

Le carte in mano sono **segrete**: online l'avversario vede solo il retro e il numero di carte; quando peschi vede solo "sta pescando…", mai il nome, la rarità o l'effetto della rivelazione. Le carte si scoprono solo quando vengono **giocate**. Sullo stesso telefono si vede solo la mano di chi è di turno. Tenere in mano 5 carte fa paura (potrebbe esserci una Contromossa o uno Specchio): il bluff è parte del gioco.

## Regole anti-frustrazione

- **Una maledizione alla volta** per giocatore.
- **Tetto ai punti persi**: al massimo 45 per turno avversario.
- **Muro Invalicabile**: per due turni avversari nessun attacco passa.
- **Sabotaggio**: non può bloccare l'ultima casella libera.
- **Almeno un lancio** resta sempre, anche con Lancio Rubato, Apocalisse e Sigillo.
- **Rewind Temporale** annulla quasi ogni effetto avversario ancora attivo.

## Fasce di forza per rarità

Valore misurato con il bot (differenza di punti tra i due giocatori dopo 4 turni a testa, con e senza la carta). Le carte di difesa e di reazione si giudicano dall'attacco che fermano.

| Rarità | Probabilità | Fascia di valore |
|---|---|---|
| Comune | 44,9% | 5 – 9 |
| Rara | 28% | 9 – 14 |
| Epica | 16% | 14 – 22 |
| Leggendaria | 9% | 22 – 35 |
| Mitica | 2% | 35 – 60 |
| Assurda | 0,1% | oltre 100 (Dominio Assoluto) |
