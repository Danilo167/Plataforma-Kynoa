/**
 * Notificações do sistema operacional (Notification API), usadas apenas quando
 * a pessoa permitiu e a aba está em segundo plano. Nos demais casos o toast basta.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;

  K.notify = function (title, body) {
    try {
      const allowed = K.store.state.settings.allowNotifications;
      if (allowed && 'Notification' in global && global.Notification.permission === 'granted' && document.visibilityState === 'hidden') {
        new global.Notification(title, { body: body || '', icon: 'assets/icons/icon-192.png', tag: 'kynoa' });
      }
    } catch (error) {
      /* notificações são opcionais */
    }
  };
})(window);
