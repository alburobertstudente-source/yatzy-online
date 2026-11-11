/**
 * Schermate: menu, regole, conferma uscita, fine partita, pannello fortuna.
 */
import { h, wait } from './dom.js';
import { ICONS, pipsSvg, CATEGORY_ICONS } from './icons.js';
import { play, EASE, countUp, ms } from '../anim/animations.js';
import { confetti } from '../anim/effects.js';
import { RULES, CARD_RULES } from '../config.js';
import { CARDS, CARD_IDS, RARITIES, RARITY_INFO } from '../core/cards.js';
import { CARD_ICONS } from './cardArt.js';
import { DOCTOR_BADGE, HALO_BADGE } from './memeArt.js';

const ONLINE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const INSTALL_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const cleanCodeInput = (t) =>
  [...String(t || '').toUpperCase()]
    .filter((ch) => CODE_CHARS.includes(ch))
    .join('')
    .slice(0, 5);

const toggle = (label, on, onChange) => {
  const input = h('input', { type: 'checkbox', checked: on, onchange: (e) => onChange(e.target.checked) });
  return h('label', { class: 'toggle' }, h('span', {}, label), input, h('span', { class: 'toggle-ui' }));
};

export class Screens {
  constructor(stage) {
    this.stage = stage;
    this.host = stage.screens;
    this.current = null;
  }

  async #show(el, { dim = true } = {}) {
    if (this.current) await this.close();
    this.current = el;
    this.host.append(el);
    this.host.classList.add('is-open');
    this.stage.setDim(dim);
    const panel = el.querySelector('.anim-in') || el;
    await play(panel, [{ transform: 'scale(.9) translateY(14px)', opacity: 0 }, { transform: 'scale(1) translateY(0)', opacity: 1 }], {
      duration: 320,
      easing: EASE.back,
    });
  }

  /** Mostra una schermata (usata dal menu principale e dalla campagna). */
  open(el, opts) {
    return this.#show(el, opts);
  }

  async close() {
    const el = this.current;
    if (!el) return;
    this.current = null;
    await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'linear' });
    el.remove();
    if (!this.current) {
      this.host.classList.remove('is-open');
      this.stage.setDim(false);
    }
  }

  /* ---------------- MENU ---------------- */
  menu({ hasSave, tally, settings, onNew, onContinue, onSettings, onOnline, onInstall, installable = false, onBack = null }) {
    const letters = ['Y', 'A', 'T', 'Z', 'Y'];
    const logo = h(
      'div',
      { class: 'logo', 'aria-label': 'Yatzy' },
      ...letters.map((l, i) => h('span', { class: `logo-die d${i}`, style: { animationDelay: `${i * 0.12}s` } }, l)),
    );

    const versus = h(
      'div',
      { class: 'menu-vs' },
      h('div', { class: 'vs-side red' }, h('span', { class: 'vs-dot' }), h('b', {}, 'ROSSO'), h('span', { class: 'vs-wins' }, String(tally.red))),
      h('div', { class: 'vs-mid' }, 'VS'),
      h('div', { class: 'vs-side blue' }, h('span', { class: 'vs-wins' }, String(tally.blue)), h('b', {}, 'BLU'), h('span', { class: 'vs-dot' })),
    );
    const buttons = h('div', { class: 'menu-buttons' });
    if (hasSave) buttons.append(h('button', { class: 'btn btn-menu primary', type: 'button', onclick: onContinue }, 'CONTINUA'));
    buttons.append(
      h('button', { class: `btn btn-menu ${hasSave ? 'secondary' : 'primary'}`, type: 'button', onclick: onNew }, 'NUOVA PARTITA'),
      onOnline ? h('button', { class: 'btn btn-menu online', type: 'button', onclick: onOnline }, h('span', { class: 'btn-ico', html: ONLINE_ICON }), 'GIOCA ONLINE') : null,
      h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => this.rules() }, h('span', { class: 'btn-ico', html: ICONS.rules }), 'REGOLE'),
    );
    // installazione come app (Chrome la propone quando è possibile)
    this.installBtn = onInstall ? h('button', { class: 'btn btn-menu secondary install', type: 'button', hidden: !installable, onclick: onInstall }, h('span', { class: 'btn-ico', html: INSTALL_ICON }), "INSTALLA L'APP") : null;
    if (this.installBtn) buttons.append(this.installBtn);
    const opts = h(
      'div',
      { class: 'menu-options' },
      toggle('Ruota lo schermo a ogni turno', settings.rotate, (v) => onSettings({ rotate: v })),
      toggle('Musica', settings.music !== false, (v) => onSettings({ music: v })),
      toggle('Suoni', settings.sound, (v) => onSettings({ sound: v })),
      toggle('Vibrazione', settings.vibration, (v) => onSettings({ vibration: v })),
    );
    const el = h(
      'div',
      { class: 'screen menu' },
      h('div', { class: 'menu-inner anim-in' }, logo, h('div', { class: 'menu-sub' }, 'SFIDA A DUE GIOCATORI'), versus, buttons, opts),
      onBack ? h('button', { class: 'icon-btn menu-back', type: 'button', 'aria-label': 'Indietro', onclick: onBack, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' }) : null,
    );
    return this.#show(el, { dim: false });
  }

  /* ---------------- REGOLE ---------------- */
  rules() {
    const row = (icon, name, pts) => h('div', { class: 'rule-row' }, h('span', { class: 'rule-ico', html: icon }), h('span', { class: 'rule-name' }, name), h('span', { class: 'rule-pts' }, pts));
    const die = (n) => `<div class="rule-die">${pipsSvg(n, 5)}</div>`;
    const body = h(
      'div',
      { class: 'rules-body' },
      h('p', {}, 'A turno ogni giocatore lancia i 5 dadi fino a 3 volte. Tocca un dado per tenerlo, poi scegli una casella libera e premi SEGNA. Ogni casella si usa una sola volta: dopo 13 round vince chi ha più punti.'),
      row(die(1) + '', 'Uno … Sei', 'somma dei dadi di quel valore'),
      row(`<b class="rule-bonus">+35</b>`, 'Bonus', `con almeno ${RULES.UPPER_BONUS_THRESHOLD} punti nella parte sinistra`),
      row(CATEGORY_ICONS.threeKind, 'Tris', '3 uguali: somma di tutti i dadi'),
      row(CATEGORY_ICONS.fourKind, 'Poker', '4 uguali: somma di tutti i dadi'),
      row(CATEGORY_ICONS.fullHouse, 'Full', `tris + coppia: ${RULES.FULL_HOUSE}`),
      row(CATEGORY_ICONS.smallStraight, 'Scala piccola', `4 in fila: ${RULES.SMALL_STRAIGHT}`),
      row(CATEGORY_ICONS.largeStraight, 'Scala grande', `5 in fila: ${RULES.LARGE_STRAIGHT}`),
      row(CATEGORY_ICONS.yatzy, 'Yatzy', `5 uguali: ${RULES.YATZY}`),
      row(CATEGORY_ICONS.chance, 'Chance', 'somma di tutti i dadi'),
      h('p', { class: 'rules-bonus' }, h('b', {}, `+${RULES.YATZY_BONUS} YATZY BONUS: `), 'ogni Yatzy dopo il primo vale 100 punti extra e aggiunge una spunta sulla casella Yatzy. Può essere segnato anche come Full o Scala a punteggio pieno.'),
      h('h3', {}, 'Tradizioni della casa'),
      row(DOCTOR_BADGE, 'Contratto col Dottore', 'Full segnato nella casella Full: si firma col Dottore'),
      row(DOCTOR_BADGE, 'Rifiuti il Dottore', 'fai Full ma lo segni altrove: niente visita dal Dottore'),
      row(HALO_BADGE, 'Rinuncia a Satana', 'metti 0 nella casella Yatzy'),
      h('h3', {}, 'Carte potenziamento'),
      h('p', {}, `All'inizio di ogni turno gratti una carta con un potenziamento a caso. Tocca una carta della tua mano per vederla e usarla durante il tuo turno, prima di segnare. Puoi tenere al massimo ${CARD_RULES.HAND_MAX} carte.`),
      ...RARITIES.map((r) =>
        h(
          'div',
          { class: `rules-rarity r-${r}` },
          h('div', { class: 'rr-head' }, h('span', { class: 'rr-dot' }), `${RARITY_INFO[r].label} · ${CARD_RULES.RARITY_WEIGHTS[r]}%`),
          ...CARD_IDS.filter((id) => CARDS[id].rarity === r).map((id) => row(CARD_ICONS[id], CARDS[id].name, CARDS[id].text)),
        ),
      ),
    );
    const el = h(
      'div',
      { class: 'screen modal-screen' },
      h('div', { class: 'modal rules anim-in' }, h('h2', {}, 'Regole'), body, h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => this.closeRules(el) }, 'HO CAPITO')),
    );
    // le regole si sovrappongono al menu senza chiuderlo
    this.host.append(el);
    this.stage.setDim(true);
    play(el.firstChild, [{ transform: 'scale(.9)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: EASE.back });
  }

  async closeRules(el) {
    await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' });
    el.remove();
    this.stage.setDim(Boolean(this.current && !this.current.classList.contains('menu')));
  }

  /* ---------------- CONFERMA USCITA ---------------- */
  confirmExit({ rotated, onStay, onExit, title = 'Uscire dalla partita?', text = 'La partita resta salvata: potrai continuarla dal menu.' }) {
    const el = h(
      'div',
      { class: 'screen modal-screen' },
      h(
        'div',
        { class: 'modal anim-in', style: { rotate: rotated ? '180deg' : '0deg' } },
        h('h2', {}, title),
        h('p', {}, text),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: onStay }, 'ANNULLA'),
          h('button', { class: 'btn btn-menu primary', type: 'button', onclick: onExit }, 'ESCI'),
        ),
      ),
    );
    return this.#show(el);
  }

  /** Mostra o nasconde il pulsante "Installa l'app" del menu. */
  setInstallable(on) {
    if (this.installBtn) this.installBtn.hidden = !on;
  }

  /* ---------------- GIOCA ONLINE ---------------- */
  /**
   * Lobby: crea una partita (codice da condividere) o unisciti con un codice.
   * Restituisce un controllo per aggiornare lo stato mostrato.
   */
  onlineLobby({ initialCode = '', onCreate, onJoin, onBack }) {
    const status = h('div', { class: 'ol-status' });
    const codeInput = h('input', {
      class: 'ol-input',
      type: 'text',
      inputmode: 'text',
      autocapitalize: 'characters',
      autocomplete: 'off',
      spellcheck: 'false',
      maxlength: '5',
      placeholder: 'CODICE',
      'aria-label': 'Codice partita',
      value: initialCode,
      oninput: (e) => {
        const v = cleanCodeInput(e.target.value);
        if (v !== e.target.value) e.target.value = v;
      },
      onkeydown: (e) => {
        if (e.key === 'Enter') join();
      },
    });
    const join = () => {
      const code = cleanCodeInput(codeInput.value);
      if (code.length !== 5) {
        setStatus('Il codice ha 5 caratteri', 'error');
        return;
      }
      codeInput.blur();
      onJoin(code);
    };
    const choose = h(
      'div',
      { class: 'ol-choose' },
      h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => onCreate() }, 'CREA PARTITA'),
      h('div', { class: 'ol-or' }, h('span', {}, 'oppure unisciti con il codice')),
      h('div', { class: 'ol-join' }, codeInput, h('button', { class: 'btn btn-menu online ol-go', type: 'button', onclick: join }, 'ENTRA')),
    );
    const codeBox = h('div', { class: 'ol-code' });
    const share = h('button', { class: 'btn btn-menu online', type: 'button' }, 'CONDIVIDI IL LINK');
    const waiting = h(
      'div',
      { class: 'ol-waiting', hidden: true },
      h('div', { class: 'ol-label' }, 'Codice della partita'),
      codeBox,
      share,
      h('div', { class: 'ol-hint' }, "Dillo al tuo amico: apre il gioco, sceglie GIOCA ONLINE e inserisce il codice. Tu giochi col ROSSO e inizi tu."),
    );
    const spinner = h('div', { class: 'ol-spinner', hidden: true }, h('span'), h('span'), h('span'));
    const panel = h(
      'div',
      { class: 'menu-inner online-lobby anim-in' },
      h('div', { class: 'ol-title' }, h('span', { class: 'ol-title-ico', html: ONLINE_ICON }), 'GIOCA ONLINE'),
      h('div', { class: 'menu-sub' }, 'DUE TELEFONI, UNA PARTITA'),
      choose,
      waiting,
      spinner,
      status,
      h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => onBack() }, 'INDIETRO'),
    );
    const el = h('div', { class: 'screen menu online' }, panel);
    const setStatus = (text, kind = '') => {
      status.textContent = text || '';
      status.className = `ol-status ${kind}`;
    };
    this.#show(el, { dim: false });
    if (initialCode && cleanCodeInput(initialCode).length === 5) setTimeout(() => join(), 350);
    return {
      busy(text) {
        choose.hidden = true;
        waiting.hidden = true;
        spinner.hidden = false;
        setStatus(text);
      },
      choose(errorText = '') {
        choose.hidden = false;
        waiting.hidden = true;
        spinner.hidden = true;
        setStatus(errorText, errorText ? 'error' : '');
      },
      waiting(code, url) {
        choose.hidden = true;
        waiting.hidden = false;
        spinner.hidden = false;
        codeBox.replaceChildren(...[...code].map((ch) => h('span', {}, ch)));
        setStatus("In attesa dell'avversario…");
        share.onclick = async () => {
          const text = `Giochiamo a Yatzy Duello! Codice partita: ${code}`;
          try {
            if (navigator.share) {
              await navigator.share({ title: 'Yatzy Duello', text, url });
              return;
            }
          } catch {
            /* condivisione annullata: si copia il link */
          }
          try {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            setStatus('Link copiato! Incollalo al tuo amico', 'ok');
          } catch {
            setStatus(url, 'ok');
          }
        };
      },
      status: setStatus,
    };
  }

  /** Avviso semplice con un pulsante. */
  notice({ title, text, button = 'OK', onClose }) {
    const el = h(
      'div',
      { class: 'screen modal-screen' },
      h('div', { class: 'modal anim-in' }, h('h2', {}, title), h('p', {}, text), h('button', { class: 'btn btn-menu primary', type: 'button', onclick: () => onClose?.() }, button)),
    );
    return this.#show(el);
  }

  /** Banda "connessione persa" sopra il gioco (non chiude le altre schermate). */
  showConnection(state, { onLeave } = {}) {
    if (!this.conn) {
      const text = h('b', {});
      const sub = h('small', {});
      this.conn = h(
        'div',
        { class: 'conn-overlay' },
        h('div', { class: 'conn-box' }, h('div', { class: 'ol-spinner' }, h('span'), h('span'), h('span')), text, sub, h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: () => onLeave?.() }, 'ESCI DALLA PARTITA')),
      );
      this.conn.text = text;
      this.conn.sub = sub;
      this.host.append(this.conn);
      this.host.classList.add('has-conn');
    }
    this.conn.text.textContent = state === 'reconnecting' ? 'Riconnessione…' : 'Connessione persa';
    this.conn.sub.textContent = 'Tieni il gioco aperto: la partita riprende da dove eravate appena i telefoni si ricollegano.';
  }

  hideConnection() {
    if (!this.conn) return;
    this.conn.remove();
    this.conn = null;
    this.host.classList.remove('has-conn');
  }

  /* ---------------- FINE PARTITA ---------------- */
  async gameOver({ results, players, rotate, onRematch, onMenu, scorecards = null, viewer = null, extra = null }) {
    const { winner, breakdown } = results;
    const memesOf = (p) => {
      const card = players.find((x) => x.id === p.id)?.card ?? scorecards?.[p.id];
      if (!card) return null;
      const chips = [];
      if (card.scores.fullHouse > 0) chips.push(h('span', { class: 'go-meme' }, h('span', { html: DOCTOR_BADGE }), 'Contratto col Dottore'));
      if (card.scores.yatzy === 0) chips.push(h('span', { class: 'go-meme satan' }, h('span', { html: HALO_BADGE }), 'Ha rinunciato a Satana'));
      return chips.length ? h('div', { class: 'go-memes' }, ...chips) : null;
    };
    const half = (p) => {
      const b = breakdown[p.id];
      const isWin = winner === p.id;
      const isTie = winner === null;
      const other = viewer && p.id !== viewer;
      const title = isTie ? 'PAREGGIO!' : isWin ? (other ? 'HA VINTO!' : 'HAI VINTO!') : other ? 'HA PERSO' : 'HAI PERSO';
      const total = h('div', { class: 'go-total' }, '0');
      const line = (label, v, cls = '') => h('div', { class: `go-line ${cls}` }, h('span', {}, label), h('b', {}, String(v)));
      const el = h(
        'div',
        { class: `go-half ${p.id} ${isWin ? 'is-win' : isTie ? 'is-tie' : 'is-lose'}`, style: { rotate: rotate && p.id === 'blue' ? '180deg' : '0deg' } },
        h('div', { class: 'go-fx' }),
        h(
          'div',
          { class: 'go-card' },
          isWin ? h('div', { class: 'go-trophy', html: ICONS.trophy }) : null,
          h('div', { class: 'go-name' }, viewer === p.id ? `${p.short} · TU` : p.short),
          h('div', { class: 'go-title' }, title),
          total,
          memesOf(p),
          h(
            'div',
            { class: 'go-lines' },
            line('Parte sinistra', b.upper),
            line('Bonus +35', b.upperBonus),
            line('Parte destra', b.lower),
            line(`Bonus Yatzy (${b.yatzyBonusCount}×)`, b.yatzyBonus, b.yatzyBonus ? 'gold' : ''),
            line('Carte (furti, Corona)', b.cards, b.cards ? 'gold' : ''),
            b.stolen ? line('Punti rubati dall\'avversario', `−${b.stolen}`, 'minus') : null,
          ),
        ),
      );
      return { el, total, value: b.total, isWin };
    };
    const [red, blue] = [players.find((p) => p.id === 'red'), players.find((p) => p.id === 'blue')];
    const hb = half(blue);
    const hr = half(red);
    const center = h(
      'div',
      { class: 'go-center' },
      extra ? h('div', { class: 'go-extra' }, extra) : null,
      h('button', { class: 'btn btn-menu primary', type: 'button', onclick: onRematch }, 'RIVINCITA'),
      h('button', { class: 'btn btn-menu ghost', type: 'button', onclick: onMenu }, 'MENU'),
    );
    // online: la propria scheda sempre in basso
    const el = viewer === 'blue' ? h('div', { class: 'screen gameover' }, hr.el, center, hb.el) : h('div', { class: 'screen gameover' }, hb.el, center, hr.el);
    this.rematchBtn = center.querySelector('.btn-menu.primary');
    if (this.current) await this.close();
    this.current = el;
    this.host.append(el);
    this.host.classList.add('is-open');
    this.stage.setDim(true);
    await Promise.all([
      play(hb.el.querySelector('.go-card'), [{ transform: 'translateY(-40px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: EASE.back }),
      play(hr.el.querySelector('.go-card'), [{ transform: 'translateY(40px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: EASE.back }),
      play(center, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 400, delay: 250, easing: EASE.back }),
    ]);
    await Promise.all([countUp(hb.total, 0, hb.value, 1100), countUp(hr.total, 0, hr.value, 1100)]);
    for (const hx of [hb, hr]) {
      if (hx.isWin) {
        const fx = hx.el.querySelector('.go-fx');
        confetti(fx, { colors: hx === hr ? ['#ff5a66', '#ffd23f', '#ffffff', '#ff9f43'] : ['#3d9bff', '#ffd23f', '#ffffff', '#7ce0ff'], count: 70 });
      }
    }
    await wait(ms(200));
  }
}
