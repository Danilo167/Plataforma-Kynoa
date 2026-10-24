/**
 * Personalização: estilo de organização, preferências de neurodiversidade e sugestões
 * que podem ser aplicadas com um clique (alteram de fato o sistema).
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const STYLE_HINTS = {
    visual: 'As tarefas aparecem agrupadas por categoria, com as cores em destaque.',
    textual: 'As tarefas aparecem em uma lista simples, com as descrições visíveis.',
    temporal: 'As tarefas aparecem agrupadas por prazo, de hoje até algum dia.',
    projetos: 'As tarefas aparecem agrupadas por projeto.',
    mista: 'As tarefas aparecem em uma lista simples, e você combina os filtros como preferir.',
    custom: 'Sua descrição fica salva como lembrete do seu próprio método.'
  };

  const SUGGESTIONS = [
    {
      key: 'sensoryOverload',
      title: 'Cores suaves e menos movimento',
      text: 'Reduz a saturação das cores, desativa animações e baixa o volume dos sons ambiente.',
      label: 'Aplicar ajustes',
      isApplied: (s) => s.environment.softColors && s.environment.reduceAnimations,
      apply() {
        store.commit((s) => {
          s.environment.softColors = true;
          s.environment.reduceAnimations = true;
          s.environment.soundVolume = Math.min(s.environment.soundVolume, 35);
        }, 'environment');
      }
    },
    {
      key: 'frequentBreaks',
      title: 'Pausas curtas e frequentes',
      text: 'Define blocos de 15 minutos de foco com 3 minutos de pausa e lembretes automáticos.',
      label: 'Aplicar ritmo',
      isApplied: (s) => s.focus.focusMinutes === 15 && s.focus.breakMinutes === 3,
      apply() {
        store.commit((s) => {
          s.focus.focusMinutes = 15;
          s.focus.breakMinutes = 3;
          s.focus.breakReminders = 'yes';
          s.focus.attentionCycle = 'short';
        }, 'focus');
      }
    },
    {
      key: 'timeEstimates',
      title: 'Sem pressão de tempo',
      text: 'Novas tarefas começam com "Não sei" no tempo estimado. Você pode usar "Algum dia" como prazo.',
      auto: true
    },
    {
      key: 'flexibleStructure',
      title: 'Estrutura flexível',
      text: 'Comece com poucas categorias e reorganize quando quiser. Você pode partir de um modelo.',
      label: 'Adicionar categorias básicas',
      apply: () => K.categories.seed()
    }
  ];

  const DEFAULTS = [
    { title: 'Comece simples', text: 'Crie duas ou três categorias básicas primeiro. Você pode adicionar mais depois.' },
    { title: 'Use cores que ajudem', text: 'Escolha cores que sejam confortáveis para você, não necessariamente as padrão.' },
    { title: 'Permita-se ajustar', text: 'Seu sistema pode mudar conforme você descobre o que funciona melhor.' }
  ];

  const FLAGS = ['sensoryOverload', 'frequentBreaks', 'timeEstimates', 'flexibleStructure'];

  function renderSuggestions() {
    const box = $('#suggestionsContainer');
    if (!box) return;
    const state = store.state;
    const chosen = SUGGESTIONS.filter((s) => state.personalization[s.key]);

    box.replaceChildren(
      ...(chosen.length
        ? chosen.map((s) =>
            h('div', { class: 'card mb-2' },
              h('h4', { class: 'card-title', text: s.title }),
              h('p', { text: s.text }),
              s.auto
                ? h('p', { class: 'form-hint', text: 'Ativo automaticamente.' })
                : s.isApplied && s.isApplied(state)
                  ? h('p', { class: 'form-hint' }, K.icon('check'), ' Já aplicado.')
                  : h('button', { type: 'button', class: 'btn btn-sm btn-secondary mt-1', dataset: { action: 'suggestion-apply', key: s.key }, text: s.label })))
        : DEFAULTS.map((d) => h('div', { class: 'card mb-2' }, h('h4', { class: 'card-title', text: d.title }), h('p', { text: d.text }))))
    );
  }

  function hydrate() {
    const p = store.state.personalization;
    $('#organizationStyle').value = p.style;
    $('#customStyle').value = p.customStyle;
    $('#customStyleContainer').hidden = p.style !== 'custom';
    FLAGS.forEach((flag) => { $('#' + flag).checked = !!p[flag]; });
    const hint = $('#styleHint');
    hint.textContent = STYLE_HINTS[p.style] || '';
    hint.hidden = !STYLE_HINTS[p.style];
    renderSuggestions();
  }

  function init() {
    hydrate();

    $('#organizationStyle').addEventListener('change', (e) => {
      store.commit((s) => { s.personalization.style = e.target.value; }, 'personalization');
      hydrate();
    });
    FLAGS.forEach((flag) => $('#' + flag).addEventListener('change', (e) => {
      store.commit((s) => { s.personalization[flag] = e.target.checked; }, 'personalization');
      renderSuggestions();
    }));

    store.on(['environment', 'focus', 'categories'], renderSuggestions);
    store.on(['all'], hydrate);

    K.actions['save-personalization'] = () => {
      store.commit((s) => {
        s.personalization.style = $('#organizationStyle').value;
        s.personalization.customStyle = $('#customStyle').value.trim();
      }, 'personalization');
      K.toast.success('Preferências salvas.');
    };
    K.actions['suggestion-apply'] = (el) => {
      const suggestion = SUGGESTIONS.find((s) => s.key === el.dataset.key);
      if (!suggestion || !suggestion.apply) return;
      suggestion.apply();
      renderSuggestions();
      if (suggestion.key !== 'flexibleStructure') K.toast.success('Sugestão aplicada.');
    };
  }

  K.personalization = { init };
})(window);
