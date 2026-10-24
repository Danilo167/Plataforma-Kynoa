/**
 * Estado central da aplicação.
 *
 * - defaults(): formato atual dos dados (versão 2).
 * - migrate(): aceita dados antigos (versão 1) ou importados e devolve um estado válido.
 * - commit(): altera o estado, persiste e notifica os módulos interessados.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;

  const VERSION = 2;
  const WHEN = ['today', 'tomorrow', 'this_week', 'next_week', 'someday', 'no_date'];
  const ENERGY = ['low', 'medium', 'high', 'varies'];
  const PRIORITY = ['low', 'medium', 'high', 'none'];
  const DIFFICULTY = ['easy', 'medium', 'hard', 'overwhelming'];
  const THEMES = ['auto', 'light', 'dark', 'sepia'];
  const LEGACY_ICONS = { '📚': 'book', '💼': 'briefcase', '❤️': 'heart', '🏠': 'home', '🎯': 'target', '⏳': 'hourglass', '✅': 'check' };

  function defaults() {
    return {
      version: VERSION,
      user: { name: '', pronouns: '', interests: '' },
      categories: [],
      projects: [],
      tasks: [],
      microSteps: [],
      draft: { mainTask: '', steps: [], difficulty: 'medium', taskId: '', editingId: '' },
      focusSessions: [],
      focusSignals: [
        { id: 'signal_1', text: 'Organizar espaço de trabalho', checked: false },
        { id: 'signal_2', text: 'Tomar água, café ou chá', checked: false },
        { id: 'signal_3', text: 'Respirar profundamente', checked: false }
      ],
      focus: { focusMinutes: 25, breakMinutes: 5, customBreak: 10, attentionCycle: 'medium', breakReminders: 'yes', taskId: '' },
      environment: {
        theme: 'light',
        primaryColor: '#4f46e5',
        backgroundColor: null,
        reduceAnimations: false,
        softColors: false,
        reduceContrast: false,
        sansSerif: true,
        spacious: false,
        fontScale: 100,
        soundVolume: 50
      },
      presets: [],
      settings: {
        profileVisibility: 'private',
        dataStorage: 'local',
        allowNotifications: false,
        anonymousMode: false,
        interfaceSounds: true
      },
      personalization: {
        style: '',
        customStyle: '',
        sensoryOverload: false,
        frequentBreaks: false,
        timeEstimates: false,
        flexibleStructure: true
      },
      energy: { level: '', date: '' },
      chat: { room: 'general', rooms: { general: [], tips: [], support: [] } }
    };
  }

  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const str = (v, fallback) => (typeof v === 'string' ? v : v == null ? fallback || '' : String(v));
  const oneOf = (v, list, fallback) => (list.indexOf(v) !== -1 ? v : fallback);
  const list = (v) => (Array.isArray(v) ? v.filter(isObject) : []);

  function merge(base, extra) {
    const out = Object.assign({}, base);
    Object.keys(extra || {}).forEach((key) => {
      if (extra[key] === undefined) return;
      out[key] = isObject(base[key]) && isObject(extra[key]) ? merge(base[key], extra[key]) : extra[key];
    });
    return out;
  }

  function sanitizeSteps(steps) {
    return list(steps)
      .map((s) => ({ id: str(s.id) || U.uid('s'), text: str(s.text).trim(), done: !!s.done }))
      .filter((s) => s.text);
  }

  /** Converte qualquer estrutura (antiga, importada ou parcial) para o formato atual. */
  function migrate(raw) {
    const source = isObject(raw) ? raw : {};
    const s = merge(defaults(), source);
    s.version = VERSION;

    s.categories = list(source.categories || s.categories).map((c) => ({
      id: str(c.id) || U.uid('c'),
      name: str(c.name).trim() || 'Sem nome',
      description: str(c.description),
      color: U.normalizeHex(c.color) || '#4f46e5',
      icon: LEGACY_ICONS[c.icon] || (K.icons && K.icons.has(c.icon) ? c.icon : ''),
      priority: oneOf(c.priority, PRIORITY, 'medium'),
      createdAt: str(c.createdAt) || new Date().toISOString()
    }));

    s.projects = list(source.projects || s.projects).map((p) => ({
      id: str(p.id) || U.uid('p'),
      name: str(p.name).trim() || 'Projeto',
      createdAt: str(p.createdAt) || new Date().toISOString()
    }));

    s.tasks = list(source.tasks || s.tasks).map((t) => ({
      id: str(t.id) || U.uid('t'),
      title: str(t.title).trim() || 'Tarefa sem título',
      description: str(t.description),
      category: str(t.category),
      project: str(t.project),
      when: oneOf(t.when, WHEN, 'no_date'),
      energy: oneOf(t.energy, ENERGY, 'medium'),
      timeAmount: str(t.timeAmount, 'unknown'),
      priority: oneOf(t.priority, PRIORITY.concat(['']), ''),
      completed: !!t.completed,
      createdAt: str(t.createdAt) || new Date().toISOString(),
      completedAt: t.completed ? str(t.completedAt) || str(t.createdAt) || new Date().toISOString() : ''
    }));

    s.microSteps = list(source.microSteps || s.microSteps).map((m) => ({
      id: str(m.id) || U.uid('m'),
      mainTask: str(m.mainTask).trim() || 'Tarefa',
      steps: sanitizeSteps(m.steps),
      difficulty: oneOf(m.difficulty, DIFFICULTY, 'medium'),
      taskId: str(m.taskId),
      createdAt: str(m.createdAt) || new Date().toISOString()
    }));

    // Rascunho de micro-etapas. A versão 1 guardava os passos em currentMicroSteps.
    const draft = isObject(source.draft) ? source.draft : {};
    s.draft = {
      mainTask: str(draft.mainTask),
      steps: sanitizeSteps(draft.steps && draft.steps.length ? draft.steps : source.currentMicroSteps),
      difficulty: oneOf(draft.difficulty, DIFFICULTY, 'medium'),
      taskId: str(draft.taskId),
      editingId: str(draft.editingId)
    };
    delete s.currentMicroSteps;
    delete s.chatMessages;

    s.focusSessions = list(source.focusSessions || s.focusSessions).map((f) => ({
      id: str(f.id) || U.uid('f'),
      startedAt: str(f.startedAt) || new Date().toISOString(),
      minutes: Math.max(0, Number(f.minutes) || 0),
      completed: f.completed !== false,
      taskId: str(f.taskId),
      taskTitle: str(f.taskTitle)
    })).slice(-500);

    s.focusSignals = list(source.focusSignals || s.focusSignals).map((f) => ({
      id: str(f.id) || U.uid('sg'),
      text: str(f.text).trim(),
      checked: !!f.checked
    })).filter((f) => f.text);

    s.presets = list(source.presets || s.presets).map((p) => ({
      id: str(p.id) || U.uid('pr'),
      name: str(p.name).trim() || 'Ambiente',
      createdAt: str(p.createdAt) || new Date().toISOString(),
      env: isObject(p.env) ? p.env : {},
      sounds: Array.isArray(p.sounds) ? p.sounds.map(String) : [],
      volume: U.clamp(Number(p.volume) || 50, 0, 100)
    }));

    const env = s.environment;
    env.theme = oneOf(env.theme, THEMES, 'light');
    env.primaryColor = U.normalizeHex(env.primaryColor) || '#4f46e5';
    env.backgroundColor = env.backgroundColor && env.backgroundColor !== '#f8fafc' ? U.normalizeHex(env.backgroundColor) : null;
    env.fontScale = [90, 100, 112, 125].indexOf(Number(env.fontScale)) !== -1 ? Number(env.fontScale) : 100;
    env.soundVolume = U.clamp(Number(env.soundVolume), 0, 100);
    if (isNaN(env.soundVolume)) env.soundVolume = 50;

    const focus = s.focus;
    focus.focusMinutes = U.clamp(Number(focus.focusMinutes) || 25, 1, 180);
    focus.breakMinutes = focus.breakMinutes === 'custom' ? 'custom' : U.clamp(Number(focus.breakMinutes) || 5, 1, 60);
    focus.customBreak = U.clamp(Number(focus.customBreak) || 10, 1, 60);
    focus.attentionCycle = oneOf(focus.attentionCycle, ['short', 'medium', 'long', 'variable'], 'medium');
    focus.breakReminders = oneOf(focus.breakReminders, ['yes', 'no', 'sometimes'], 'yes');
    focus.taskId = str(focus.taskId);

    // A versão 1 usava "none" para o modo sem armazenamento persistente.
    if (s.settings.dataStorage === 'none') s.settings.dataStorage = 'session';
    s.settings.profileVisibility = oneOf(s.settings.profileVisibility, ['private', 'community', 'public'], 'private');

    if (!isObject(s.chat.rooms)) s.chat.rooms = {};
    ['general', 'tips', 'support'].forEach((room) => {
      s.chat.rooms[room] = list(s.chat.rooms[room]).slice(-200);
    });
    s.chat.room = oneOf(s.chat.room, ['general', 'tips', 'support'], 'general');

    return s;
  }

  const listeners = new Map();
  let saveTimer = null;

  const store = {
    state: migrate(null),

    load() {
      const mode = K.storage.getMode();
      const raw = K.storage.read(mode);
      this.state = migrate(raw);
      this.state.settings.dataStorage = mode;
      if (!raw && global.matchMedia) {
        // Primeira visita: respeita a preferência do sistema por menos movimento.
        const query = global.matchMedia('(prefers-reduced-motion: reduce)');
        if (query && query.matches) this.state.environment.reduceAnimations = true;
      }
      return this.state;
    },

    /** Registra um ouvinte para um ou mais tópicos. Retorna a função que cancela o registro. */
    on(topics, fn) {
      const names = Array.isArray(topics) ? topics : [topics];
      names.forEach((name) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(fn);
      });
      return () => names.forEach((name) => listeners.get(name) && listeners.get(name).delete(fn));
    },

    emit() {
      const topics = Array.prototype.slice.call(arguments);
      const called = new Set();
      const run = (fn) => {
        if (called.has(fn)) return;
        called.add(fn);
        try {
          fn(this.state);
        } catch (error) {
          console.error('[Kynoa] erro em ouvinte do estado', error);
        }
      };
      if (topics.indexOf('all') !== -1) listeners.forEach((set) => set.forEach(run));
      else topics.forEach((topic) => listeners.get(topic) && listeners.get(topic).forEach(run));
    },

    /** Aplica uma alteração, persiste e notifica os tópicos informados. */
    commit(mutator) {
      const topics = Array.prototype.slice.call(arguments, 1);
      mutator(this.state);
      this.save();
      if (topics.length) this.emit.apply(this, topics);
    },

    save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => this.flush(), 120);
    },

    flush() {
      clearTimeout(saveTimer);
      saveTimer = null;
      return K.storage.write(this.state);
    },

    replace(nextState) {
      const mode = this.state.settings.dataStorage;
      this.state = migrate(nextState);
      this.state.settings.dataStorage = mode;
      this.flush();
      this.emit('all');
    },

    reset() {
      const mode = this.state.settings.dataStorage;
      this.state = migrate(null);
      this.state.settings.dataStorage = mode;
      K.storage.remove(mode);
      this.flush();
      this.emit('all');
    }
  };

  global.addEventListener('beforeunload', () => store.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flush();
  });

  K.store = store;
  K.migrate = migrate;
  K.defaults = defaults;
})(window);
