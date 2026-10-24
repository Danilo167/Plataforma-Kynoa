/**
 * Motor de áudio baseado na Web Audio API.
 *
 * Todos os sons são sintetizados no navegador (ruído filtrado, osciladores e envelopes),
 * portanto o projeto não depende de arquivos de áudio e funciona offline no GitHub Pages.
 *
 * - Sons ambiente: chuva, floresta, café, ondas, ruído branco e ruído marrom. Podem ser misturados.
 * - Avisos: sinos suaves para o fim do foco e da pausa, e pequenos sinais de feedback.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;

  let ctx = null;
  let master = null;
  let volume = 50;
  const buffers = {};
  const active = new Map();
  const subscribers = new Set();

  const Context = () => global.AudioContext || global.webkitAudioContext;
  const rand = (min, max) => min + Math.random() * (max - min);
  const gainFor = (v) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 2) * 0.9;

  function ensure() {
    const Ctor = Context();
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = gainFor(volume);
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
    return ctx;
  }

  /* Ruído */
  function noiseBuffer(type) {
    if (buffers[type]) return buffers[type];
    const rate = ctx.sampleRate;
    const length = rate * 4;
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.5;
      }
    }

    // Suaviza a emenda do laço para evitar estalos.
    const fade = 2400;
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[length - fade + i] = data[length - fade + i] * (1 - t) + data[i] * t;
    }

    buffers[type] = buffer;
    return buffer;
  }

  function loopingNoise(type) {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(type);
    source.loop = true;
    source.start(0, rand(0, 3));
    return source;
  }

  function filter(type, frequency, q) {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    if (q) node.Q.value = q;
    return node;
  }

  function gain(value) {
    const node = ctx.createGain();
    node.gain.value = value;
    return node;
  }

  /** Cadeia: fonte -> nós em série -> destino. */
  function chain(source) {
    const nodes = Array.prototype.slice.call(arguments, 1);
    return nodes.reduce((prev, node) => {
      prev.connect(node);
      return node;
    }, source);
  }

  /* Construtores dos sons. Cada um recebe o destino e um assistente (H) para agendar eventos. */
  const SOUNDS = {
    rain: {
      label: 'Chuva',
      icon: 'rain',
      build(out, H) {
        chain(H.noise('pink'), filter('highpass', 500), filter('lowpass', 8000), gain(0.5)).connect(out);
        chain(H.noise('brown'), filter('lowpass', 500), gain(0.35)).connect(out);
        H.every(() => {
          const t = ctx.currentTime;
          const source = ctx.createBufferSource();
          source.buffer = noiseBuffer('white');
          const env = gain(0.0001);
          env.gain.setValueAtTime(0.0001, t);
          env.gain.linearRampToValueAtTime(rand(0.04, 0.14), t + 0.004);
          env.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
          chain(source, filter('bandpass', rand(1800, 5200), rand(2, 5)), env).connect(out);
          source.start(t, rand(0, 3), 0.08);
        }, 35, 110);
      }
    },

    forest: {
      label: 'Floresta',
      icon: 'tree',
      build(out, H) {
        const wind = filter('lowpass', 450);
        chain(H.noise('pink'), wind, gain(0.32)).connect(out);
        H.lfo(0.07, 260, wind.frequency);

        // Grilos: portadora aguda modulada por um oscilador lento.
        const carrier = H.osc('sine', 4400);
        const amp = gain(0.008);
        chain(carrier, amp, gain(0.6)).connect(out);
        H.lfo(17, 0.008, amp.gain);

        // Pássaros: sequências curtas de glissandos agudos.
        H.every(() => {
          const base = rand(2100, 4200);
          const notes = 2 + Math.floor(Math.random() * 4);
          for (let i = 0; i < notes; i++) {
            const t = ctx.currentTime + i * rand(0.09, 0.14);
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(base * rand(0.95, 1.1), t);
            osc.frequency.exponentialRampToValueAtTime(base * rand(1.25, 1.7), t + 0.07);
            const env = gain(0.0001);
            env.gain.setValueAtTime(0.0001, t);
            env.gain.linearRampToValueAtTime(rand(0.04, 0.09), t + 0.012);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
            chain(osc, env).connect(out);
            osc.start(t);
            osc.stop(t + 0.12);
          }
        }, 1400, 5200);
      }
    },

    cafe: {
      label: 'Café',
      icon: 'coffee',
      build(out, H) {
        const lowVoices = gain(0.5);
        chain(H.noise('pink'), filter('bandpass', 520, 0.7), lowVoices).connect(out);
        H.lfo(0.31, 0.18, lowVoices.gain);
        const highVoices = gain(0.3);
        chain(H.noise('pink'), filter('bandpass', 1250, 1.2), highVoices).connect(out);
        H.lfo(0.17, 0.12, highVoices.gain);
        chain(H.noise('brown'), filter('lowpass', 220), gain(0.2)).connect(out);

        // Xícaras e talheres ao longe.
        H.every(() => {
          const t = ctx.currentTime;
          const base = rand(2300, 3700);
          [1, 1.51].forEach((ratio, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = base * ratio;
            const env = gain(0.0001);
            env.gain.setValueAtTime(0.0001, t);
            env.gain.linearRampToValueAtTime(0.05 / (i + 1), t + 0.004);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
            chain(osc, env).connect(out);
            osc.start(t);
            osc.stop(t + 0.4);
          });
        }, 3000, 9000);
      }
    },

    ocean: {
      label: 'Ondas',
      icon: 'waves',
      build(out, H) {
        const swell = filter('lowpass', 700);
        const swellGain = gain(0.32);
        chain(H.noise('pink'), swell, swellGain).connect(out);
        H.lfo(0.1, 520, swell.frequency);
        H.lfo(0.1, 0.26, swellGain.gain);
        const foam = gain(0.04);
        chain(H.noise('white'), filter('highpass', 3200), foam).connect(out);
        H.lfo(0.1, 0.035, foam.gain);
      }
    },

    white: {
      label: 'Ruído branco',
      icon: 'noise-white',
      build(out, H) {
        chain(H.noise('white'), filter('lowpass', 10000), gain(0.22)).connect(out);
      }
    },

    brown: {
      label: 'Ruído marrom',
      icon: 'noise-brown',
      build(out, H) {
        chain(H.noise('brown'), filter('lowpass', 1200), gain(0.9)).connect(out);
      }
    }
  };

  function notify() {
    subscribers.forEach((fn) => fn(Array.from(active.keys())));
  }

  function start(key) {
    const sound = SOUNDS[key];
    if (!sound || active.has(key)) return false;
    if (!ensure()) return false;

    const instance = ctx.createGain();
    instance.gain.value = 0;
    instance.connect(master);

    const nodes = [];
    const timers = new Set();
    const state = { stopped: false };

    const H = {
      noise(type) {
        const node = loopingNoise(type);
        nodes.push(node);
        return node;
      },
      osc(type, frequency) {
        const node = ctx.createOscillator();
        node.type = type;
        node.frequency.value = frequency;
        node.start();
        nodes.push(node);
        return node;
      },
      /** Oscilador de baixa frequência que modula um AudioParam. */
      lfo(frequency, depth, param) {
        const node = ctx.createOscillator();
        node.frequency.value = frequency;
        const amount = gain(depth);
        node.connect(amount);
        amount.connect(param);
        node.start();
        nodes.push(node);
      },
      every(fn, min, max) {
        const loop = () => {
          const timer = setTimeout(() => {
            timers.delete(timer);
            if (state.stopped) return;
            try {
              fn();
            } catch (error) {
              /* um evento isolado não deve interromper a trilha */
            }
            loop();
          }, rand(min, max));
          timers.add(timer);
        };
        loop();
      }
    };

    sound.build(instance, H);
    instance.gain.setTargetAtTime(1, ctx.currentTime, 0.45);
    active.set(key, { instance, nodes, timers, state });
    notify();
    return true;
  }

  function stop(key) {
    const entry = active.get(key);
    if (!entry) return false;
    active.delete(key);
    entry.state.stopped = true;
    entry.timers.forEach(clearTimeout);
    entry.timers.clear();
    entry.instance.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    setTimeout(() => {
      entry.nodes.forEach((node) => {
        try {
          node.stop();
        } catch (error) {
          /* já parado */
        }
      });
      entry.instance.disconnect();
    }, 1200);
    notify();
    return true;
  }

  function toggle(key) {
    if (active.has(key)) {
      stop(key);
      return false;
    }
    return start(key);
  }

  function stopAll() {
    Array.from(active.keys()).forEach(stop);
  }

  function setVolume(value) {
    volume = Math.max(0, Math.min(100, Number(value) || 0));
    if (master) master.gain.setTargetAtTime(gainFor(volume), ctx.currentTime, 0.05);
  }

  /* Avisos e feedback */
  function interfaceSoundsEnabled() {
    return !K.store || K.store.state.settings.interfaceSounds !== false;
  }

  function bell(frequency, when, duration, peak) {
    const level = 0.25 + 0.75 * (volume / 100);
    [[1, 1], [2.76, 0.32], [5.4, 0.12]].forEach((part) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * part[0];
      const env = gain(0.0001);
      env.gain.setValueAtTime(0.0001, when);
      env.gain.linearRampToValueAtTime(peak * part[1] * level, when + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, when + duration / part[0] ** 0.3);
      chain(osc, env).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + duration + 0.05);
    });
  }

  function pip(frequency, when, duration, peak) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const env = gain(0.0001);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    chain(osc, env).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  /** Sinos de transição do cronômetro. */
  function chime(kind) {
    if (!interfaceSoundsEnabled() || !ensure()) return;
    const t = ctx.currentTime + 0.02;
    if (kind === 'focusEnd') {
      [659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + i * 0.24, 1.8, 0.22));
    } else if (kind === 'breakEnd') {
      [880, 659.25].forEach((f, i) => bell(f, t + i * 0.3, 1.6, 0.2));
    } else {
      bell(784, t, 1.2, 0.18);
    }
  }

  /** Sinais curtos de feedback para ações da interface. */
  function feedback(kind) {
    if (!interfaceSoundsEnabled() || !ensure()) return;
    const t = ctx.currentTime + 0.01;
    if (kind === 'done') {
      pip(523.25, t, 0.18, 0.08);
      pip(783.99, t + 0.1, 0.26, 0.08);
    } else if (kind === 'add') {
      pip(660, t, 0.16, 0.06);
    } else if (kind === 'delete') {
      pip(330, t, 0.2, 0.06);
    }
  }

  /** Desbloqueia o áudio na primeira interação, exigência dos navegadores. */
  function unlock() {
    ensure();
  }

  K.audio = {
    SOUNDS,
    list: () => Object.keys(SOUNDS).map((key) => ({ key, label: SOUNDS[key].label, icon: SOUNDS[key].icon })),
    isSupported: () => !!Context(),
    ensure,
    unlock,
    start,
    stop,
    toggle,
    stopAll,
    setVolume,
    getVolume: () => volume,
    isActive: (key) => active.has(key),
    activeKeys: () => Array.from(active.keys()),
    onChange(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    chime,
    feedback
  };
})(window);
