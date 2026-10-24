/**
 * Testes de fumaça: sobem um servidor estático, carregam a aplicação em um DOM simulado (jsdom)
 * e exercitam os fluxos principais. Execute com: npm install && npm test
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let passed = 0;
const failures = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log('  ok   ' + name);
  } else {
    failures.push(name);
    console.log('  FAIL ' + name + (detail ? ' -> ' + detail : ''));
  }
}

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Simulações das APIs que o jsdom não implementa. */
function installMocks(window, state) {
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = function () {};
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
  window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
  window.URL.createObjectURL = (blob) => { state.blobs.push(blob); return 'blob:mock'; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () { state.downloads.push(this.download); };

  const calls = state.audio;
  class FakeParam { constructor() { this.value = 0; } setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} }
  class FakeNode { constructor() { this.gain = new FakeParam(); this.frequency = new FakeParam(); this.Q = new FakeParam(); } connect(n) { return n; } disconnect() {} start() { calls.started++; } stop() {} }
  window.AudioContext = class {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = new FakeNode(); calls.contexts++; }
    createGain() { return new FakeNode(); }
    createOscillator() { return new FakeNode(); }
    createBiquadFilter() { return new FakeNode(); }
    createBufferSource() { return new FakeNode(); }
    createBuffer(c, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    resume() { return Promise.resolve(); }
  };
}

async function boot(baseUrl, options) {
  const opts = options || {};
  const state = { audio: { contexts: 0, started: 0 }, blobs: [], downloads: [], errors: [] };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => state.errors.push(String(e.message || e)));
  virtualConsole.on('error', (...args) => state.errors.push(args.join(' ')));

  const dom = await JSDOM.fromURL(baseUrl + '/', {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      installMocks(window, state);
      if (opts.seed) window.localStorage.setItem('kynoaSystem', JSON.stringify(opts.seed));
    }
  });
  await new Promise((resolve) => (dom.window.__kynoaBooted ? resolve() : dom.window.addEventListener('load', () => setTimeout(resolve, 50))));
  await sleep(100);
  return { dom, window: dom.window, document: dom.window.document, state, K: dom.window.Kynoa };
}

function fire(window, el, type) {
  el.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
}

function type(window, el, value) {
  el.value = value;
  fire(window, el, 'input');
  fire(window, el, 'change');
}

function submit(window, form) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

async function main() {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;

  /* 1. Inicialização */
  console.log('\nInicialização');
  let app = await boot(base);
  let { window, document: doc, K, state } = app;
  check('aplicação inicializa sem erros', window.__kynoaBooted === true && state.errors.length === 0, state.errors.join(' | '));
  check('sprite de ícones montado', !!doc.getElementById('i-home'));
  check('título inicial', doc.title.indexOf('Início') === 0);

  /* 2. Navegação */
  console.log('\nNavegação');
  doc.querySelector('[data-tab="tarefas"]').click();
  window.location.hash = 'tarefas';
  await sleep(50);
  check('hash abre a aba de tarefas', doc.getElementById('tarefas').classList.contains('active'));
  check('menu marca a aba atual', doc.querySelector('[data-tab="tarefas"]').getAttribute('aria-current') === 'page');
  check('hash inválido volta ao início', (() => { window.location.hash = 'inexistente'; return true; })());
  await sleep(50);
  check('aba início ativa após hash inválido', doc.getElementById('inicio').classList.contains('active'));

  /* 3. Categorias */
  console.log('\nCategorias');
  type(window, doc.getElementById('categoryName'), 'Estudos');
  doc.querySelector('input[name="categoryIcon"][value="book"]').checked = true;
  submit(window, doc.getElementById('category-form'));
  check('categoria criada', K.store.state.categories.length === 1 && K.store.state.categories[0].icon === 'book');
  check('categoria aparece na lista', doc.getElementById('categoriesList').textContent.includes('Estudos'));
  check('categoria entra no seletor de tarefas', Array.from(doc.getElementById('taskCategory').options).some((o) => o.text === 'Estudos'));
  type(window, doc.getElementById('categoryName'), 'estudos');
  submit(window, doc.getElementById('category-form'));
  check('nome duplicado é recusado', K.store.state.categories.length === 1);
  doc.querySelector('[data-action="categories-seed"], [data-action="category-edit"]').click();
  check('edição carrega o formulário', doc.getElementById('categoryId').value === K.store.state.categories[0].id);
  type(window, doc.getElementById('categoryName'), 'Estudos e leituras');
  submit(window, doc.getElementById('category-form'));
  check('edição mantém o mesmo registro', K.store.state.categories.length === 1 && K.store.state.categories[0].name === 'Estudos e leituras');

  /* 4. Tarefas e segurança */
  console.log('\nTarefas');
  const catId = K.store.state.categories[0].id;
  type(window, doc.getElementById('taskTitle'), '<img src=x onerror="window.__xss=1">');
  doc.getElementById('taskCategory').value = catId;
  submit(window, doc.getElementById('task-form'));
  await sleep(30);
  check('tarefa criada', K.store.state.tasks.length === 1);
  check('texto da tarefa não vira HTML', window.__xss === undefined && !doc.querySelector('#tasksList img'));
  type(window, doc.getElementById('taskTitle'), 'Estudar redes');
  type(window, doc.getElementById('taskEnergy'), 'low');
  submit(window, doc.getElementById('task-form'));
  check('segunda tarefa criada', K.store.state.tasks.length === 2);

  const first = K.store.state.tasks[1];
  doc.querySelector('[data-action="task-edit"][data-id="' + first.id + '"]').click();
  type(window, doc.getElementById('taskTitle'), 'Estudar redes de computadores');
  submit(window, doc.getElementById('task-form'));
  check('edição preserva identidade da tarefa', K.store.state.tasks.length === 2 && K.store.state.tasks[1].id === first.id && K.store.state.tasks[1].title.endsWith('computadores'));

  const checkbox = doc.getElementById('task-check-' + first.id);
  checkbox.checked = true;
  fire(window, checkbox, 'change');
  check('conclusão registra data', K.store.state.tasks[1].completed && !!K.store.state.tasks[1].completedAt);

  K.actions['task-filter'](doc.querySelector('[data-filter="completed"]'));
  check('filtro de concluídas', doc.querySelectorAll('#tasksList .task-item').length === 1);
  K.actions['task-filter'](doc.querySelector('[data-filter="all"]'));

  doc.querySelector('[data-action="task-delete"][data-id="' + first.id + '"]').click();
  check('exclusão remove a tarefa', K.store.state.tasks.length === 1);
  const undo = Array.from(doc.querySelectorAll('.toast .btn')).find((b) => b.textContent === 'Desfazer');
  undo.click();
  check('desfazer restaura a tarefa', K.store.state.tasks.length === 2);

  /* 5. Estilo de organização */
  console.log('\nPersonalização');
  type(window, doc.getElementById('organizationStyle'), 'visual');
  check('estilo visual agrupa por categoria', doc.querySelectorAll('#tasksList .task-group-title').length >= 1);
  doc.getElementById('sensoryOverload').checked = true;
  fire(window, doc.getElementById('sensoryOverload'), 'change');
  const apply = doc.querySelector('[data-action="suggestion-apply"][data-key="sensoryOverload"]');
  apply.click();
  check('sugestão altera o ambiente de verdade', K.store.state.environment.softColors && K.store.state.environment.reduceAnimations);
  check('ajuste reflete no documento', doc.documentElement.dataset.softColors === 'true' && doc.documentElement.dataset.reduceMotion === 'true');

  /* 6. Micro-etapas */
  console.log('\nMicro-etapas');
  type(window, doc.getElementById('mainTask'), 'Arrumar o quarto');
  doc.querySelector('[data-action="micro-suggest"]').click();
  const suggested = K.store.state.draft.steps.length;
  check('sugestão gera passos para o tipo da tarefa', suggested >= 5 && K.store.state.draft.steps.some((s) => s.text.includes('lixo')));
  type(window, doc.getElementById('microStepText'), 'Passo extra');
  doc.querySelector('[data-action="micro-add-step"]').click();
  check('passo manual adicionado', K.store.state.draft.steps.length === suggested + 1);
  const firstStep = K.store.state.draft.steps[0].text;
  doc.querySelector('[data-action="micro-move"][data-dir="1"]').click();
  check('reordenação funciona', K.store.state.draft.steps[1].text === firstStep);
  submit(window, doc.getElementById('micro-form'));
  check('conjunto salvo e rascunho limpo', K.store.state.microSteps.length === 1 && K.store.state.draft.steps.length === 0);
  const stepBox = doc.querySelector('#savedMicroSteps input[type="checkbox"]');
  stepBox.checked = true;
  fire(window, stepBox, 'change');
  check('progresso de passos é salvo', K.store.state.microSteps[0].steps.filter((s) => s.done).length === 1);

  /* 7. Foco */
  console.log('\nFoco');
  doc.getElementById('startFocus').click();
  check('timer inicia', K.focus.isRunning() && doc.getElementById('startFocus').disabled);
  check('contexto de áudio desbloqueado ao iniciar', state.audio.contexts >= 1);
  doc.getElementById('pauseFocus').click();
  check('timer pausa', !K.focus.isRunning());
  doc.getElementById('pauseFocus').click();
  check('timer retoma', K.focus.isRunning());
  const realNow = window.Date.now;
  window.Date.now = () => realNow() + 26 * 60 * 1000;
  await sleep(450);
  window.Date.now = realNow;
  check('sessão concluída é registrada', K.store.state.focusSessions.length === 1 && K.store.state.focusSessions[0].completed);
  check('pausa automática inicia após o foco', K.focus.isActive());
  doc.getElementById('stopFocus').click();
  check('parar volta ao estado inicial', !K.focus.isActive());
  doc.querySelector('[data-action="focus-preset"][data-mode="sprint"]').click();
  check('técnica ajusta os tempos', K.store.state.focus.focusMinutes === 15 && K.store.state.focus.breakMinutes === 5 && doc.getElementById('focusTimer').textContent === '15:00');
  type(window, doc.getElementById('breakTime'), 'custom');
  check('pausa personalizada exibe o campo', !doc.getElementById('customBreakGroup').hidden);
  type(window, doc.getElementById('signalText'), 'Colocar fone de ouvido');
  submit(window, doc.getElementById('signal-form'));
  check('sinal de foco persistido', K.store.state.focusSignals.some((s) => s.text.includes('fone')));

  /* 8. Ambiente e sons */
  console.log('\nAmbiente e sons');
  doc.querySelector('[data-action="set-theme"][data-theme="dark"]').click();
  check('tema escuro aplicado', doc.documentElement.dataset.theme === 'dark');
  type(window, doc.getElementById('primaryColor'), '#e11d48');
  type(window, doc.getElementById('backgroundColor'), '#102030');
  doc.querySelector('[data-action="apply-colors"]').click();
  check('cor principal chega ao CSS', doc.documentElement.style.getPropertyValue('--primary-color') === '#e11d48');
  check('fundo personalizado gera paleta legível', doc.documentElement.style.getPropertyValue('--text-primary') === '#f1f5f9');
  doc.querySelector('[data-action="clear-background"]').click();
  check('fundo personalizado removido', doc.documentElement.style.getPropertyValue('--text-primary') === '');

  const buttons = doc.querySelectorAll('#soundGrid .sound-btn');
  check('seis sons disponíveis', buttons.length === 6);
  buttons[0].click();
  buttons[1].click();
  check('sons podem ser misturados', K.audio.activeKeys().length === 2 && buttons[0].getAttribute('aria-pressed') === 'true');
  check('status descreve o que toca', doc.getElementById('soundStatus').textContent.includes('Chuva'));
  type(window, doc.getElementById('soundVolume'), '30');
  check('volume atualiza em tempo real', doc.getElementById('volumeValue').textContent === '30%' && K.store.state.environment.soundVolume === 30);
  doc.querySelector('[data-action="preset-save"]').click();
  await sleep(20);
  const input = doc.getElementById('dialog-input');
  input.value = 'Estudo';
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await sleep(30);
  check('ambiente salvo com sons e tema', K.store.state.presets.length === 1 && K.store.state.presets[0].sounds.length === 2);
  doc.querySelector('[data-action="sounds-stop"]').click();
  check('parar todos os sons', K.audio.activeKeys().length === 0);

  doc.querySelector('[data-action="toggle-focus-mode"]').click();
  check('modo foco ativa a barra', doc.body.classList.contains('focus-mode'));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Esc sai do modo foco', !doc.body.classList.contains('focus-mode'));

  /* 9. Comunidade */
  console.log('\nComunidade');
  type(window, doc.getElementById('chatInput'), 'Olá, <b>pessoal</b>');
  submit(window, doc.getElementById('chat-form'));
  check('mensagem enviada e salva', K.store.state.chat.rooms.general.length === 1);
  check('mensagem não interpreta HTML', !doc.querySelector('#chatMessages b'));
  doc.querySelector('[data-action="chat-room"][data-room="tips"]').click();
  check('troca de sala', K.store.state.chat.room === 'tips' && doc.querySelector('#chatMessages .system'));
  K.community.receive({ tab: 'outra', type: 'message', message: { id: 'x1', room: 'tips', author: 'Alguém', text: 'Oi', ts: new Date().toISOString() } });
  check('mensagem de outra aba é recebida', K.store.state.chat.rooms.tips.length === 1 && !K.store.state.chat.rooms.tips[0].mine);

  /* 10. Recursos e configurações */
  console.log('\nRecursos e configurações');
  doc.querySelector('[data-action="resource-open"][data-key="wellbeing"]').click();
  check('artigo abre em diálogo', doc.getElementById('app-dialog').hasAttribute('open') && doc.getElementById('dialog-body').textContent.includes('188'));
  doc.querySelector('[data-dialog-action="true"]').click();
  doc.querySelector('[data-action="download-template"][data-type="categories"]').click();
  check('modelo é baixado como arquivo', state.downloads.includes('template-categorias.json'));
  doc.querySelector('[data-action="export-data"]').click();
  check('exportação gera backup', state.downloads.some((n) => n.startsWith('kynoa-backup-')));
  const backup = JSON.parse(await new Promise((resolve) => { const r = new window.FileReader(); r.onload = () => resolve(r.result); r.readAsText(state.blobs[state.blobs.length - 1]); }));
  check('backup contém dados e não contém chat', backup.kynoaBackup && backup.data.tasks.length === 2 && !('chat' in backup.data));
  check('importação reconhece backup e modelo', K.settings.normalizeImport(backup).kind === 'backup' && K.settings.normalizeImport({ kynoaTemplate: true, categories: [] }).kind === 'template' && K.settings.normalizeImport({ x: 1 }).kind === 'invalid');
  type(window, doc.getElementById('anonymousMode'), 'x');
  doc.getElementById('anonymousMode').checked = true;
  fire(window, doc.getElementById('anonymousMode'), 'change');
  check('modo anônimo muda o autor', K.community.authorLabel() === 'Anônimo');

  K.store.flush();
  const saved = JSON.parse(window.localStorage.getItem('kynoaSystem'));
  check('estado persistido no navegador', saved.version === 2 && saved.tasks.length === 2);

  /* 11. Persistência e restauração */
  console.log('\nPersistência');
  const seed = saved;
  window.close();
  app = await boot(base, { seed });
  ({ window, document: doc, K, state } = app);
  check('dados restaurados após recarregar', K.store.state.tasks.length === 2 && K.store.state.categories.length === 1);
  check('formulários refletem o estado salvo', doc.getElementById('organizationStyle').value === 'visual' && doc.getElementById('soundVolume').value === '30');
  check('tema salvo é reaplicado', doc.documentElement.dataset.theme === 'dark');
  window.close();

  /* 12. Migração de dados da versão 1 */
  console.log('\nMigração');
  const legacy = {
    categories: [{ id: 1700000000001, name: 'Casa', color: '#10b981', icon: '🏠', priority: 'high', taskCount: 3 }],
    tasks: [{ id: 1700000000002, title: 'Lavar louça', category: '1700000000001', when: 'today', energy: 'low', completed: false, createdAt: '2026-01-01T10:00:00.000Z' }],
    environment: { theme: 'sepia', primaryColor: '#4f46e5', backgroundColor: '#f8fafc', sansSerif: true },
    settings: { dataStorage: 'none' },
    currentMicroSteps: [{ id: 5, text: 'Passo antigo' }]
  };
  app = await boot(base, { seed: legacy });
  ({ window, document: doc, K, state } = app);
  const migrated = K.store.state;
  check('ids numéricos viram texto e mantêm vínculos', typeof migrated.categories[0].id === 'string' && migrated.tasks[0].category === migrated.categories[0].id);
  check('ícone emoji vira ícone vetorial', migrated.categories[0].icon === 'home');
  check('fundo padrão antigo vira tema', migrated.environment.backgroundColor === null && doc.documentElement.dataset.theme === 'sepia');
  check('passos antigos vão para o rascunho', migrated.draft.steps.length === 1 && migrated.draft.steps[0].text === 'Passo antigo');
  check('lista exibe a categoria migrada', doc.getElementById('categoriesList').textContent.includes('Casa'));
  check('migração sem erros', state.errors.length === 0, state.errors.join(' | '));
  window.close();

  server.close();
  console.log('\n' + passed + ' verificações aprovadas, ' + failures.length + ' falhas.');
  if (failures.length) {
    console.log('Falhas: ' + failures.join('; '));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
