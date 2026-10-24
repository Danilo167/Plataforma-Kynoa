/**
 * Notificações discretas (toasts). A região usa aria-live para que leitores de tela
 * anunciem as mensagens sem tirar o foco de quem está usando o sistema.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const h = K.utils.h;
  const MAX_VISIBLE = 4;

  function region() {
    let el = document.getElementById('toast-region');
    if (!el) {
      el = h('div', { id: 'toast-region', class: 'toast-region', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * @param {string} message
   * @param {{type?: 'info'|'success'|'warning'|'error', duration?: number, actions?: Array<{label: string, onClick: Function}>}} [options]
   */
  function show(message, options) {
    const opts = options || {};
    const type = opts.type || 'info';
    const host = region();
    let timer = null;
    let closed = false;

    const toast = h('div', { class: 'toast toast-' + type });

    function dismiss() {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 260);
    }

    const actions = (opts.actions || []).map((action) =>
      h('button', {
        type: 'button',
        class: 'btn btn-sm btn-secondary',
        text: action.label,
        onclick: () => {
          dismiss();
          action.onClick();
        }
      })
    );

    toast.appendChild(
      h('div', { class: 'toast-body' },
        h('div', { class: 'toast-message', text: message }),
        actions.length ? h('div', { class: 'toast-actions' }, actions) : null)
    );
    toast.appendChild(
      h('button', { type: 'button', class: 'toast-close', 'aria-label': 'Fechar aviso', onclick: dismiss }, K.icon('x'))
    );

    host.appendChild(toast);
    while (host.children.length > MAX_VISIBLE) host.firstElementChild.remove();

    const duration = opts.duration !== undefined ? opts.duration : actions.length ? 9000 : 3800;
    const arm = () => {
      if (duration > 0) timer = setTimeout(dismiss, duration);
    };
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', arm);
    arm();

    return { dismiss };
  }

  K.toast = {
    show,
    success: (message, options) => show(message, Object.assign({ type: 'success' }, options)),
    warning: (message, options) => show(message, Object.assign({ type: 'warning' }, options)),
    error: (message, options) => show(message, Object.assign({ type: 'error' }, options))
  };
})(window);
