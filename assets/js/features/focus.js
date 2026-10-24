/**
 * Foco e ritmo.
 *
 * - Cronômetro baseado em horário final (não deriva e continua correto em aba inativa).
 * - Fases de foco e pausa com anel de progresso, sino sonoro, notificação e título da aba.
 * - Política de pausas configurável (automática, manual ou perguntando).
 * - Registro de sessões, estatísticas do dia e gráfico dos últimos 7 dias.
 * - Sinais de foco persistentes.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const CIRCUMFERENCE = 2 * Math.PI * 54;
  const CYCLES = { short: [10, 3], medium: [25, 5], long: [45, 10] };
  const PRESETS = { pomodoro: [25, 5], timebox: [45, 15], sprint: [15, 5] };

  const timer = { phase: 'idle', running: false, endsAt: 0, remainingMs: 0, totalMs: 0, interval: null };
  const cache = {};

  const cfg = () => store.state.focus;
  const breakMinutes = () => (cfg().breakMinutes === 'custom' ? cfg().customBreak : cfg().breakMinutes);
  const remaining = () => (timer.running ? Math.max(0, timer.endsAt - Date.now()) : timer.remainingMs);
  const linkedTask = () => store.state.tasks.find((t) => t.id === cfg().taskId);

  /** Atualiza um nó apenas quando o valor muda, evitando trabalho de layout a cada tick. */
  function setText(selector, value) {
    if (cache[selector] === value) return;
    cache[selector] = value;
    const el = $(selector);
    if (el) el.textContent = value;
  }

  function phaseLabel() {
    if (timer.phase === 'idle') return 'Pronto para começar';
    if (timer.phase === 'focus') return timer.running ? 'Foco' : 'Foco pausado';
    return timer.running ? 'Pausa' : 'Pausa pausada';
  }

  function render() {
    const ms = remaining();
    const clock = U.formatClock(ms / 1000);
    const idle = timer.phase === 'idle';

    setText('#focusTimer', clock);
    setText('#timerPhase', phaseLabel());
    setText('#focusBarClock', clock);
    setText('#focusBarPhase', phaseLabel());
    const task = linkedTask();
    setText('#focusBarTask', task ? task.title : 'Sem tarefa específica');

    const ring = $('#timer-ring');
    if (ring) ring.style.strokeDashoffset = String(idle || !timer.totalMs ? 0 : CIRCUMFERENCE * (1 - ms / timer.totalMs));
    $('#timer').classList.toggle('is-break', timer.phase === 'break');

    $('#startFocus').disabled = !idle;
    $('#pauseFocus').disabled = idle;
    $('#stopFocus').disabled = idle;
    setText('#pauseFocusLabel', timer.running || idle ? 'Pausar' : 'Continuar');
    setText('#focusBarToggleLabel', timer.running ? 'Pausar' : idle ? 'Iniciar' : 'Continuar');

    renderStatus(clock);

    if (!idle && timer.running) document.title = clock + ' ' + phaseLabel() + ' | Kynoa';
    else document.title = K.router.baseTitle();
  }

  function renderStatus(clock) {
    let cls = '';
    let label = 'Disponível';
    let hint = 'Próxima pausa: quando precisar';
    if (timer.phase === 'focus') {
      cls = timer.running ? 'focus' : 'paused';
      label = timer.running ? 'Em foco' : 'Foco pausado';
      hint = 'Pausa em ' + clock;
    } else if (timer.phase === 'break') {
      cls = timer.running ? 'break' : 'paused';
      label = 'Em pausa';
      hint = 'Retorno em ' + clock;
    }
    const dot = $('#statusDot');
    if (cache.dot !== cls) {
      cache.dot = cls;
      dot.className = 'status-dot ' + cls;
    }
    setText('#statusText', 'Status: ' + label);
    setText('#nextBreak', hint);
  }

  /* Controle do cronômetro */
  function play() {
    timer.running = true;
    timer.endsAt = Date.now() + timer.remainingMs;
    clearInterval(timer.interval);
    timer.interval = setInterval(tick, 250);
    render();
  }

  function begin(phase, minutes) {
    timer.phase = phase;
    timer.totalMs = minutes * 60000;
    timer.remainingMs = timer.totalMs;
    play();
  }

  function toIdle() {
    clearInterval(timer.interval);
    timer.interval = null;
    timer.running = false;
    timer.phase = 'idle';
    timer.totalMs = cfg().focusMinutes * 60000;
    timer.remainingMs = timer.totalMs;
    render();
  }

  function start() {
    K.audio.unlock();
    if (timer.phase !== 'idle') return;
    begin('focus', cfg().focusMinutes);
    K.toast.show('Foco iniciado: ' + cfg().focusMinutes + ' min.', { duration: 2200 });
  }

  function startBreak() {
    K.audio.unlock();
    begin('break', breakMinutes());
  }

  function pause() {
    if (!timer.running) return;
    timer.remainingMs = remaining();
    timer.running = false;
    clearInterval(timer.interval);
    timer.interval = null;
    render();
  }

  function toggle() {
    if (timer.phase === 'idle') start();
    else if (timer.running) pause();
    else play();
  }

  function stop(options) {
    const elapsed = timer.totalMs - remaining();
    const wasFocus = timer.phase === 'focus';
    toIdle();
    if (wasFocus && elapsed >= 60000 && !(options && options.silent)) {
      record(Math.round(elapsed / 60000), false);
      K.toast.show('Sessão interrompida. O tempo já focado foi registrado.');
    }
  }

  function tick() {
    if (remaining() <= 0) complete();
    else render();
  }

  function record(minutes, completed) {
    const task = linkedTask();
    store.commit((s) => {
      s.focusSessions.push({
        id: U.uid('f'),
        startedAt: new Date(Date.now() - minutes * 60000).toISOString(),
        minutes,
        completed,
        taskId: task ? task.id : '',
        taskTitle: task ? task.title : ''
      });
      if (s.focusSessions.length > 500) s.focusSessions = s.focusSessions.slice(-500);
    }, 'sessions');
  }

  function complete() {
    const finishedPhase = timer.phase;
    toIdle();

    if (finishedPhase === 'focus') {
      record(cfg().focusMinutes, true);
      K.audio.chime('focusEnd');
      afterFocus();
    } else {
      K.audio.chime('breakEnd');
      K.notify('Pausa concluída', 'Pronto para continuar?');
      K.toast.show('Pausa concluída. Pronto para continuar?', { actions: [{ label: 'Novo ciclo', onClick: start }], duration: 12000 });
    }
  }

  function afterFocus() {
    const policy = cfg().breakReminders;
    const task = linkedTask();
    const actions = [];
    if (task && !task.completed) actions.push({ label: 'Concluir tarefa', onClick: () => K.tasks.setCompleted(task.id, true) });

    K.notify('Foco concluído', 'Hora de uma pausa.');
    if (policy === 'yes') {
      K.toast.success('Tempo de foco concluído. Hora da pausa.', { actions, duration: 9000 });
      startBreak();
      return;
    }
    actions.unshift({ label: 'Iniciar pausa', onClick: startBreak });
    if (policy === 'sometimes') actions.push({ label: 'Continuar focando', onClick: start });
    K.toast.success(policy === 'sometimes' ? 'Foco concluído. Quer fazer uma pausa?' : 'Foco concluído. A pausa fica para quando você quiser.', { actions, duration: 14000 });
  }

  /* Configuração */
  function setDurations(focusMinutes, breakMin) {
    store.commit((s) => {
      s.focus.focusMinutes = focusMinutes;
      s.focus.breakMinutes = breakMin;
    }, 'focus');
  }

  function ensureOption(select, value, label) {
    if (!U.$$('option', select).some((o) => o.value === String(value))) {
      select.appendChild(h('option', { value: String(value), text: label }));
    }
  }

  function hydrate() {
    const f = cfg();
    ensureOption($('#focusTime'), f.focusMinutes, f.focusMinutes + ' minutos');
    $('#focusTime').value = String(f.focusMinutes);
    if (f.breakMinutes !== 'custom') ensureOption($('#breakTime'), f.breakMinutes, f.breakMinutes + ' minutos');
    $('#breakTime').value = String(f.breakMinutes);
    $('#customBreakGroup').hidden = f.breakMinutes !== 'custom';
    $('#customBreak').value = String(f.customBreak);
    $('#attentionCycle').value = f.attentionCycle;
    $('#breakReminders').value = f.breakReminders;
    refreshTaskSelect();
    U.$$('[data-action="focus-preset"]').forEach((b) => {
      const p = PRESETS[b.dataset.mode];
      b.setAttribute('aria-pressed', String(p[0] === f.focusMinutes && p[1] === f.breakMinutes));
    });
    if (timer.phase === 'idle') toIdle();
  }

  function refreshTaskSelect() {
    const select = $('#focusTaskSelect');
    const pendingTasks = K.tasks.pending();
    select.replaceChildren(h('option', { value: '', text: 'Sem tarefa específica' }), ...pendingTasks.map((t) => h('option', { value: t.id, text: t.title })));
    select.value = pendingTasks.some((t) => t.id === cfg().taskId) ? cfg().taskId : '';
  }

  /* Estatísticas */
  function sessionsOn(key) {
    return store.state.focusSessions.filter((s) => U.dayKey(new Date(s.startedAt)) === key);
  }

  function todayStats() {
    const list = sessionsOn(U.dayKey());
    return { count: list.filter((s) => s.completed).length, minutes: list.reduce((sum, s) => sum + s.minutes, 0) };
  }

  function weekData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        minutes: sessionsOn(U.dayKey(d)).reduce((sum, s) => sum + s.minutes, 0),
        today: i === 0
      });
    }
    return days;
  }

  function renderStats() {
    const box = $('#focusStats');
    if (!box) return;
    const today = todayStats();
    const week = weekData();
    const max = Math.max.apply(null, week.map((d) => d.minutes).concat([1]));
    const recent = store.state.focusSessions.slice(-5).reverse();

    box.replaceChildren(
      h('div', { class: 'grid-2 mb-2' },
        h('div', { class: 'card static stat-card' }, h('div', { class: 'stat-value', text: String(today.count) }), h('div', { class: 'stat-label', text: U.plural(today.count, 'sessão hoje', 'sessões hoje') })),
        h('div', { class: 'card static stat-card' }, h('div', { class: 'stat-value', text: U.formatMinutes(today.minutes) }), h('div', { class: 'stat-label', text: 'de foco hoje' }))),
      h('div', { role: 'img', 'aria-label': 'Minutos de foco nos últimos 7 dias: ' + week.map((d) => d.label + ' ' + d.minutes).join(', ') },
        h('div', { class: 'bars' },
          week.map((d) =>
            h('div', { class: 'bar-col' + (d.today ? ' today' : ''), title: d.minutes + ' min' },
              h('div', { class: 'bar', style: { height: Math.max(4, Math.round((d.minutes / max) * 100)) + '%' } }),
              h('span', { text: d.label }))))),
      recent.length
        ? h('div', { class: 'task-list no-scroll mt-2' },
            recent.map((s) =>
              h('div', { class: 'task-item' },
                h('div', { class: 'task-title', text: s.minutes + ' min' + (s.completed ? '' : ' (interrompida)') }),
                h('div', { class: 'task-meta' },
                  h('span', { text: U.dayKey(new Date(s.startedAt)) === U.dayKey() ? 'Hoje, ' + U.formatTime(s.startedAt) : new Date(s.startedAt).toLocaleDateString('pt-BR') + ', ' + U.formatTime(s.startedAt) }),
                  s.taskTitle ? h('span', { text: s.taskTitle }) : null))))
        : h('p', { class: 'muted mt-2', text: 'Suas sessões de foco aparecem aqui.' }),
      recent.length ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost mt-2', dataset: { action: 'focus-clear-history' }, text: 'Limpar histórico' }) : null
    );
  }

  /* Sinais de foco */
  function renderSignals() {
    const box = $('#signalsList');
    if (!box) return;
    box.replaceChildren();
    if (!store.state.focusSignals.length) {
      box.appendChild(h('p', { class: 'muted', text: 'Nenhum sinal ainda. Adicione o que ajuda você a entrar em foco.' }));
      return;
    }
    store.state.focusSignals.forEach((sig) => {
      const id = 'signal-' + sig.id;
      box.appendChild(
        h('div', { class: 'option-row' + (sig.checked ? ' completed' : '') },
          h('label', { for: id, text: sig.text }),
          h('input', { type: 'checkbox', id, checked: sig.checked, onchange: (e) => store.commit((s) => { s.focusSignals.find((x) => x.id === sig.id).checked = e.target.checked; }, 'signals') }),
          h('button', { type: 'button', class: 'btn btn-ghost btn-icon btn-sm', 'aria-label': 'Remover o sinal ' + sig.text, dataset: { action: 'signal-remove', id: sig.id } }, K.icon('x'))));
    });
  }

  function init() {
    hydrate();
    renderStats();
    renderSignals();
    render();

    $('#focusTime').addEventListener('change', (e) => {
      store.commit((s) => { s.focus.focusMinutes = Number(e.target.value); s.focus.attentionCycle = 'variable'; }, 'focus');
    });
    $('#breakTime').addEventListener('change', (e) => {
      store.commit((s) => { s.focus.breakMinutes = e.target.value === 'custom' ? 'custom' : Number(e.target.value); }, 'focus');
    });
    $('#customBreak').addEventListener('change', (e) => {
      store.commit((s) => { s.focus.customBreak = U.clamp(Number(e.target.value) || 5, 1, 60); }, 'focus');
    });
    $('#attentionCycle').addEventListener('change', (e) => {
      const value = e.target.value;
      store.commit((s) => {
        s.focus.attentionCycle = value;
        if (CYCLES[value]) { s.focus.focusMinutes = CYCLES[value][0]; s.focus.breakMinutes = CYCLES[value][1]; }
      }, 'focus');
    });
    $('#breakReminders').addEventListener('change', (e) => store.commit((s) => { s.focus.breakReminders = e.target.value; }, 'focus'));
    $('#focusTaskSelect').addEventListener('change', (e) => { store.commit((s) => { s.focus.taskId = e.target.value; }, 'focus'); render(); });

    $('#signal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#signalText');
      const text = input.value.trim();
      if (!text) return;
      store.commit((s) => s.focusSignals.push({ id: U.uid('sg'), text, checked: false }), 'signals');
      input.value = '';
      input.focus();
    });

    store.on(['focus', 'all'], hydrate);
    store.on(['tasks', 'all'], () => { refreshTaskSelect(); render(); });
    store.on(['sessions', 'all'], renderStats);
    store.on(['signals', 'all'], renderSignals);

    K.actions['focus-start'] = start;
    K.actions['focus-pause'] = toggle;
    K.actions['focus-stop'] = () => stop();
    K.actions['focus-toggle'] = toggle;
    K.actions['focus-preset'] = (el) => {
      const p = PRESETS[el.dataset.mode];
      if (!p) return;
      store.commit((s) => { s.focus.focusMinutes = p[0]; s.focus.breakMinutes = p[1]; s.focus.attentionCycle = 'variable'; }, 'focus');
      K.toast.show('Ritmo ajustado: ' + p[0] + ' min de foco e ' + p[1] + ' min de pausa.', { duration: 2500 });
    };
    K.actions['signal-remove'] = (el) => store.commit((s) => { s.focusSignals = s.focusSignals.filter((x) => x.id !== el.dataset.id); }, 'signals');
    K.actions['focus-clear-history'] = async () => {
      const ok = await K.dialog.confirm({ title: 'Limpar histórico', message: 'Apagar todas as sessões de foco registradas?', confirmLabel: 'Apagar', danger: true });
      if (ok) store.commit((s) => { s.focusSessions = []; }, 'sessions');
    };
  }

  K.focus = {
    init,
    start,
    stop,
    pause,
    toggle,
    render,
    setDurations,
    todayStats,
    isActive: () => timer.phase !== 'idle',
    isRunning: () => timer.running,
    startWithTask(id) {
      if (!K.tasks.find(id)) return;
      store.commit((s) => { s.focus.taskId = id; }, 'focus');
      K.router.go('foco');
      if (timer.phase === 'idle') start();
      else K.toast.show('Tarefa vinculada ao ciclo em andamento.');
    }
  };
})(window);
