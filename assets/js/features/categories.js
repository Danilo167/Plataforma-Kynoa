/**
 * Categorias: criação, edição no próprio formulário, exclusão e modelo inicial.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', none: 'Sem prioridade' };
  const ICONS = [
    ['', 'Sem ícone'], ['book', 'Estudos'], ['briefcase', 'Trabalho'], ['heart', 'Saúde e pessoal'],
    ['home', 'Casa'], ['target', 'Importante'], ['hourglass', 'Pendente'], ['check', 'Concluído'],
    ['star', 'Favorito'], ['leaf', 'Bem-estar'], ['bolt', 'Energia'], ['chat', 'Social']
  ];
  const SWATCHES = ['#4f46e5', '#7c3aed', '#0891b2', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];

  /** Cores de etiqueta que se adaptam ao tema atual. */
  K.tint = (color) => ({
    background: 'color-mix(in srgb, ' + color + ' 18%, var(--surface-color))',
    color: 'color-mix(in srgb, ' + color + ' 70%, var(--text-primary))'
  });

  const all = () => store.state.categories;
  const find = (id) => all().find((c) => c.id === id);
  const countTasks = (id) => store.state.tasks.filter((t) => t.category === id).length;

  function setIcon(value) {
    const radio = $('input[name="categoryIcon"][value="' + value + '"]') || $('input[name="categoryIcon"][value=""]');
    if (radio) radio.checked = true;
  }

  const getIcon = () => {
    const radio = $('input[name="categoryIcon"]:checked');
    return radio ? radio.value : '';
  };

  function setColor(color) {
    $('#categoryColor').value = color;
    $('#colorHex').textContent = color;
  }

  function resetForm() {
    $('#category-form').reset();
    $('#categoryId').value = '';
    setColor('#4f46e5');
    setIcon('');
    $('#category-submit').textContent = 'Criar categoria';
    $('#category-cancel').hidden = true;
  }

  function buildControls() {
    $('#categoryIcons').replaceChildren(
      ...ICONS.map((item) =>
        h('label', { class: 'icon-choice', title: item[1] },
          h('input', { type: 'radio', name: 'categoryIcon', value: item[0] }),
          h('span', { class: 'icon-box' }, K.icon(item[0] || 'x')),
          h('span', { class: 'sr-only', text: item[1] })))
    );
    $('#categorySwatches').replaceChildren(
      ...SWATCHES.map((color) =>
        h('button', {
          type: 'button', class: 'swatch', style: { background: color },
          'aria-label': 'Usar a cor ' + color, dataset: { action: 'category-swatch', color }
        }))
    );
  }

  function render() {
    const box = $('#categoriesList');
    if (!box) return;
    box.replaceChildren();

    if (!all().length) {
      box.appendChild(
        h('div', { class: 'empty-state' },
          K.icon('tag'),
          h('p', { text: 'Nenhuma categoria ainda. Crie a primeira no formulário ao lado ou parta de um modelo.' }),
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm', dataset: { action: 'categories-seed' }, text: 'Usar categorias de exemplo' }))
      );
      return;
    }

    all().forEach((c) => {
      const total = countTasks(c.id);
      box.appendChild(
        h('article', { class: 'task-item', style: { borderLeftColor: c.color } },
          h('div', { class: 'task-header' },
            h('div', { class: 'task-main' },
              h('div', { class: 'task-title' }, c.icon ? K.icon(c.icon) : null, ' ', c.name),
              c.description ? h('div', { class: 'task-description', text: c.description }) : null),
            h('span', { class: 'custom-tag', style: K.tint(c.color), text: total + ' ' + U.plural(total, 'tarefa', 'tarefas') })),
          h('div', { class: 'task-meta' }, h('span', { text: 'Prioridade padrão: ' + PRIORITY_LABELS[c.priority] })),
          h('div', { class: 'task-actions' },
            h('button', { type: 'button', class: 'btn btn-sm btn-secondary', dataset: { action: 'category-edit', id: c.id } }, K.icon('edit'), 'Editar'),
            h('button', { type: 'button', class: 'btn btn-sm btn-danger', dataset: { action: 'category-delete', id: c.id } }, K.icon('trash'), 'Excluir')))
      );
    });
  }

  function submit(event) {
    event.preventDefault();
    const name = $('#categoryName').value.trim();
    if (!name) {
      K.toast.warning('Dê um nome à categoria.');
      $('#categoryName').focus();
      return;
    }
    const id = $('#categoryId').value;
    if (all().some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) {
      K.toast.warning('Já existe uma categoria com esse nome.');
      return;
    }
    const data = {
      name,
      description: $('#categoryDescription').value.trim(),
      color: $('#categoryColor').value,
      icon: getIcon(),
      priority: $('#categoryPriority').value
    };

    if (id) {
      store.commit((s) => Object.assign(s.categories.find((c) => c.id === id) || {}, data), 'categories');
      K.toast.success('Categoria atualizada.');
    } else {
      store.commit((s) => s.categories.push(Object.assign({ id: U.uid('c'), createdAt: new Date().toISOString() }, data)), 'categories');
      K.toast.success('Categoria criada.');
      K.audio.feedback('add');
    }
    resetForm();
  }

  function seed() {
    const template = (K.data && K.data.categoryTemplate) || [];
    const missing = template.filter((t) => !all().some((c) => c.name.toLowerCase() === t.name.toLowerCase()));
    if (!missing.length) {
      K.toast.show('Você já tem todas as categorias do modelo.');
      return 0;
    }
    store.commit((s) => {
      missing.forEach((t) => s.categories.push(Object.assign({ id: U.uid('c'), createdAt: new Date().toISOString() }, t)));
    }, 'categories');
    K.toast.success(missing.length + ' ' + U.plural(missing.length, 'categoria adicionada', 'categorias adicionadas') + '.');
    return missing.length;
  }

  function init() {
    buildControls();
    resetForm();
    $('#category-form').addEventListener('submit', submit);
    $('#categoryColor').addEventListener('input', (e) => ($('#colorHex').textContent = e.target.value));
    store.on(['categories', 'tasks', 'all'], render);
    render();

    K.actions['category-swatch'] = (el) => setColor(el.dataset.color);
    K.actions['category-cancel'] = resetForm;
    K.actions['categories-seed'] = seed;
    K.actions['category-edit'] = (el) => {
      const c = find(el.dataset.id);
      if (!c) return;
      $('#categoryId').value = c.id;
      $('#categoryName').value = c.name;
      $('#categoryDescription').value = c.description;
      setColor(c.color);
      setIcon(c.icon);
      $('#categoryPriority').value = c.priority;
      $('#category-submit').textContent = 'Salvar alterações';
      $('#category-cancel').hidden = false;
      $('#category-form').scrollIntoView && $('#category-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#categoryName').focus();
    };
    K.actions['category-delete'] = async (el) => {
      const c = find(el.dataset.id);
      if (!c) return;
      const total = countTasks(c.id);
      const ok = await K.dialog.confirm({
        title: 'Excluir categoria',
        message: total
          ? 'A categoria "' + c.name + '" será excluída e ' + total + ' ' + U.plural(total, 'tarefa ficará', 'tarefas ficarão') + ' sem categoria.'
          : 'Excluir a categoria "' + c.name + '"?',
        confirmLabel: 'Excluir',
        danger: true
      });
      if (!ok) return;
      store.commit((s) => {
        s.categories = s.categories.filter((x) => x.id !== c.id);
        s.tasks.forEach((t) => { if (t.category === c.id) t.category = ''; });
      }, 'categories', 'tasks');
      if ($('#categoryId').value === c.id) resetForm();
      K.toast.show('Categoria excluída.');
    };
  }

  K.categories = { init, all, find, seed, render };
})(window);
