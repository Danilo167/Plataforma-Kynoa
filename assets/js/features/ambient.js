/**
 * Interface dos sons ambiente: botões de alternância (é possível misturar sons),
 * controle de volume em tempo real e estado do que está tocando.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  function labels(keys) {
    return keys.map((key) => K.audio.SOUNDS[key].label).join(', ');
  }

  function refresh(keys) {
    U.$$('#soundGrid [data-sound]').forEach((b) => b.setAttribute('aria-pressed', String(keys.indexOf(b.dataset.sound) !== -1)));
    $('#soundStatus').textContent = keys.length ? 'Tocando: ' + labels(keys) : 'Nenhum som tocando.';
  }

  function applyVolume(value) {
    $('#soundVolume').value = String(value);
    $('#volumeValue').textContent = value + '%';
    K.audio.setVolume(value);
  }

  function init() {
    const supported = K.audio.isSupported();
    $('#soundGrid').replaceChildren(
      ...K.audio.list().map((sound) =>
        h('button', {
          type: 'button', class: 'sound-btn', 'aria-pressed': 'false', disabled: !supported, dataset: { sound: sound.key },
          onclick: () => K.audio.toggle(sound.key)
        }, K.icon(sound.icon), h('span', { text: sound.label })))
    );

    if (!supported) $('#soundStatus').textContent = 'Seu navegador não oferece suporte a áudio.';
    else refresh([]);

    applyVolume(store.state.environment.soundVolume);
    $('#soundVolume').addEventListener('input', (e) => applyVolume(Number(e.target.value)));
    $('#soundVolume').addEventListener('change', (e) => store.commit((s) => { s.environment.soundVolume = Number(e.target.value); }));

    K.audio.onChange(refresh);
    store.on(['environment', 'all'], () => {
      if (Number($('#soundVolume').value) !== store.state.environment.soundVolume) applyVolume(store.state.environment.soundVolume);
    });

    K.actions['sounds-stop'] = () => {
      K.audio.stopAll();
      K.toast.show('Sons ambiente parados.', { duration: 1800 });
    };
  }

  K.ambient = { init };
})(window);
