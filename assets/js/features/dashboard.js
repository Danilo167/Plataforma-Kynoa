/**
 * Tela inicial: saudação, números do dia e sugestão de tarefas conforme a energia de hoje.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const LEVELS = [['low', 'Baixa'], ['medium', 'Média'], ['high', 'Alta']];
  const ENERGY_RANK = {
    low: { low: 0, varies: 1, medium: 2 },
    medium: { medium: 0, low: 1, varies: 1, high: 2 },
    high: { high: 0, medium: 1, varies: 1, low: 2 }
  };
  const MESSAGES = {
    low: 'Com pouca energia, tudo bem fazer só o essencial. Estas tarefas pedem menos.',
    medium: 'Um bom dia para avançar no seu ritmo. Estas combinam com a sua energia.',
    high: 'Boa hora para as tarefas que pedem mais. Aproveite, e lembre das pausas.'
  };

  function currentLevel() {
    const e = store.state.energy;
    return e.date === U.dayKey() ? e.level : '';
  }

  function suggestions(level) {
    const rank = ENERGY_RANK[level];
    const byPriority = { high: 0, medium: 1, low: 2, none: 3 };
    return K.tasks.pending()
      .filter((t) => rank[t.energy] !== undefined)
      .sort((a, b) => rank[a.energy] - rank[b.energy] || byPriority[K.tasks.effectivePriority(a)] - byPriority[K.tasks.effectivePriority(b)] || new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 3);
  }

  function renderStats() {
    const today = U.dayKey();
    const state = store.state;
    const doneToday = state.tasks.filter((t) => t.completed && t.completedAt && U.dayKey(new Date(t.completedAt)) === today).length;
    const focus = K.focus.todayStats();
    $('#statPending').textContent = String(K.tasks.pending().length);
    $('#statDone').textContent = String(doneToday);
    $('#statSessions').textContent = String(focus.count);
    $('#statMinutes').textContent = U.formatMinutes(focus.minutes);
  }

  function renderGreeting() {
    const { user, settings } = store.state;
    const name = user.name && !settings.anonymousMode ? ', ' + user.name : '';
    $('#welcomeTitle').textContent = 'Bem-vinde' + (name || ' ao Kynoa');
  }

  function renderEnergy() {
    const level = currentLevel();
    U.$$('#energyButtons [data-level]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === level)));

    const box = $('#energySuggestions');
    box.replaceChildren();
    if (!level) {
      box.appendChild(h('p', { class: 'muted', text: 'Escolha o seu nível de energia de hoje para ver tarefas que combinem com ele.' }));
      return;
    }

    const list = suggestions(level);
    box.appendChild(h('p', { class: 'muted mb-1', text: MESSAGES[level] }));
    if (!list.length) {
      box.appendChild(h('div', { class: 'empty-state' }, h('p', { text: 'Nenhuma tarefa pendente combina com este nível agora.' }),
        h('a', { class: 'btn btn-secondary btn-sm', href: '#tarefas', text: 'Ir para as tarefas' })));
      return;
    }
    box.appendChild(
      h('div', { class: 'task-list no-scroll' },
        list.map((t) =>
          h('div', { class: 'task-item' },
            h('div', { class: 'task-title', text: t.title }),
            h('div', { class: 'task-actions' },
              h('button', { type: 'button', class: 'btn btn-sm btn-secondary', dataset: { action: 'task-focus', id: t.id } }, K.icon('timer'), 'Focar'),
              h('button', { type: 'button', class: 'btn btn-sm btn-ghost', dataset: { action: 'dash-complete', id: t.id } }, K.icon('check'), 'Concluir'))))));
  }

  function render() {
    renderGreeting();
    renderStats();
    renderEnergy();
  }

  function init() {
    $('#energyButtons').replaceChildren(
      ...LEVELS.map((l) =>
        h('button', { type: 'button', class: 'btn btn-secondary', 'aria-pressed': 'false', dataset: { action: 'energy-set', level: l[0] } }, K.icon('bolt'), l[1]))
    );
    render();
    store.on(['tasks', 'sessions', 'user', 'energy', 'settings', 'all'], render);

    K.actions['energy-set'] = (el) => {
      const level = el.dataset.level === currentLevel() ? '' : el.dataset.level;
      store.commit((s) => { s.energy = { level, date: level ? U.dayKey() : '' }; }, 'energy');
    };
    K.actions['dash-complete'] = (el) => K.tasks.setCompleted(el.dataset.id, true);
    K.actions['goto'] = (el) => K.router.go(el.dataset.tab);
  }

  K.dashboard = { init, suggestions };
})(window);
