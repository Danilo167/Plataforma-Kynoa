/**
 * Recursos: artigos em janela de leitura e arquivos gerados no próprio navegador.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;

  function articleBody(resource) {
    return h('div', { class: 'resource-body' },
      h('p', { class: 'muted', text: resource.intro }),
      resource.sections.map((section) =>
        h('div', null,
          h('h3', { text: section.heading }),
          (section.paragraphs || []).map((text) => h('p', { text })),
          section.items ? h('ul', null, section.items.map((text) => h('li', { text }))) : null)),
      h('p', { class: 'resource-note', text: resource.note }));
  }

  function init() {
    K.actions['resource-open'] = (el) => {
      const resource = K.data.resources[el.dataset.key];
      if (!resource) return;
      K.dialog.open({
        title: resource.title,
        body: articleBody(resource),
        size: 'lg',
        actions: [{ label: 'Fechar', value: true, variant: 'btn-primary' }]
      });
    };

    K.actions['download-template'] = (el) => {
      if (el.dataset.type === 'categories') {
        const payload = { kynoaTemplate: true, version: K.meta.version, categories: K.data.categoryTemplate };
        U.downloadFile('template-categorias.json', JSON.stringify(payload, null, 2), 'application/json');
        K.toast.success('Modelo baixado. Você pode importá-lo em Configurações.');
      } else {
        U.downloadFile('guia-microetapas.md', K.data.microstepGuide, 'text/markdown');
        K.toast.success('Guia baixado.');
      }
    };

    K.actions['apply-template'] = () => K.categories.seed();
  }

  K.resources = { init };
})(window);
