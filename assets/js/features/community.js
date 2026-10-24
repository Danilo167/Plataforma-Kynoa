/**
 * Comunidade: perfil opcional e salas de conversa.
 *
 * O GitHub Pages hospeda apenas arquivos estáticos, então não há servidor de chat.
 * As salas funcionam localmente: o histórico fica no navegador e as mensagens são
 * sincronizadas em tempo real entre abas abertas do mesmo navegador (BroadcastChannel).
 * A camada de transporte é isolada em "transport" para permitir um backend no futuro.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const h = U.h;
  const $ = U.$;
  const store = K.store;

  const ROOMS = {
    general: 'Espaço aberto para conversar sobre qualquer assunto, no seu ritmo.',
    tips: 'Compartilhe estratégias que funcionam para você e descubra outras.',
    support: 'Espaço de acolhimento. Em momentos de crise, procure apoio profissional ou ligue para o CVV, no 188, 24 horas por dia.'
  };
  const PRONOUN_OPTIONS = ['', 'ele/dele', 'ela/dela', 'elu/delu', 'ile/dile', 'any', 'they'];
  const MAX_LENGTH = 1000;
  const tabId = U.uid('tab');
  const peers = new Map();
  let channel = null;

  /* Perfil */
  function pronounsOf(user) {
    return user.pronouns;
  }

  function hydrateProfile() {
    const u = store.state.user;
    const known = PRONOUN_OPTIONS.indexOf(u.pronouns) !== -1;
    $('#userName').value = u.name;
    $('#userPronouns').value = known ? u.pronouns : 'custom';
    $('#customPronouns').value = known ? '' : u.pronouns;
    $('#customPronounsContainer').hidden = known;
    $('#userInterests').value = u.interests;
  }

  function saveProfile(event) {
    event.preventDefault();
    const choice = $('#userPronouns').value;
    const user = {
      name: $('#userName').value.trim(),
      pronouns: choice === 'custom' ? $('#customPronouns').value.trim() : choice,
      interests: $('#userInterests').value.trim()
    };
    store.commit((s) => Object.assign(s.user, user), 'user');
    K.toast.success('Perfil atualizado.');
  }

  /** Nome exibido nas mensagens, conforme anonimato e visibilidade escolhidos. */
  function authorLabel() {
    const { settings, user } = store.state;
    const pronouns = pronounsOf(user);
    if (settings.anonymousMode) return 'Anônimo';
    if (settings.profileVisibility === 'private') return 'Você';
    if (settings.profileVisibility === 'community') return pronouns ? 'Anônimo (' + pronouns + ')' : 'Anônimo';
    return (user.name || 'Você') + (pronouns ? ' (' + pronouns + ')' : '');
  }

  /* Transporte entre abas */
  const transport = {
    open(onMessage) {
      if (typeof global.BroadcastChannel !== 'function') return;
      channel = new global.BroadcastChannel('kynoa-chat');
      channel.onmessage = (event) => onMessage(event.data);
    },
    post(payload) {
      if (channel) channel.postMessage(Object.assign({ tab: tabId }, payload));
    }
  };

  function room() {
    return store.state.chat.room;
  }

  function messages(name) {
    return store.state.chat.rooms[name || room()] || [];
  }

  function cleanMessage(raw) {
    if (!raw || typeof raw !== 'object' || !ROOMS[raw.room] || typeof raw.text !== 'string') return null;
    const ts = new Date(raw.ts);
    return {
      id: String(raw.id || '').slice(0, 60) || U.uid('msg'),
      room: raw.room,
      author: String(raw.author || 'Anônimo').slice(0, 60),
      text: raw.text.slice(0, 2000),
      ts: isNaN(ts) ? new Date().toISOString() : ts.toISOString(),
      mine: false
    };
  }

  function receive(data) {
    if (!data || data.tab === tabId) return;
    if (data.type === 'hello') {
      const known = peers.has(data.tab);
      peers.set(data.tab, { room: data.room, seen: Date.now() });
      if (!known) announce();
      renderPresence();
    } else if (data.type === 'message') {
      const msg = cleanMessage(data.message);
      if (!msg || messages(msg.room).some((m) => m.id === msg.id)) return;
      store.commit((s) => { s.chat.rooms[msg.room] = s.chat.rooms[msg.room].concat([msg]).slice(-200); }, 'chat');
    } else if (data.type === 'delete' && ROOMS[data.room]) {
      store.commit((s) => { s.chat.rooms[data.room] = s.chat.rooms[data.room].filter((m) => m.id !== data.id); }, 'chat');
    } else if (data.type === 'clear' && ROOMS[data.room]) {
      store.commit((s) => { s.chat.rooms[data.room] = []; }, 'chat');
    }
  }

  function announce() {
    transport.post({ type: 'hello', room: room() });
  }

  function renderPresence() {
    const now = Date.now();
    peers.forEach((p, id) => { if (now - p.seen > 20000) peers.delete(id); });
    const here = 1 + Array.from(peers.values()).filter((p) => p.room === room()).length;
    $('#onlineCount').textContent = here + ' ' + U.plural(here, 'sessão aberta', 'sessões abertas') + ' neste navegador';
  }

  /* Renderização */
  function render() {
    const box = $('#chatMessages');
    if (!box) return;
    const list = messages();
    box.replaceChildren();

    if (!list.length) {
      box.appendChild(
        h('div', { class: 'chat-message system' },
          h('div', { class: 'message-header' }, h('span', { class: 'message-author', text: 'Kynoa' })),
          h('div', { class: 'message-content', text: ROOMS[room()] }),
          h('div', { class: 'form-hint', text: 'As mensagens ficam salvas apenas neste navegador.' }))
      );
    }

    list.forEach((m) => {
      box.appendChild(
        h('div', { class: 'chat-message' + (m.mine ? ' self' : '') },
          h('div', { class: 'message-header' },
            h('span', { class: 'message-author', text: m.author }),
            h('span', { class: 'message-time', text: U.formatTime(m.ts) })),
          h('div', { class: 'message-content', text: m.text }),
          m.mine ? h('div', { class: 'message-actions' }, h('button', { type: 'button', class: 'btn btn-sm btn-ghost', dataset: { action: 'chat-delete', id: m.id }, 'aria-label': 'Apagar mensagem' }, K.icon('trash'), 'Apagar')) : null));
    });

    box.scrollTop = box.scrollHeight;
    U.$$('#roomButtons [data-room]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.room === room())));
    renderPresence();
  }

  function send(event) {
    if (event) event.preventDefault();
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;
    const msg = { id: U.uid('msg'), room: room(), author: authorLabel(), text: text.slice(0, MAX_LENGTH), ts: new Date().toISOString(), mine: true };
    store.commit((s) => { s.chat.rooms[msg.room] = s.chat.rooms[msg.room].concat([msg]).slice(-200); }, 'chat');
    transport.post({ type: 'message', message: Object.assign({}, msg, { mine: undefined }) });
    input.value = '';
    input.focus();
  }

  function init() {
    hydrateProfile();
    render();

    $('#profile-form').addEventListener('submit', saveProfile);
    $('#userPronouns').addEventListener('change', (e) => { $('#customPronounsContainer').hidden = e.target.value !== 'custom'; });
    $('#chat-form').addEventListener('submit', send);
    $('#chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    store.on(['chat', 'all'], render);
    store.on(['user', 'all'], hydrateProfile);

    transport.open(receive);
    announce();
    setInterval(() => { announce(); renderPresence(); }, 8000);

    K.actions['chat-room'] = (el) => {
      store.commit((s) => { s.chat.room = el.dataset.room; }, 'chat');
      announce();
    };
    K.actions['chat-delete'] = (el) => {
      const id = el.dataset.id;
      const name = room();
      store.commit((s) => { s.chat.rooms[name] = s.chat.rooms[name].filter((m) => m.id !== id); }, 'chat');
      transport.post({ type: 'delete', room: name, id });
    };
    K.actions['chat-clear'] = async () => {
      if (!messages().length) return;
      const ok = await K.dialog.confirm({ title: 'Limpar sala', message: 'Apagar todas as mensagens desta sala neste navegador?', confirmLabel: 'Limpar', danger: true });
      if (!ok) return;
      const name = room();
      store.commit((s) => { s.chat.rooms[name] = []; }, 'chat');
      transport.post({ type: 'clear', room: name });
    };
  }

  K.community = { init, authorLabel, receive };
})(window);
