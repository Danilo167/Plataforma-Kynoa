/**
 * Ponto de entrada: inicializa os módulos na ordem correta e registra os
 * ouvintes globais (ações por atributo data-action e service worker).
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;

  function bindActions() {
    document.addEventListener('click', (event) => {
      const el = event.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const handler = K.actions[el.dataset.action];
      if (typeof handler === 'function') {
        if (el.tagName === 'A') event.preventDefault();
        handler(el, event);
      }
    });

    // O link de pular conteúdo não pode alterar o hash, que pertence ao roteador.
    const skip = document.querySelector('.skip-link');
    if (skip) {
      skip.addEventListener('click', (event) => {
        event.preventDefault();
        const main = document.getElementById('conteudo');
        if (main) main.focus();
      });
    }

    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-goto]');
      if (link) {
        event.preventDefault();
        K.router.go(link.dataset.goto);
      }
    });
  }

  function registerServiceWorker() {
    const secure = global.location.protocol === 'https:' || global.location.hostname === 'localhost' || global.location.hostname === '127.0.0.1';
    if (!('serviceWorker' in navigator) || !secure) return;
    global.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((error) => console.warn('[Kynoa] service worker indisponível', error));
    });
  }

  function boot() {
    K.icons.mount();
    K.store.load();

    // Navegadores exigem um gesto para liberar o áudio.
    const unlock = () => K.audio.unlock();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    bindActions();

    // Ordem importa: módulos que dependem de outros vêm depois.
    [K.environment, K.categories, K.projects, K.tasks, K.microsteps, K.focus, K.ambient, K.personalization, K.community, K.resources, K.settings, K.dashboard].forEach((module) => module.init());

    K.router.init();
    registerServiceWorker();
    global.__kynoaBooted = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
