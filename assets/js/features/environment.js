/**
 * Ambiente sensorial: temas, cores personalizadas, controle de estímulos,
 * modo foco e ambientes salvos (presets com tema, ajustes e sons).
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const THEME_BG = { light: '#f8fafc', dark: '#0f172a', sepia: '#f4ecd8' };
  const THEME_NAMES = { auto: 'Automático', light: 'Claro', dark: 'Escuro', sepia: 'Sépia' };
  const FLAGS = ['reduceAnimations', 'softColors', 'reduceContrast', 'sansSerif', 'spacious'];
  const DEFAULT_ENV = { theme: 'light', primaryColor: '#4f46e5', backgroundColor: null, reduceAnimations: false, softColors: false, reduceContrast: false, sansSerif: true, spacious: false, fontScale: 100 };
  const PALETTE_VARS = ['--background-color', '--surface-color', '--text-primary', '--text-secondary', '--text-light', '--border-color', '--primary-text'];

  function resolveTheme(theme) {
    if (theme !== 'auto') return theme;
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /** Paleta coerente para um fundo escolhido pela pessoa, garantindo texto legível. */
  function paletteFor(bg, primary) {
    if (U.luminance(bg) < 0.25) {
      return {
        '--background-color': bg,
        '--surface-color': U.lighten(bg, 7),
        '--text-primary': '#f1f5f9',
        '--text-secondary': '#cbd5e1',
        '--text-light': '#94a3b8',
        '--border-color': U.lighten(bg, 16),
        '--primary-text': U.mix(primary, '#ffffff', 0.5)
      };
    }
    return {
      '--background-color': bg,
      '--surface-color': U.mix(bg, '#ffffff', 0.55),
      '--text-primary': '#1e293b',
      '--text-secondary': '#475569',
      '--text-light': '#64748b',
      '--border-color': U.darken(bg, 9),
      '--primary-text': U.darken(primary, 18)
    };
  }

  function apply() {
    const env = store.state.environment;
    const root = document.documentElement;
    const primary = env.primaryColor;
    const sidebar = U.ensureDark(primary);

    root.dataset.theme = resolveTheme(env.theme);
    root.dataset.reduceMotion = String(!!env.reduceAnimations);
    root.dataset.softColors = String(!!env.softColors);
    root.dataset.lowContrast = String(!!env.reduceContrast);
    root.dataset.spacious = String(!!env.spacious);
    root.dataset.font = env.sansSerif ? 'sans' : 'serif';
    root.style.fontSize = env.fontScale + '%';

    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--primary-dark', U.darken(primary, 18));
    root.style.setProperty('--primary-light', U.lighten(primary, 15));
    root.style.setProperty('--on-primary', U.readableOn(primary));
    root.style.setProperty('--sidebar-from', U.darken(sidebar, 14));
    root.style.setProperty('--sidebar-to', sidebar);

    PALETTE_VARS.forEach((name) => root.style.removeProperty(name));
    if (env.backgroundColor) {
      const palette = paletteFor(env.backgroundColor, primary);
      Object.keys(palette).forEach((name) => root.style.setProperty(name, palette[name]));
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', sidebar);
  }

  function hydrate() {
    const env = store.state.environment;
    U.$$('#themeCards [data-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === env.theme)));
    $('#primaryColor').value = env.primaryColor;
    $('#backgroundColor').value = env.backgroundColor || THEME_BG[resolveTheme(env.theme)];
    FLAGS.forEach((flag) => { $('#' + flag).checked = !!env[flag]; });
    $('#fontScale').value = String(env.fontScale);
  }

  function update(partial) {
    store.commit((s) => Object.assign(s.environment, partial), 'environment');
  }

  /* Modo foco */
  function setFocusMode(on) {
    document.body.classList.toggle('focus-mode', on);
    const btn = $('#focusModeBtn');
    btn.setAttribute('aria-pressed', String(on));
    $('#focusModeLabel').textContent = on ? 'Desativar modo foco' : 'Ativar modo foco';
    if (on) K.toast.show('Modo foco ativado. Pressione Esc para sair.', { duration: 3500 });
  }

  /* Ambientes salvos */
  function snapshot(name) {
    const env = store.state.environment;
    const copy = {};
    Object.keys(DEFAULT_ENV).forEach((key) => { copy[key] = env[key]; });
    return { id: U.uid('pr'), name, createdAt: new Date().toISOString(), env: copy, sounds: K.audio.activeKeys(), volume: env.soundVolume };
  }

  function renderPresets() {
    const box = $('#presetsList');
    if (!box) return;
    box.replaceChildren();
    const presets = store.state.presets;
    if (!presets.length) {
      box.appendChild(h('p', { class: 'muted', text: 'Nenhum ambiente salvo ainda.' }));
      return;
    }
    presets.forEach((p) => {
      box.appendChild(
        h('div', { class: 'option-row' },
          h('div', null,
            h('strong', { text: p.name }),
            h('div', { class: 'form-hint', text: 'Tema ' + (THEME_NAMES[p.env.theme] || 'Claro').toLowerCase() + (p.sounds.length ? ', ' + p.sounds.length + ' ' + U.plural(p.sounds.length, 'som', 'sons') : '') })),
          h('div', { class: 'flex-group gap-1' },
            h('button', { type: 'button', class: 'btn btn-sm btn-secondary', dataset: { action: 'preset-apply', id: p.id }, text: 'Aplicar' }),
            h('button', { type: 'button', class: 'btn btn-sm btn-ghost btn-icon', 'aria-label': 'Excluir o ambiente ' + p.name, dataset: { action: 'preset-delete', id: p.id } }, K.icon('trash')))));
    });
  }

  function init() {
    apply();
    hydrate();
    renderPresets();

    store.on(['environment', 'all'], () => { apply(); hydrate(); });
    store.on(['presets', 'all'], renderPresets);

    if (global.matchMedia) {
      const query = global.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => { if (store.state.environment.theme === 'auto') { apply(); hydrate(); } };
      if (query.addEventListener) query.addEventListener('change', onChange);
    }

    FLAGS.forEach((flag) => $('#' + flag).addEventListener('change', (e) => update({ [flag]: e.target.checked })));
    $('#fontScale').addEventListener('change', (e) => update({ fontScale: Number(e.target.value) }));

    K.actions['set-theme'] = (el) => update({ theme: el.dataset.theme, backgroundColor: null });
    K.actions['apply-colors'] = () => {
      const primaryColor = $('#primaryColor').value;
      const bg = $('#backgroundColor').value;
      const isThemeBg = bg === THEME_BG[resolveTheme(store.state.environment.theme)];
      update({ primaryColor, backgroundColor: isThemeBg ? null : bg });
      K.toast.success('Cores aplicadas.');
    };
    K.actions['clear-background'] = () => {
      update({ backgroundColor: null });
      K.toast.show('Fundo personalizado removido.');
    };
    K.actions['toggle-focus-mode'] = () => setFocusMode(!document.body.classList.contains('focus-mode'));
    K.actions['focus-mode-off'] = () => setFocusMode(false);

    K.actions['preset-save'] = async () => {
      const name = await K.dialog.prompt({ title: 'Salvar ambiente', label: 'Nome do ambiente', placeholder: 'Ex.: Estudo noturno', confirmLabel: 'Salvar' });
      if (!name) return;
      store.commit((s) => s.presets.push(snapshot(name)), 'presets');
      K.toast.success('Ambiente "' + name + '" salvo. Ele guarda tema, ajustes e sons ativos.');
    };
    K.actions['preset-apply'] = (el) => {
      const p = store.state.presets.find((x) => x.id === el.dataset.id);
      if (!p) return;
      store.commit((s) => { Object.assign(s.environment, p.env, { soundVolume: p.volume }); }, 'environment');
      K.audio.stopAll();
      K.audio.setVolume(p.volume);
      p.sounds.forEach((key) => K.audio.start(key));
      K.toast.success('Ambiente "' + p.name + '" aplicado.');
    };
    K.actions['preset-delete'] = (el) => {
      store.commit((s) => { s.presets = s.presets.filter((x) => x.id !== el.dataset.id); }, 'presets');
      K.toast.show('Ambiente excluído.');
    };
    K.actions['env-reset'] = async () => {
      const ok = await K.dialog.confirm({ title: 'Restaurar padrão', message: 'Voltar tema, cores e ajustes sensoriais ao padrão? Seus ambientes salvos não são afetados.', confirmLabel: 'Restaurar' });
      if (!ok) return;
      update(DEFAULT_ENV);
      K.toast.success('Ambiente restaurado para o padrão.');
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
        const dialog = document.getElementById('app-dialog');
        if (!(dialog && dialog.open)) setFocusMode(false);
      }
    });
  }

  K.environment = { init, apply, setFocusMode };
})(window);
