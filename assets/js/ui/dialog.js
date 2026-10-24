/**
 * Diálogos acessíveis baseados no elemento <dialog>. Substituem alert, confirm e prompt,
 * mantendo foco, tecla Esc e retorno do foco ao elemento de origem.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const h = K.utils.h;
  let dlg = null;

  function ensure() {
    if (dlg) return dlg;
    dlg = h('dialog', { id: 'app-dialog', class: 'dialog', 'aria-labelledby': 'dialog-title' },
      h('div', { class: 'dialog-card' },
        h('div', { class: 'dialog-header' },
          h('h2', { id: 'dialog-title' }),
          h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Fechar', dataset: { dialogClose: '' } }, K.icon('x'))),
        h('div', { class: 'dialog-body', id: 'dialog-body' }),
        h('div', { class: 'dialog-actions', id: 'dialog-actions' })));
    document.body.appendChild(dlg);
    return dlg;
  }

  function closeNative(el) {
    if (typeof el.close === 'function') el.close();
    else {
      el.removeAttribute('open');
      el.dispatchEvent(new Event('close'));
    }
  }

  /**
   * Abre o diálogo e devolve uma Promise com o valor da ação escolhida.
   * Fechar com Esc, no botão X ou clicando fora resolve com dismissValue (null por padrão).
   */
  function open(options) {
    const el = ensure();
    const opts = options || {};
    const returnFocus = document.activeElement;
    const dismissValue = opts.dismissValue !== undefined ? opts.dismissValue : null;

    return new Promise((resolve) => {
      let result = dismissValue;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        el.removeEventListener('close', finish);
        el.removeEventListener('click', onBackdrop);
        el.removeEventListener('click', onCloseButton);
        if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
        resolve(result);
      };

      const choose = (value) => {
        result = value;
        closeNative(el);
      };

      const onBackdrop = (event) => {
        if (event.target === el) closeNative(el);
      };
      const onCloseButton = (event) => {
        if (event.target.closest('[data-dialog-close]')) closeNative(el);
      };

      el.querySelector('#dialog-title').textContent = opts.title || '';
      el.dataset.size = opts.size || 'sm';

      const body = el.querySelector('#dialog-body');
      body.replaceChildren();
      if (opts.body instanceof Node) body.appendChild(opts.body);
      else if (opts.message) body.appendChild(h('p', { text: opts.message }));

      const actions = el.querySelector('#dialog-actions');
      actions.replaceChildren();
      (opts.actions || []).forEach((action) => {
        actions.appendChild(
          h('button', {
            type: 'button',
            class: 'btn ' + (action.variant || 'btn-secondary'),
            text: action.label,
            dataset: { dialogAction: String(action.value) },
            onclick: () => choose(action.value)
          })
        );
      });

      el.addEventListener('close', finish);
      el.addEventListener('click', onBackdrop);
      el.addEventListener('click', onCloseButton);

      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');

      const focusTarget = body.querySelector('input, textarea, select') || actions.querySelector('.btn-primary, .btn-danger') || actions.querySelector('button');
      if (focusTarget) focusTarget.focus();

      // Permite que o conteúdo do corpo feche o diálogo (ex.: Enter em um campo).
      el._choose = choose;
    });
  }

  function confirm(options) {
    const opts = options || {};
    return open({
      title: opts.title || 'Confirmar',
      message: opts.message,
      dismissValue: false,
      actions: [
        { label: opts.cancelLabel || 'Cancelar', value: false, variant: 'btn-ghost' },
        { label: opts.confirmLabel || 'Confirmar', value: true, variant: opts.danger ? 'btn-danger' : 'btn-primary' }
      ]
    });
  }

  function prompt(options) {
    const opts = options || {};
    const input = h('input', {
      type: 'text',
      class: 'form-control',
      id: 'dialog-input',
      value: opts.value || '',
      placeholder: opts.placeholder || '',
      maxLength: opts.maxLength || 120
    });
    const body = h('div', null,
      h('label', { class: 'form-label', for: 'dialog-input', text: opts.label || '' }),
      input);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const el = ensure();
        if (el._choose) el._choose(input.value.trim() || (opts.required === false ? '' : null));
      }
    });

    return open({
      title: opts.title || 'Informe um valor',
      body,
      dismissValue: null,
      actions: [
        { label: 'Cancelar', value: null, variant: 'btn-ghost' },
        { label: opts.confirmLabel || 'Salvar', value: '__submit__', variant: 'btn-primary' }
      ]
    }).then((value) => {
      if (value === '__submit__') return input.value.trim() || null;
      return value;
    });
  }

  function choice(options) {
    const opts = options || {};
    return open({
      title: opts.title,
      message: opts.message,
      dismissValue: null,
      actions: opts.choices
    });
  }

  K.dialog = { open, confirm, prompt, choice };
})(window);
