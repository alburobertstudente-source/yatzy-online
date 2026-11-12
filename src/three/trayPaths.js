/**
 * Traiettorie dei dadi 3D per ogni stile di lancio.
 *
 * Ogni traiettoria è una funzione del tempo normalizzato t (0..1) che dà:
 *   x, z   posizione sul tavolo
 *   y      altezza del punto più BASSO del dado sopra il tavolo (0 = appoggiato)
 *   roll   avanzamento del rotolamento (0 → 1: alla fine il dado mostra il valore)
 *   yaw    avanzamento della rotazione attorno alla verticale (0 → 1)
 *   scale, opacity, visible
 * più l'elenco dei contatti col tavolo (rimbalzi) con la loro forza.
 * Unità: 1 = lato del dado. Il dado parte da `from` e si ferma esattamente in `to`.
 */
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeIn = (k) => k * k;

/** Interpolazione a tratti fra nodi [t, v]; dopo l'ultimo nodo sale a 1 con frenata. */
function piecewise(t, nodes) {
  let prev = [0, 0];
  for (const n of nodes) {
    if (t <= n[0]) return lerp(prev[1], n[1], (t - prev[0]) / Math.max(1e-6, n[0] - prev[0]));
    prev = n;
  }
  return lerp(prev[1], 1, easeOut((t - prev[0]) / Math.max(1e-6, 1 - prev[0])));
}

/** Tratto di volo parabolico fra due punti con un'altezza massima (curva di Bézier quadratica). */
function flight(a, b, apex, u) {
  const c = (4 * apex - a.y - b.y) / 2;
  const m = 1 - u;
  return { x: lerp(a.x, b.x, u), y: m * m * a.y + 2 * u * m * c + u * u * b.y, z: lerp(a.z, b.z, u) };
}

const P = (x, y, z) => ({ x, y, z });
const around = (to, dx, dz, y = 0) => P(to.x + dx, y, to.z + dz);
const impact = (apex) => Math.min(0.24, 0.05 + 0.07 * Math.sqrt(Math.max(0, apex)));

/**
 * Traiettoria a rimbalzi: punti di passaggio, frazioni di tempo e altezze per ogni volo.
 * Dopo l'ultimo volo il dado "si assesta" fino al punto finale.
 */
function bouncer({ points, fracs, apex, rollAt }) {
  const ends = [];
  let acc = 0;
  for (const f of fracs) ends.push((acc += f));
  const contacts = [];
  ends.forEach((e, i) => {
    if (points[i + 1].y <= 0.001) contacts.push({ t: e, amp: impact(apex[i] - points[i + 1].y) });
  });
  const last = points[points.length - 1];
  const to = points.final || last;
  return {
    contacts,
    sample(t) {
      let i = ends.findIndex((e) => t <= e);
      let pos;
      if (i === -1) {
        const k = easeOut(clamp01((t - acc) / Math.max(1e-6, 1 - acc)));
        pos = P(lerp(last.x, to.x, k), 0, lerp(last.z, to.z, k));
      } else {
        const t0 = i === 0 ? 0 : ends[i - 1];
        pos = flight(points[i], points[i + 1], apex[i], clamp01((t - t0) / (ends[i] - t0)));
      }
      return { ...pos, roll: piecewise(t, ends.map((e, k) => [e, rollAt[k]])), yaw: easeOut(clamp01(t / 0.9)), scale: 1, opacity: 1, visible: true };
    },
  };
}

/** Lancio classico: dal lato di chi lancia (entering) oppure saltello sul posto. */
function classic(from, to, entering, heavy = 1) {
  if (entering) {
    const L1 = around(to, rnd(-0.25, 0.25), rnd(0.45, 0.8));
    const L2 = around(to, rnd(-0.1, 0.1), rnd(0.1, 0.25));
    return bouncer({ points: [from, L1, L2, Object.assign(P(to.x, 0, to.z))], fracs: [0.42, 0.2, 0.11], apex: [Math.max(from.y, 0.5) + 0.2, 0.55 * heavy, 0.16 * heavy], rollAt: [0.68, 0.9, 0.98] });
  }
  const h = rnd(1.5, 2.1) * heavy;
  const L1 = around(to, rnd(-0.35, 0.35), rnd(-0.3, 0.3));
  const L2 = around(to, rnd(-0.12, 0.12), rnd(-0.1, 0.1));
  return bouncer({ points: [from, L1, L2, P(to.x, 0, to.z)], fracs: [0.48, 0.2, 0.1], apex: [h, 0.3 * h, 0.08 * h], rollAt: [0.78, 0.93, 0.985] });
}

/**
 * @param {string} style stile di lancio
 * @param {{entering:boolean, from:{x,y,z}, to:{x,y,z}}} o
 */
export function buildMotion(style, { entering = false, from, to }) {
  const base = P(to.x, 0, to.z);
  const start = from || base;
  let m;
  let rollTurns = entering ? rnd(2.2, 3) : rnd(1.4, 2);
  let yawTurns = rnd(-0.6, 0.6);
  switch (style) {
    case 'bounce': {
      const h = entering ? Math.max(start.y, 1) + 0.6 : rnd(2.6, 3.1);
      const pts = [start, around(to, rnd(-0.4, 0.4), entering ? 0.8 : rnd(-0.3, 0.3)), around(to, rnd(-0.25, 0.25), rnd(-0.2, 0.3)), around(to, rnd(-0.12, 0.12), rnd(-0.1, 0.1)), around(to, 0.04, 0.04), base];
      m = bouncer({ points: pts, fracs: [0.32, 0.22, 0.16, 0.11, 0.07], apex: [h, 1.5, 0.8, 0.36, 0.12], rollAt: [0.55, 0.78, 0.9, 0.96, 0.99] });
      break;
    }
    case 'hop': {
      const pts = [start];
      const n = 5;
      for (let i = 1; i < n; i++) pts.push(around(to, (i % 2 ? 1 : -1) * rnd(0.2, 0.38) * (1 - i / n), (entering ? 0.9 : 0.25) * (1 - i / n)));
      pts.push(base);
      m = bouncer({ points: pts, fracs: Array(n).fill(0.16), apex: [entering ? Math.max(start.y, 0.6) + 0.2 : 0.8, 0.7, 0.62, 0.5, 0.32], rollAt: [0.3, 0.55, 0.75, 0.9, 0.98] });
      rollTurns = rnd(1, 1.4);
      break;
    }
    case 'tornado': {
      const startA = rnd(0, Math.PI * 2);
      const top = around(to, 0, 0, 2.3);
      const fall = bouncer({ points: [top, around(to, rnd(-0.15, 0.15), rnd(-0.1, 0.1)), base], fracs: [0.5, 0.3], apex: [2.3, 0.28], rollAt: [0.8, 0.97] });
      m = {
        contacts: fall.contacts.map((c) => ({ t: 0.48 + c.t * 0.52, amp: c.amp })),
        sample(t) {
          if (t < 0.48) {
            const u = t / 0.48;
            const a = startA + u * Math.PI * 4;
            const r = 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15));
            const sy = entering ? lerp(start.y, 2.3, easeOut(u)) : 2.3 * easeOut(u);
            const sx = entering ? lerp(start.x, to.x, easeOut(u)) : to.x;
            const sz = entering ? lerp(start.z, to.z, easeOut(u)) : to.z;
            return { x: sx + Math.cos(a) * r, y: sy, z: sz + Math.sin(a) * r, roll: 0.25 * u, yaw: 0.85 * u, scale: 1, opacity: 1, visible: true };
          }
          const s = fall.sample((t - 0.48) / 0.52);
          return { ...s, roll: 0.25 + 0.75 * s.roll, yaw: 0.85 + 0.15 * easeOut((t - 0.48) / 0.52) };
        },
      };
      yawTurns = (Math.random() < 0.5 ? -1 : 1) * rnd(5, 6);
      break;
    }
    case 'rocket': {
      const fall = bouncer({ points: [around(to, 0, 0, 4.2), base, around(to, 0, 0.05), base], fracs: [0.55, 0.22, 0.1], apex: [4.2, 0.4, 0.1], rollAt: [0.85, 0.96, 0.99] });
      m = {
        contacts: fall.contacts.map((c) => ({ t: 0.36 + c.t * 0.64, amp: c.amp })),
        sample(t) {
          if (t < 0.08) return { x: start.x, y: entering ? start.y : 0, z: start.z, roll: 0, yaw: 0, scale: 1, opacity: 1, visible: true, squash: entering ? 0 : 0.22 * Math.sin((t / 0.08) * Math.PI) };
          if (t < 0.36) {
            const u = (t - 0.08) / 0.28;
            return { x: lerp(start.x, to.x, u), y: lerp(entering ? start.y : 0, 4.2, easeOut(u)), z: lerp(start.z, to.z, u), roll: 0.1 * u, yaw: 0.4 * u, scale: 1, opacity: 1, visible: true, thrust: true };
          }
          const s = fall.sample((t - 0.36) / 0.64);
          return { ...s, roll: 0.1 + 0.9 * s.roll, yaw: 0.4 + 0.6 * s.yaw };
        },
      };
      rollTurns = rnd(1, 1.5);
      break;
    }
    case 'meteor': {
      const sky = P(to.x + 2.6, 3.6, to.z - 1.6);
      const L1 = around(to, 0.2, 0.25);
      m = bouncer({ points: [sky, L1, around(to, -0.06, 0.08), base], fracs: [0.4, 0.17, 0.1], apex: [3.6, 0.5, 0.14], rollAt: [0.7, 0.92, 0.98] });
      m.contacts[0].amp = 0.3;
      m.contacts[0].hard = true;
      rollTurns = rnd(2.4, 3);
      break;
    }
    case 'portal':
    case 'blackhole': {
      const hole = style === 'blackhole';
      const fall = bouncer({ points: [around(to, 0, 0, 2.5), base, around(to, rnd(-0.08, 0.08), rnd(-0.08, 0.08)), base], fracs: [0.45, 0.22, 0.12], apex: [2.5, 0.34, 0.1], rollAt: [0.8, 0.95, 0.99] });
      const a0 = rnd(0, Math.PI * 2);
      m = {
        contacts: fall.contacts.map((c) => ({ t: 0.44 + c.t * 0.56, amp: c.amp })),
        sample(t) {
          if (t < 0.32) {
            const u = t / 0.32;
            if (entering) return { x: to.x, y: 2.5, z: to.z, roll: 0, yaw: 0, scale: 0, opacity: 1, visible: false };
            const r = hole ? 0.6 * Math.sin(Math.PI * u) : 0;
            const a = a0 + u * Math.PI * 3;
            return { x: start.x + Math.cos(a) * r, y: hole ? 0.25 * Math.sin(Math.PI * u) : -0.25 * u, z: start.z + Math.sin(a) * r, roll: 0, yaw: (hole ? 0.6 : 0.3) * u, scale: 1 - easeIn(u), opacity: 1, visible: u < 0.98 };
          }
          if (t < 0.44) {
            const u = (t - 0.32) / 0.12;
            return { x: to.x, y: 2.5, z: to.z, roll: 0, yaw: hole ? 0.6 : 0.3, scale: u < 0.4 ? 0 : easeOut((u - 0.4) / 0.6) * (hole ? 1.25 : 1.1), opacity: 1, visible: u >= 0.4 };
          }
          const s = fall.sample((t - 0.44) / 0.56);
          const k = (t - 0.44) / 0.56;
          return { ...s, yaw: (hole ? 0.6 : 0.3) + (hole ? 0.4 : 0.7) * s.yaw, scale: lerp(hole ? 1.25 : 1.1, 1, easeOut(clamp01(k * 3))) };
        },
      };
      if (hole) yawTurns = rnd(3, 4) * (Math.random() < 0.5 ? -1 : 1);
      rollTurns = rnd(1, 1.6);
      break;
    }
    case 'glitch': {
      const steps = Array.from({ length: 7 }, (_, i) => ({ x: to.x + rnd(-0.45, 0.45), y: rnd(0.1, 1.5), z: to.z + rnd(-0.3, 0.3), roll: (i + 1) / 9, yaw: rnd(0, 1) }));
      if (entering) steps.unshift({ ...start, roll: 0, yaw: 0 });
      const land = bouncer({ points: [around(to, 0, 0, 0.5), base, base], fracs: [0.5, 0.2], apex: [0.55, 0.06], rollAt: [0.95, 0.99] });
      m = {
        contacts: land.contacts.map((c) => ({ t: 0.66 + c.t * 0.34, amp: c.amp })),
        sample(t) {
          if (t < 0.66) {
            const s = steps[Math.min(steps.length - 1, Math.floor((t / 0.66) * steps.length))];
            return { ...s, scale: rnd(0.92, 1.12), opacity: Math.random() < 0.15 ? 0.4 : 1, visible: true, glitch: true };
          }
          const s = land.sample((t - 0.66) / 0.34);
          return { ...s, roll: 0.78 + 0.22 * s.roll };
        },
      };
      rollTurns = rnd(1.5, 2);
      break;
    }
    case 'ghost': {
      const c = classic(start, to, entering);
      const side = rnd(0.35, 0.6) * (Math.random() < 0.5 ? -1 : 1);
      m = {
        contacts: c.contacts,
        sample(t) {
          const s = c.sample(t);
          const k = clamp01(t / 0.62);
          s.x += Math.sin(k * Math.PI * 2) * side * (1 - k);
          s.opacity = t < 0.62 ? lerp(1, 0.14, Math.sin(Math.PI * k) ** 0.6) : 1;
          return s;
        },
      };
      break;
    }
    default:
      m = classic(start, to, entering, style === 'lightning' ? 1.1 : 1);
  }
  m.rollTurns = rollTurns * Math.PI * 2;
  m.yawTurns = yawTurns * Math.PI * 2;
  m.firstContact = m.contacts.length ? m.contacts[0].t : 0.6;
  return m;
}

/** Punto di partenza del lancio dal lato di chi tira (fuori dal vassoio, in alto). */
export function throwStart(to, style, k = 0) {
  if (style === 'meteor') return P(to.x + 2.6, 3.6, to.z - 1.6);
  return P(to.x * 0.6 + rnd(-0.6, 0.6) + (k - 2) * 0.1, rnd(2.3, 2.8), to.z + rnd(3, 3.6));
}
