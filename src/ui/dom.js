/** Piccole utilità DOM. */

/**
 * Crea un elemento. h('div', {class: 'x', onclick: fn}, child1, 'testo')
 * L'attributo `html` imposta innerHTML (solo per SVG interni del gioco).
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const wait = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/**
 * Rettangolo di `el` nelle coordinate locali (non scalate, non ruotate) di `root`.
 * Gestisce la scala dello stage e la rotazione di 180° del tavolo.
 */
export function localRect(el, root, rotated = false) {
  const rr = root.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const s = rr.width / root.offsetWidth || 1;
  if (rotated) {
    return { x: (rr.right - er.right) / s, y: (rr.bottom - er.bottom) / s, w: er.width / s, h: er.height / s };
  }
  return { x: (er.left - rr.left) / s, y: (er.top - rr.top) / s, w: er.width / s, h: er.height / s };
}

/** Vibrazione breve (Android), se abilitata. */
let vibrationEnabled = true;
export function setVibration(on) {
  vibrationEnabled = on;
}
export function buzz(pattern = 12) {
  if (!vibrationEnabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supportato */
  }
}
