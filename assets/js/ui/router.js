/**
 * Navegação entre as áreas do sistema usando o hash da URL (#tarefas).
 * Funciona no GitHub Pages sem configuração de servidor e permite compartilhar links.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;

  const TITLES = {
    inicio: 'Início',
    personalizacao: 'Personalização',
    categorias: 'Meu Sistema',
    tarefas: 'Tarefas',
    microetapas: 'Micro-etapas',
    foco: 'Foco',
    ambiente: 'Ambiente',
    comunidade: 'Comunidade',
    recursos: 'Recursos',
    configuracoes: 'Configurações'
  };

  let current = 'inicio';
  let started = false;

  function fromHash() {
    const name = global.location.hash.replace(/^#\/?/, '');
    return TITLES[name] ? name : 'inicio';
  }

  function baseTitle() {
    return TITLES[current] + ' | Kynoa';
  }

  function render(tab, moveFocus) {
    current = tab;
    U.$$('.tab').forEach((panel) => panel.classList.toggle('active', panel.id === tab));
    U.$$('.menu-button').forEach((link) => {
      const active = link.dataset.tab === tab;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (!(K.focus && K.focus.isActive && K.focus.isActive())) document.title = baseTitle();

    if (moveFocus) {
      const heading = U.$('#' + tab + ' h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      if (typeof global.scrollTo === 'function') global.scrollTo(0, 0);
    }

    document.dispatchEvent(new CustomEvent('kynoa:route', { detail: { tab } }));
  }

  function go(tab) {
    if (!TITLES[tab]) return;
    if (global.location.hash !== '#' + tab) global.location.hash = tab;
    else render(tab, true);
  }

  function init() {
    global.addEventListener('hashchange', () => render(fromHash(), true));
    render(fromHash(), false);
    started = true;
  }

  K.router = { init, go, baseTitle, titles: TITLES, current: () => current, isStarted: () => started };
})(window);
