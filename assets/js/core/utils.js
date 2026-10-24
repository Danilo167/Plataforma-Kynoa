/**
 * Utilitários compartilhados.
 * Expõe window.Kynoa.utils e inicializa o namespace global da aplicação.
 */
(function (global) {
  'use strict';

  const K = (global.Kynoa = global.Kynoa || {});

  K.meta = { name: 'Kynoa', version: '2.0.0', storageKey: 'kynoaSystem' };
  K.actions = K.actions || {};

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad = (n) => String(n).padStart(2, '0');

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function debounce(fn, wait) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  /* Datas e horas */
  function dayKey(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.ceil(totalSeconds));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function formatMinutes(total) {
    const m = Math.round(total);
    if (m < 60) return m + ' min';
    const hours = Math.floor(m / 60);
    const rest = m % 60;
    return hours + ' h' + (rest ? ' ' + rest + ' min' : '');
  }

  /* Cores */
  function normalizeHex(hex) {
    let value = String(hex || '').trim();
    if (/^#[0-9a-f]{3}$/i.test(value)) {
      value = '#' + value.slice(1).split('').map((c) => c + c).join('');
    }
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
  }

  function hexToRgb(hex) {
    const n = normalizeHex(hex) || '#000000';
    return [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16));
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }

  function mix(a, b, ratio) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * ratio, A[1] + (B[1] - A[1]) * ratio, A[2] + (B[2] - A[2]) * ratio);
  }

  const lighten = (hex, percent) => mix(hex, '#ffffff', percent / 100);
  const darken = (hex, percent) => mix(hex, '#000000', percent / 100);

  /** Luminância relativa conforme WCAG 2.x. */
  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** Escolhe texto claro ou escuro, o que tiver maior contraste sobre a cor. */
  function readableOn(hex) {
    return luminance(hex) > 0.179 ? '#0f172a' : '#ffffff';
  }

  /** Escurece a cor até que texto branco seja legível sobre ela. */
  function ensureDark(hex) {
    let color = normalizeHex(hex) || '#4f46e5';
    for (let i = 0; i < 14 && luminance(color) > 0.17; i++) color = darken(color, 8);
    return color;
  }

  /* Arquivos */
  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* Construção segura de DOM: textos nunca são interpretados como HTML. */
  function appendChildren(el, children) {
    children.forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) appendChildren(el, child);
      else if (child instanceof Node) el.appendChild(child);
      else el.appendChild(document.createTextNode(String(child)));
    });
  }

  function h(tag, props) {
    const el = document.createElement(tag);
    const rest = Array.prototype.slice.call(arguments, 2);
    const isProps = props && typeof props === 'object' && !Array.isArray(props) && !(props instanceof Node);

    if (isProps) {
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (value === undefined || value === null || value === false) return;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'for') el.htmlFor = value;
        else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
        else if (key === 'style') el.style.cssText = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.slice(0, 2) === 'on' && typeof value === 'function') el.addEventListener(key.slice(2), value);
        else if (key.slice(0, 4) === 'aria' || key === 'role' || key === 'tabindex') el.setAttribute(key, value);
        else if (key in el) el[key] = value;
        else el.setAttribute(key, value === true ? '' : value);
      });
    } else if (props !== undefined && props !== null) {
      rest.unshift(props);
    }

    appendChildren(el, rest);
    return el;
  }

  K.utils = {
    $, $$, h, clamp, pad, uid, debounce, escapeHtml, plural,
    dayKey, formatClock, formatTime, formatMinutes,
    normalizeHex, hexToRgb, rgbToHex, mix, lighten, darken, luminance, readableOn, ensureDark,
    downloadFile
  };
})(window);
