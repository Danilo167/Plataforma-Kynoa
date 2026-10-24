/**
 * Micro-etapas: divide uma tarefa grande em passos pequenos, com sugestão automática
 * (modelos por tipo de tarefa), reordenação, progresso e vínculo opcional a uma tarefa.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil', overwhelming: 'Sobrecarregante' };

  const KINDS = [
    {
      test: /estud|prova|leitur|\bler\b|aprend|revis|aula|curso/,
      steps: (n) => ['Separar o material de "' + n + '"', 'Escolher um único tópico para começar', 'Ler ou assistir por um bloco curto de tempo', 'Anotar com suas palavras o que entendeu', 'Revisar as anotações e marcar as dúvidas']
    },
    {
      test: /limp|arrum|organiz|lavar|faxin|quarto|casa|guarda-roupa|louca/,
      steps: () => ['Escolher apenas uma área para começar', 'Recolher o lixo e o que claramente não pertence ao lugar', 'Levar os itens de volta para onde ficam', 'Limpar as superfícies principais', 'Olhar o resultado e parar quando estiver bom o suficiente']
    },
    {
      test: /escrev|relatorio|artigo|texto|redig|tcc|trabalho|apresenta/,
      steps: () => ['Abrir o arquivo e dar um nome a ele', 'Listar as ideias principais sem se preocupar com a forma', 'Organizar as ideias em uma ordem simples', 'Escrever um rascunho imperfeito da primeira parte', 'Continuar o rascunho em blocos curtos', 'Reler com calma e ajustar o que precisar']
    },
    {
      test: /e-?mail|mensag|responder|ligar|telefon|contato|whatsapp/,
      steps: () => ['Abrir o canal onde a mensagem será enviada', 'Escrever em uma frase o que precisa ser dito', 'Montar o rascunho com o essencial', 'Reler e ajustar o tom', 'Enviar e marcar como feito']
    },
    {
      test: /treino|exerc|academia|caminh|corrida|correr|alongar/,
      steps: () => ['Separar a roupa e o que vai levar', 'Beber água', 'Fazer um aquecimento curto', 'Fazer a parte principal no seu ritmo', 'Alongar e descansar']
    },
    {
      test: /cozinh|refeic|almoc|jantar|receita|lanche/,
      steps: () => ['Decidir o que vai comer, sem complicar', 'Separar os ingredientes e utensílios', 'Preparar a parte principal', 'Finalizar e servir', 'Deixar a louça de molho para depois']
    },
    {
      test: /pagar|conta|boleto|consulta|agendar|marcar|renovar|imposto|banco/,
      steps: () => ['Juntar os documentos e as informações necessárias', 'Abrir o site, o aplicativo ou ir ao local de atendimento', 'Resolver primeiro a parte mais simples', 'Conferir os dados antes de confirmar', 'Guardar o comprovante em um lugar fácil de achar']
    }
  ];

  const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /** Gera passos sugeridos a partir do nome da tarefa e da dificuldade percebida. */
  function suggestSteps(task, difficulty) {
    const name = task.trim();
    const kind = KINDS.find((k) => k.test.test(normalize(name)));
    let steps = kind
      ? kind.steps(name)
      : ['Definir em uma frase o que significa terminar "' + name + '"', 'Separar o que você vai precisar', 'Fazer a primeira parte, a mais simples', 'Parar e revisar o que já foi feito', 'Seguir para a próxima parte, se tiver energia'];

    if (difficulty === 'easy') steps = steps.slice(0, 4);
    if (difficulty === 'hard' || difficulty === 'overwhelming') {
      steps = ['Respirar fundo e decidir que o objetivo de agora é só começar'].concat(steps);
    }
    if (difficulty === 'overwhelming') {
      steps.splice(1, 0, 'Marcar 5 minutos no timer de foco e começar só por eles');
      steps.push('Fazer uma pausa sem culpa');
    }
    steps.push('Celebrar o progresso, por menor que seja');
    return steps;
  }

  const draft = () => store.state.draft;

  /* Rascunho */
  function renderDraft() {
    const box = $('#microStepsContainer');
    if (!box) return;
    box.replaceChildren();
    const steps = draft().steps;

    if (!steps.length) {
      box.appendChild(h('div', { class: 'empty-state' }, h('p', { text: 'Adicione passos manualmente ou peça sugestões.' })));
      return;
    }

    const wrap = h('div', { class: 'task-list no-scroll' });
    steps.forEach((step, i) => {
      wrap.appendChild(
        h('div', { class: 'task-item' },
          h('div', { class: 'task-header' },
            h('div', { class: 'task-title', text: (i + 1) + '. ' + step.text }),
            h('div', { class: 'flex-group gap-1' },
              h('button', { type: 'button', class: 'btn btn-ghost btn-icon btn-sm', 'aria-label': 'Mover passo ' + (i + 1) + ' para cima', disabled: i === 0, dataset: { action: 'micro-move', id: step.id, dir: '-1' } }, K.icon('arrow-up')),
              h('button', { type: 'button', class: 'btn btn-ghost btn-icon btn-sm', 'aria-label': 'Mover passo ' + (i + 1) + ' para baixo', disabled: i === steps.length - 1, dataset: { action: 'micro-move', id: step.id, dir: '1' } }, K.icon('arrow-down')),
              h('button', { type: 'button', class: 'btn btn-danger btn-icon btn-sm', 'aria-label': 'Remover passo ' + (i + 1), dataset: { action: 'micro-remove', id: step.id } }, K.icon('x'))))));
    });
    box.appendChild(wrap);
  }

  function refreshTaskLink() {
    const select = $('#microTaskLink');
    const current = draft().taskId;
    select.replaceChildren(
      h('option', { value: '', text: 'Sem vínculo' }),
      ...K.tasks.pending().map((t) => h('option', { value: t.id, text: t.title }))
    );
    select.value = K.tasks.pending().some((t) => t.id === current) ? current : '';
  }

  function hydrateDraft() {
    const d = draft();
    $('#mainTask').value = d.mainTask;
    $('#taskDifficulty').value = d.difficulty;
    refreshTaskLink();
    $('#micro-submit').textContent = d.editingId ? 'Salvar alterações' : 'Salvar micro-etapas';
    $('#micro-cancel').hidden = !d.editingId;
    renderDraft();
  }

  function resetDraft() {
    store.commit((s) => { s.draft = { mainTask: '', steps: [], difficulty: 'medium', taskId: '', editingId: '' }; });
    hydrateDraft();
  }

  function addStep(text) {
    const value = text.trim();
    if (!value) return false;
    store.commit((s) => s.draft.steps.push({ id: U.uid('s'), text: value, done: false }));
    renderDraft();
    return true;
  }

  /* Conjuntos salvos */
  function progressOf(set) {
    const done = set.steps.filter((s) => s.done).length;
    return { done, total: set.steps.length, pct: set.steps.length ? Math.round((done / set.steps.length) * 100) : 0 };
  }

  function renderSaved() {
    const box = $('#savedMicroSteps');
    if (!box) return;
    box.replaceChildren();
    const sets = store.state.microSteps;

    if (!sets.length) {
      box.appendChild(h('div', { class: 'empty-state' }, K.icon('steps'), h('p', { text: 'Seus conjuntos de micro-etapas salvos aparecem aqui.' })));
      return;
    }

    sets.slice().reverse().forEach((set) => {
      const p = progressOf(set);
      const linked = set.taskId ? K.tasks.find(set.taskId) : null;
      const nextId = (set.steps.find((s) => !s.done) || {}).id;

      box.appendChild(
        h('article', { class: 'task-item' },
          h('div', { class: 'task-header' },
            h('div', { class: 'task-main' },
              h('div', { class: 'task-title', text: set.mainTask }),
              h('div', { class: 'task-meta' },
                h('span', { class: 'diff-' + set.difficulty, text: DIFFICULTY_LABELS[set.difficulty] }),
                linked ? h('span', { class: 'custom-tag tag-outline' }, K.icon('tasks'), linked.title) : null,
                h('span', { text: p.done + ' de ' + p.total + ' ' + U.plural(p.total, 'passo', 'passos') })))),
          h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p.pct, 'aria-label': 'Progresso de ' + set.mainTask },
            h('span', { style: { width: p.pct + '%' } })),
          h('div', { class: 'task-list no-scroll mt-2' },
            set.steps.map((step) => {
              const id = 'step-' + set.id + '-' + step.id;
              return h('div', { class: 'option-row' + (step.done ? ' completed' : '') + (step.id === nextId ? ' is-next' : '') },
                h('label', { for: id, text: step.text + (step.id === nextId ? ' (próximo)' : '') }),
                h('input', { type: 'checkbox', id, checked: step.done, onchange: (e) => toggleStep(set.id, step.id, e.target.checked) }));
            })),
          h('div', { class: 'task-actions' },
            h('button', { type: 'button', class: 'btn btn-sm btn-secondary', dataset: { action: 'micro-focus', id: set.id } }, K.icon('timer'), 'Focar'),
            h('button', { type: 'button', class: 'btn btn-sm btn-ghost', dataset: { action: 'micro-load', id: set.id } }, K.icon('edit'), 'Editar'),
            h('button', { type: 'button', class: 'btn btn-sm btn-danger', dataset: { action: 'micro-delete', id: set.id } }, K.icon('trash'), 'Excluir'))));
    });
  }

  function toggleStep(setId, stepId, done) {
    const before = store.state.microSteps.find((m) => m.id === setId);
    const wasComplete = before && before.steps.every((s) => s.done);
    store.commit((s) => {
      const set = s.microSteps.find((m) => m.id === setId);
      const step = set && set.steps.find((x) => x.id === stepId);
      if (step) step.done = done;
    }, 'microsteps');

    const set = store.state.microSteps.find((m) => m.id === setId);
    if (done) K.audio.feedback('done');
    if (set && !wasComplete && set.steps.length && set.steps.every((s) => s.done)) {
      K.audio.chime('done');
      const task = set.taskId ? K.tasks.find(set.taskId) : null;
      K.toast.success('Todos os passos concluídos. Ótimo trabalho.', {
        actions: task && !task.completed ? [{ label: 'Concluir a tarefa', onClick: () => K.tasks.setCompleted(task.id, true) }] : []
      });
    }
  }

  function save(event) {
    event.preventDefault();
    const d = draft();
    const mainTask = $('#mainTask').value.trim();
    if (!mainTask) {
      K.toast.warning('Digite a tarefa principal.');
      $('#mainTask').focus();
      return;
    }
    if (!d.steps.length) {
      K.toast.warning('Adicione pelo menos um passo.');
      $('#microStepText').focus();
      return;
    }
    const data = { mainTask, steps: d.steps.map((s) => Object.assign({}, s)), difficulty: d.difficulty, taskId: d.taskId };

    if (d.editingId) {
      store.commit((s) => Object.assign(s.microSteps.find((m) => m.id === d.editingId) || {}, data), 'microsteps');
      K.toast.success('Micro-etapas atualizadas.');
    } else {
      store.commit((s) => s.microSteps.push(Object.assign({ id: U.uid('m'), createdAt: new Date().toISOString() }, data)), 'microsteps');
      K.toast.success('Micro-etapas salvas.');
      K.audio.feedback('add');
    }
    resetDraft();
  }

  function init() {
    hydrateDraft();
    renderSaved();

    $('#micro-form').addEventListener('submit', save);
    $('#mainTask').addEventListener('input', (e) => store.commit((s) => { s.draft.mainTask = e.target.value; }));
    $('#mainTask').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#microStepText').focus();
      }
    });
    $('#taskDifficulty').addEventListener('change', (e) => store.commit((s) => { s.draft.difficulty = e.target.value; }));
    $('#microTaskLink').addEventListener('change', (e) => store.commit((s) => { s.draft.taskId = e.target.value; }));
    $('#microStepText').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        K.actions['micro-add-step']();
      }
    });

    store.on(['tasks', 'all'], () => { refreshTaskLink(); renderSaved(); });
    store.on(['microsteps', 'all'], () => { hydrateDraft(); renderSaved(); });

    K.actions['micro-add-step'] = () => {
      const input = $('#microStepText');
      if (addStep(input.value)) {
        input.value = '';
        input.focus();
      } else {
        K.toast.warning('Escreva o passo antes de adicionar.');
        input.focus();
      }
    };
    K.actions['micro-suggest'] = () => {
      const task = $('#mainTask').value.trim();
      if (!task) {
        K.toast.warning('Digite a tarefa principal para receber sugestões.');
        $('#mainTask').focus();
        return;
      }
      const steps = suggestSteps(task, draft().difficulty);
      store.commit((s) => {
        s.draft.mainTask = task;
        steps.forEach((text) => s.draft.steps.push({ id: U.uid('s'), text, done: false }));
      });
      renderDraft();
      K.toast.success(steps.length + ' passos sugeridos. Edite, reordene ou remova o que quiser.');
    };
    K.actions['micro-remove'] = (el) => {
      store.commit((s) => { s.draft.steps = s.draft.steps.filter((x) => x.id !== el.dataset.id); });
      renderDraft();
    };
    K.actions['micro-move'] = (el) => {
      const dir = Number(el.dataset.dir);
      store.commit((s) => {
        const i = s.draft.steps.findIndex((x) => x.id === el.dataset.id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.draft.steps.length) return;
        const moved = s.draft.steps.splice(i, 1)[0];
        s.draft.steps.splice(j, 0, moved);
      });
      renderDraft();
    };
    K.actions['micro-cancel'] = resetDraft;
    K.actions['micro-load'] = (el) => {
      const set = store.state.microSteps.find((m) => m.id === el.dataset.id);
      if (!set) return;
      store.commit((s) => {
        s.draft = { mainTask: set.mainTask, steps: set.steps.map((x) => Object.assign({}, x)), difficulty: set.difficulty, taskId: set.taskId, editingId: set.id };
      });
      hydrateDraft();
      K.toast.show('Micro-etapas carregadas para edição.');
      $('#micro-form').scrollIntoView && $('#micro-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    K.actions['micro-delete'] = async (el) => {
      const set = store.state.microSteps.find((m) => m.id === el.dataset.id);
      if (!set) return;
      const ok = await K.dialog.confirm({ title: 'Excluir micro-etapas', message: 'Excluir "' + set.mainTask + '" e todos os seus passos?', confirmLabel: 'Excluir', danger: true });
      if (!ok) return;
      store.commit((s) => {
        s.microSteps = s.microSteps.filter((m) => m.id !== set.id);
        if (s.draft.editingId === set.id) s.draft.editingId = '';
      }, 'microsteps');
      K.toast.show('Micro-etapas excluídas.');
    };
    K.actions['micro-focus'] = (el) => {
      const set = store.state.microSteps.find((m) => m.id === el.dataset.id);
      if (set && set.taskId && K.tasks.find(set.taskId)) K.focus.startWithTask(set.taskId);
      else K.router.go('foco');
    };
  }

  K.microsteps = { init, suggestSteps };
})(window);
