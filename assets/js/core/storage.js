/**
 * Camada de persistência. Os dados ficam apenas no navegador da pessoa:
 * em localStorage (padrão) ou em sessionStorage (modo "apenas sessão").
 * A escolha do modo é guardada em uma chave separada para que possa ser lida antes do estado.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const PREF_KEY = 'kynoaPrefs';

  function attempt(fn, fallback) {
    try {
      return fn();
    } catch (error) {
      return fallback;
    }
  }

  function area(mode) {
    return mode === 'session' ? global.sessionStorage : global.localStorage;
  }

  const storage = {
    getMode() {
      return attempt(() => {
        const prefs = JSON.parse(global.localStorage.getItem(PREF_KEY) || '{}');
        return prefs.dataStorage === 'session' ? 'session' : 'local';
      }, 'local');
    },

    setMode(mode) {
      attempt(() => global.localStorage.setItem(PREF_KEY, JSON.stringify({ dataStorage: mode })));
    },

    read(mode) {
      return attempt(() => {
        const raw = area(mode || this.getMode()).getItem(K.meta.storageKey);
        return raw ? JSON.parse(raw) : null;
      }, null);
    },

    write(state, mode) {
      return attempt(() => {
        area(mode || this.getMode()).setItem(K.meta.storageKey, JSON.stringify(state));
        return true;
      }, false);
    },

    remove(mode) {
      attempt(() => area(mode || this.getMode()).removeItem(K.meta.storageKey));
    },

    /** Move os dados de um armazenamento para outro e apaga a origem. */
    move(fromMode, toMode, state) {
      this.write(state, toMode);
      this.remove(fromMode);
      this.setMode(toMode);
    }
  };

  K.storage = storage;
})(window);
