/**
 * Tarefas: criação, edição no lugar, filtros, busca, ordenação e agrupamento conforme
 * o estilo de organização escolhido na Personalização.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const WHEN_LABELS = { today: 'Hoje', tomorrow: 'Amanhã', this_week: 'Esta semana', next_week: 'Próxima semana', someday: 'Algum dia', no_date: 'Sem data' };
  const WHEN_ORDER = Object.keys(WHEN_LABELS);
  const ENERGY_LABELS = { low: 'Baixa energia', medium: 'Energia média', high: 'Alta energia', varies: 'Energia variável' };
  const ENERGY_ORDER = { low: 0, medium: 1, high: 2, varies: 3 };
  const PRIORITY_LABELS = { high: 'Prioridade alta', medium: 'Prioridade média', low: 'Prioridade baixa' };
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };
  const GROUP_BY_STYLE = { visual: 'category', temporal: 'when', projetos: 'project' };
  const GROUP_NAMES = { category: 'categoria', when: 'prazo', project: 'projeto' };

  const ui = { filter: 'all', category: '', project: '', search: '', sort: 'recent' };

  const tasks = () => store.state.tasks;
  const find = (id) => tasks().find((t) => t.id === id);
  const category = (id) => store.state.categories.find((c) => c.id === id);
  const project = (id) => store.state.projects.find((p) => p.id === id);
  const pending = () => tasks().filter((t) => !t.completed);

  function effectivePriority(task) {
    if (task.priority) return task.priority;
    const c = category(task.category);
    return c ? c.priority : 'none';
  }

  function timeLabel(value) {
    if (!value || value === 'unknown') return '';
    return U.formatMinutes(Number(value));
  }

  function defaultTime() {
    return store.state.personalization.timeEstimates ? 'unknown' : '30';
  }

  /* Seleção, filtros e ordem */
  function visibleTasks() {
    const query = ui.search.trim().toLowerCase();
    let list = tasks().filter((t) => {
      if (ui.filter === 'today' && !(t.when === 'today' || !t.when)) return false;
      if (ui.filter === 'pending' && t.completed) return false;
      if (ui.filter === 'completed' && !t.completed) return false;
      if (ui.category && t.category !== ui.category) return false;
      if (ui.project && t.project !== ui.project) return false;
      if (query && !(t.title + ' ' + t.description).toLowerCase().includes(query)) return false;
      return true;
    });

    const byRecent = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    const compare = {
      recent: byRecent,
      priority: (a, b) => PRIORITY_ORDER[effectivePriority(a)] - PRIORITY_ORDER[effectivePriority(b)] || byRecent(a, b),
      when: (a, b) => WHEN_ORDER.indexOf(a.when) - WHEN_ORDER.indexOf(b.when) || byRecent(a, b),
      energy: (a, b) => ENERGY_ORDER[a.energy] - ENERGY_ORDER[b.energy] || byRecent(a, b)
    }[ui.sort] || byRecent;

    list = list.slice().sort((a, b) => (a.completed !== b.completed ? (a.completed ? 1 : -1) : compare(a, b)));
    return list;
  }

  function groupsFor(list, mode) {
    if (mode === 'none') return [{ title: null, items: list }];
    const buckets = new Map();
    const add = (key, title, color, item) => {
      if (!buckets.has(key)) buckets.set(key, { title, color, items: [] });
      buckets.get(key).items.push(item);
    };
    list.forEach((t) => {
      if (mode === 'category') {
        const c = category(t.category);
        add(c ? c.id : '', c ? c.name : 'Sem categoria', c ? c.color : null, t);
      } else if (mode === 'project') {
        const p = project(t.project);
        add(p ? p.id : '', p ? p.name : 'Sem projeto', null, t);
      } else {
        add(t.when, WHEN_LABELS[t.when] || 'Sem data', null, t);
      }
    });

    let keys = Array.from(buckets.keys());
    if (mode === 'when') keys.sort((a, b) => WHEN_ORDER.indexOf(a) - WHEN_ORDER.indexOf(b));
    else keys = keys.filter((k) => k !== '').concat(keys.filter((k) => k === ''));
    return keys.map((k) => buckets.get(k));
  }

  /* Renderização */
  function energyNode(task) {
    const level = { low: 1, medium: 2, high: 3 }[task.energy] || 0;
    const bolts = level ? Array.from({ length: level }, () => K.icon('bolt')) : [];
    return h('span', { title: ENERGY_LABELS[task.energy] }, bolts, ' ', ENERGY_LABELS[task.energy]);
  }

  function taskNode(task) {
    const c = category(task.category);
    const p = project(task.project);
    const priority = effectivePriority(task);
    const checkId = 'task-check-' + task.id;
    const minutes = timeLabel(task.timeAmount);

    return h('article', { class: 'task-item' + (task.completed ? ' completed' : ''), style: { borderLeftColor: c ? c.color : 'var(--text-light)' } },
      h('div', { class: 'task-header with-check' },
        h('input', {
          type: 'checkbox', id: checkId, checked: task.completed,
          onchange: (e) => setCompleted(task.id, e.target.checked)
        }),
        h('div', { class: 'task-main' },
          h('label', { class: 'task-title', for: checkId, text: task.title }),
          task.description ? h('div', { class: 'task-description', text: task.description }) : null)),
      h('div', { class: 'task-meta' },
        c ? h('span', { class: 'custom-tag', style: K.tint(c.color) }, c.icon ? K.icon(c.icon) : null, c.name) : null,
        p ? h('span', { class: 'custom-tag tag-outline' }, K.icon('folder'), p.name) : null,
        priority !== 'none' ? h('span', { class: 'custom-tag tag-' + priority, text: PRIORITY_LABELS[priority] }) : null,
        h('span', null, K.icon('clock'), ' ', WHEN_LABELS[task.when] || 'Sem data'),
        energyNode(task),
        minutes ? h('span', { text: '~' + minutes }) : null,
        task.completed && task.completedAt ? h('span', { text: 'Concluída às ' + U.formatTime(task.completedAt) }) : null),
      h('div', { class: 'task-actions' },
        h('button', { type: 'button', class: 'btn btn-sm btn-secondary', dataset: { action: 'task-edit', id: task.id } }, K.icon('edit'), 'Editar'),
        !task.completed ? h('button', { type: 'button', class: 'btn btn-sm btn-secondary', dataset: { action: 'task-focus', id: task.id } }, K.icon('timer'), 'Focar') : null,
        h('button', { type: 'button', class: 'btn btn-sm btn-danger', dataset: { action: 'task-delete', id: task.id } }, K.icon('trash'), 'Excluir')));
  }

  function render() {
    const box = $('#tasksList');
    if (!box) return;
    box.replaceChildren();

    const list = visibleTasks();
    const total = tasks().length;
    const mode = GROUP_BY_STYLE[store.state.personalization.style] || 'none';

    if (!list.length) {
      box.appendChild(
        h('div', { class: 'empty-state' }, K.icon('inbox'),
          h('p', { text: total ? 'Nenhuma tarefa corresponde aos filtros atuais.' : 'Nenhuma tarefa por aqui. Comece com algo pequeno, sem pressão.' }))
      );
    } else {
      groupsFor(list, mode).forEach((group) => {
        if (group.title) {
          box.appendChild(
            h('h4', { class: 'task-group-title' },
              group.color ? h('span', { class: 'dot', style: { background: group.color } }) : null,
              group.title + ' (' + group.items.length + ')'));
        }
        group.items.forEach((t) => box.appendChild(taskNode(t)));
      });
    }

    const open = pending().length;
    $('#tasksCount').textContent =
      (list.length !== total ? list.length + ' de ' + total : total) + ' ' + U.plural(total, 'tarefa', 'tarefas') +
      (total ? ', ' + open + ' ' + U.plural(open, 'pendente', 'pendentes') : '');

    const note = $('#tasks-view-note');
    note.textContent = mode === 'none' ? '' : 'Lista agrupada por ' + GROUP_NAMES[mode] + ', de acordo com o seu estilo de organização.';
    note.hidden = mode === 'none';

    U.$$('#taskFilters [data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === ui.filter)));
  }

  function fillSelect(select, items, firstLabel, labelOf) {
    if (!select) return;
    const current = select.value;
    select.replaceChildren(h('option', { value: '', text: firstLabel }), ...items.map((i) => h('option', { value: i.id, text: labelOf(i) })));
    if (items.some((i) => i.id === current)) select.value = current;
  }

  function refreshSelects() {
    const cats = store.state.categories;
    const projs = store.state.projects;
    fillSelect($('#taskCategory'), cats, 'Sem categoria', (c) => c.name);
    fillSelect($('#taskFilterCategory'), cats, 'Todas as categorias', (c) => c.name);
    fillSelect($('#taskProject'), projs, 'Sem projeto', (p) => p.name);
    fillSelect($('#taskFilterProject'), projs, 'Todos os projetos', (p) => p.name);
    if (ui.category && !category(ui.category)) ui.category = '';
    if (ui.project && !project(ui.project)) ui.project = '';
    $('#taskFilterCategory').value = ui.category;
    $('#taskFilterProject').value = ui.project;
  }

  /* Formulário */
  function resetForm() {
    $('#task-form').reset();
    $('#taskId').value = '';
    $('#taskTimeAmount').value = defaultTime();
    $('#task-submit').textContent = 'Adicionar tarefa';
    $('#task-cancel').hidden = true;
  }

  function submit(event) {
    event.preventDefault();
    const title = $('#taskTitle').value.trim();
    if (!title) {
      K.toast.warning('Descreva a tarefa para adicioná-la.');
      $('#taskTitle').focus();
      return;
    }
    const data = {
      title,
      description: $('#taskDescription').value.trim(),
      category: $('#taskCategory').value,
      project: $('#taskProject').value,
      when: $('#taskWhen').value,
      energy: $('#taskEnergy').value,
      timeAmount: $('#taskTimeAmount').value,
      priority: $('#taskPriority').value
    };
    const id = $('#taskId').value;

    if (id) {
      store.commit((s) => Object.assign(s.tasks.find((t) => t.id === id) || {}, data), 'tasks');
      K.toast.success('Tarefa atualizada.');
    } else {
      store.commit((s) => s.tasks.push(Object.assign({ id: U.uid('t'), completed: false, completedAt: '', createdAt: new Date().toISOString() }, data)), 'tasks');
      K.toast.success('Tarefa adicionada.');
      K.audio.feedback('add');
    }
    resetForm();
  }

  function setCompleted(id, completed) {
    store.commit((s) => {
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.completed = completed;
      t.completedAt = completed ? new Date().toISOString() : '';
    }, 'tasks');
    if (completed) {
      K.audio.feedback('done');
      K.toast.success('Tarefa concluída. Bom trabalho.', { duration: 2500 });
    }
  }

  function setFilter(partial) {
    Object.assign(ui, partial);
    if (partial.filter === undefined && (partial.project !== undefined || partial.category !== undefined)) ui.filter = 'all';
    refreshSelects();
    render();
  }

  function init() {
    refreshSelects();
    resetForm();
    render();

    $('#task-form').addEventListener('submit', submit);
    $('#taskSearch').addEventListener('input', U.debounce((e) => { ui.search = e.target.value; render(); }, 150));
    $('#taskSort').addEventListener('change', (e) => { ui.sort = e.target.value; render(); });
    $('#taskFilterCategory').addEventListener('change', (e) => { ui.category = e.target.value; render(); });
    $('#taskFilterProject').addEventListener('change', (e) => { ui.project = e.target.value; render(); });

    store.on(['categories', 'projects', 'all'], refreshSelects);
    store.on(['tasks', 'categories', 'projects', 'personalization', 'all'], render);

    K.actions['task-filter'] = (el) => setFilter({ filter: el.dataset.filter });
    K.actions['task-cancel'] = resetForm;
    K.actions['task-focus'] = (el) => K.focus.startWithTask(el.dataset.id);
    K.actions['task-edit'] = (el) => {
      const t = find(el.dataset.id);
      if (!t) return;
      $('#taskId').value = t.id;
      $('#taskTitle').value = t.title;
      $('#taskDescription').value = t.description;
      $('#taskCategory').value = t.category;
      $('#taskProject').value = t.project;
      $('#taskWhen').value = t.when;
      $('#taskEnergy').value = t.energy;
      $('#taskTimeAmount').value = t.timeAmount;
      $('#taskPriority').value = t.priority;
      $('#task-submit').textContent = 'Salvar alterações';
      $('#task-cancel').hidden = false;
      $('#task-form').scrollIntoView && $('#task-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#taskTitle').focus();
    };
    K.actions['task-delete'] = (el) => {
      const index = tasks().findIndex((t) => t.id === el.dataset.id);
      if (index === -1) return;
      const removed = tasks()[index];
      store.commit((s) => s.tasks.splice(index, 1), 'tasks');
      K.audio.feedback('delete');
      if ($('#taskId').value === removed.id) resetForm();
      K.toast.show('Tarefa excluída.', {
        actions: [{ label: 'Desfazer', onClick: () => store.commit((s) => s.tasks.splice(Math.min(index, s.tasks.length), 0, removed), 'tasks') }]
      });
    };
    K.actions['tasks-clear-completed'] = async () => {
      const done = tasks().filter((t) => t.completed);
      if (!done.length) {
        K.toast.show('Não há tarefas concluídas para limpar.');
        return;
      }
      const ok = await K.dialog.confirm({
        title: 'Limpar concluídas',
        message: 'Remover ' + done.length + ' ' + U.plural(done.length, 'tarefa concluída', 'tarefas concluídas') + '?',
        confirmLabel: 'Remover',
        danger: true
      });
      if (!ok) return;
      store.commit((s) => { s.tasks = s.tasks.filter((t) => !t.completed); }, 'tasks');
      K.toast.show('Tarefas concluídas removidas.');
    };
    K.actions['tasks-clear-all'] = async () => {
      if (!tasks().length) return;
      const ok = await K.dialog.confirm({
        title: 'Limpar todas as tarefas',
        message: 'Todas as ' + tasks().length + ' tarefas serão removidas. Essa ação não pode ser desfeita.',
        confirmLabel: 'Remover tudo',
        danger: true
      });
      if (!ok) return;
      store.commit((s) => { s.tasks = []; }, 'tasks');
      resetForm();
      K.toast.show('Todas as tarefas foram removidas.');
    };
  }

  K.tasks = { init, find, pending, setFilter, setCompleted, effectivePriority, render };
})(window);
