/**
 * Partita contro un boss: presentazione del boss, animazioni dei suoi poteri
 * e bot che gioca il turno del boss (come un avversario online).
 */
import { h, wait, buzz, localRect } from '../dom.js';
import { play, EASE, ms, shake } from '../../anim/animations.js';
import { sparkle, toast } from '../../anim/effects.js';
import { sound } from '../../audio/sound.js';
import { bossSvg } from '../bossArt.js';
import { botMove } from '../../ai/bot.js';
import { TIMING } from '../../config.js';
import { music } from '../../audio/music.js';

/** Schermata di presentazione: il boss entra, mostra il potere, COMBATTI! */
export async function bossIntro(screens, info) {
  const b = info.bossData;
  const btn = h('button', { class: 'btn btn-menu primary', type: 'button' }, 'COMBATTI!');
  const art = h('div', { class: 'bi-art', html: bossSvg(b, 190) });
  const el = h(
    'div',
    { class: 'screen boss-intro', style: { '--w1': b.colors[0], '--w2': b.colors[1], '--w3': b.colors[2] } },
    h(
      'div',
      { class: 'bi-inner anim-in' },
      h('small', {}, `${info.world.name.toUpperCase()} · BOSS ${info.bossIndex}`),
      art,
      h('h2', {}, b.name),
      h('div', { class: 'bi-power' }, h('b', {}, `POTERE: ${b.effect.toUpperCase()}`), h('p', {}, b.text)),
      h('p', { class: 'bi-rules' }, 'Partita intera da 13 round, senza carte. Vinci tu se fai più punti!'),
      btn,
    ),
  );
  await screens.open(el, { dim: false });
  music.play('boss', { intensity: (info.bossIndex - 1) / 9 });
  sound.curse();
  buzz([40, 30, 40]);
  play(art, [{ transform: 'translateY(-30px) scale(.6) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1.1) rotate(4deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: EASE.out });
  await new Promise((resolve) => btn.addEventListener('click', resolve, { once: true }));
  sound.unlock();
  sound.tap();
}

const LABEL = { jump: 'SALTO DEL RANOCCHIO!', freeze: 'GELO! UN DADO È CONGELATO', flip: 'RIBALTA! UN DADO SI CAPOVOLGE', drain: 'MORSO! +10 AL VAMPIRO' };

/** Regole visive del boss per il Controller (controller.setMode). */
export function bossModeFor(info) {
  const b = info.bossData;
  const banner = (ctrl, text) => {
    const tr = localRect(ctrl.tray.el, ctrl.stage.table, ctrl.stage.rotated);
    return toast(ctrl.fx, text, { x: tr.x + tr.w / 2, y: tr.y - 14, kind: 'boss' });
  };
  return {
    note: `${b.name.toUpperCase()} · ${b.effect.toUpperCase()}: ${b.text}`,
    fog: b.id === 'witch' ? 'red' : null,
    hidden: b.id === 'witch' ? 'blue' : null,
    async turnStart(ctrl, game) {
      const notes = game.turnState.boss || [];
      game.turnState.boss = [];
      for (const n of notes) {
        sound.curseHit();
        buzz([30, 20, 30]);
        if (n.type === 'steal') {
          const cell = ctrl.card.cell('red', n.cat);
          shake(cell.el, 6);
          banner(ctrl, `${b.name.toUpperCase()} RUBA ${n.amount} PUNTI DA ${n.label.toUpperCase()}!`);
          ctrl.renderAll({ interactive: false });
          await Promise.all([ctrl.hud.setTotal('red', game.player('red').card.total(), true), ctrl.hud.setTotal('blue', game.player('blue').card.total(), true)]);
        } else if (n.type === 'block') {
          ctrl.renderAll({ interactive: false });
          const cell = ctrl.card.cell('red', n.cat);
          shake(cell.el, 6);
          banner(ctrl, `CASELLA ${n.label.toUpperCase()} MALEDETTA!`);
        } else if (n.type === 'rolls') {
          ctrl.updateControls();
          banner(ctrl, `${b.effect.toUpperCase()}! SOLO ${n.n} LANCI`);
          shake(ctrl.controls.roll, 6);
        } else if (n.type === 'pinch') {
          ctrl.renderAll({ interactive: false });
          shake(ctrl.tray.slotEl(n.die), 6);
          banner(ctrl, b.id === 'crab' ? 'PINZA! UN DADO NON SI PUÒ TENERE' : 'UN DADO NON SI PUÒ TENERE');
        }
        await wait(ms(900));
      }
    },
    async afterRoll(ctrl, res) {
      const fx = res.boss;
      sound.curseHit();
      buzz([30, 20, 40]);
      banner(ctrl, LABEL[fx.type] || b.effect.toUpperCase());
      if (fx.type === 'jump' || fx.type === 'flip') {
        await wait(ms(250));
        await ctrl.tray.roll(res.values, fx.dice);
      } else if (fx.type === 'freeze') {
        ctrl.renderAll({ interactive: false });
        const slot = ctrl.tray.slotEl(fx.dice[0]);
        shake(slot, 5);
        const r = localRect(slot, ctrl.stage.table, ctrl.stage.rotated);
        sparkle(ctrl.fx, r.x + r.w / 2, r.y + r.h / 2, { colors: ['#e8f7ff', '#9fdcff', '#ffffff'], count: 14, spread: 70, size: 9 });
      }
      await wait(ms(500));
    },
    async afterScore(ctrl, res) {
      if (res.boss?.type === 'drain') {
        sound.curseHit();
        banner(ctrl, LABEL.drain);
        await ctrl.hud.setTotal('blue', ctrl.game.player('blue').card.total(), true);
        await wait(ms(500));
      }
    },
  };
}

/**
 * Bot che gioca il turno del boss passando le mosse al Controller come se
 * arrivassero da un avversario online. Si ferma con stop().
 */
export function startBot(controller, game, skill) {
  let stopped = false;
  let thinking = false;
  const think = () => Math.max(120, (520 + Math.random() * 520) / (TIMING.ANIM_SPEED || 1));
  const loop = setInterval(async () => {
    if (stopped || thinking) return;
    if (controller.game !== game || game.phase !== 'playing') return;
    if (game.current.id !== 'blue' || controller.busy || controller.frozen || !controller.remoteIdle) return;
    thinking = true;
    try {
      const move = botMove(game, { skill });
      await wait(move.type === 'hold' ? think() * 0.45 : think());
      if (!stopped && controller.game === game && game.current.id === 'blue') controller.receiveRemote({ a: move, h: null });
      // aspetta che la mossa sia applicata prima di pensare alla prossima
      while (!stopped && controller.game === game && (!controller.remoteIdle || controller.busy)) await wait(40);
    } finally {
      thinking = false;
    }
  }, 90);
  return {
    stop() {
      stopped = true;
      clearInterval(loop);
    },
  };
}
