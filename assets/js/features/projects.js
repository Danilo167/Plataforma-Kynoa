/**
 * Projetos: agrupam tarefas e mostram o progresso de cada um.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const all = () => store.state.projects;
  const find = (id) => all().find((p) => p.id === id);
  const tasksOf = (id) => store.state.tasks.filter((t) => t.project === id);

  function render() {
    const box = $('#projectsList');
    if (!box) return;
    box.replaceChildren();

    if (!all().length) {
      box.appendChild(h('div', { class: 'empty-state' }, K.icon('folder'), h('p', { text: 'Nenhum projeto ainda. Eles são opcionais.' })));
      return;
    }

    all().forEach((p) => {
      const tasks = tasksOf(p.id);
      const done = tasks.filter((t) => t.completed).length;
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      box.appendChild(
        h('article', { class: 'task-item' },
          h('div', { class: 'task-header' },
            h('div', { class: 'task-main' }, h('div', { class: 'task-title' }, K.icon('folder'), ' ', p.name)),
            h('span', { class: 'custom-tag', text: done + '/' + tasks.length + ' ' + U.plural(tasks.length, 'tarefa', 'tarefas') })),
          tasks.length
            ? h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Progresso do projeto ' + p.name },
                h('span', { style: { width: pct + '%' } }))
            : null,
          h('div', { class: 'task-actions' },
            h('button', { type: 'button', class: 'btn btn-sm btn-secondary', dataset: { action: 'project-filter', id: p.id } }, K.icon('tasks'), 'Ver tarefas'),
            h('button', { type: 'button', class: 'btn btn-sm btn-ghost', dataset: { action: 'project-rename', id: p.id } }, K.icon('edit'), 'Renomear'),
            h('button', { type: 'button', class: 'btn btn-sm btn-danger', dataset: { action: 'project-delete', id: p.id } }, K.icon('trash'), 'Excluir')))
      );
    });
  }

  function init() {
    $('#project-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#projectName');
      const name = input.value.trim();
      if (!name) {
        K.toast.warning('Dê um nome ao projeto.');
        input.focus();
        return;
      }
      if (all().some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        K.toast.warning('Já existe um projeto com esse nome.');
        return;
      }
      store.commit((s) => s.projects.push({ id: U.uid('p'), name, createdAt: new Date().toISOString() }), 'projects');
      input.value = '';
      K.toast.success('Projeto adicionado.');
      K.audio.feedback('add');
    });

    store.on(['projects', 'tasks', 'all'], render);
    render();

    K.actions['project-filter'] = (el) => {
      K.tasks.setFilter({ project: el.dataset.id });
      K.router.go('tarefas');
    };
    K.actions['project-rename'] = async (el) => {
      const p = find(el.dataset.id);
      if (!p) return;
      const name = await K.dialog.prompt({ title: 'Renomear projeto', label: 'Novo nome', value: p.name });
      if (!name) return;
      store.commit((s) => { s.projects.find((x) => x.id === p.id).name = name; }, 'projects');
      K.toast.success('Projeto renomeado.');
    };
    K.actions['project-delete'] = async (el) => {
      const p = find(el.dataset.id);
      if (!p) return;
      const ok = await K.dialog.confirm({
        title: 'Excluir projeto',
        message: 'O projeto "' + p.name + '" será excluído. As tarefas continuam existindo, apenas sem projeto.',
        confirmLabel: 'Excluir',
        danger: true
      });
      if (!ok) return;
      store.commit((s) => {
        s.projects = s.projects.filter((x) => x.id !== p.id);
        s.tasks.forEach((t) => { if (t.project === p.id) t.project = ''; });
      }, 'projects', 'tasks');
      K.toast.show('Projeto excluído.');
    };
  }

  K.projects = { init, all, find, render };
})(window);
