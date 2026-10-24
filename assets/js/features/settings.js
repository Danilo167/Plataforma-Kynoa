/**
 * Configurações: privacidade, armazenamento, notificações, exportação, importação,
 * redefinição e instalação como aplicativo (PWA).
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;
  const U = K.utils;
  const $ = U.$;
  const store = K.store;

  const ARRAY_KEYS = ['categories', 'projects', 'tasks', 'microSteps', 'focusSessions', 'focusSignals', 'presets'];
  const KNOWN_KEYS = ARRAY_KEYS.concat(['environment', 'personalization', 'focus', 'user', 'settings']);
  let installEvent = null;

  function hydrate() {
    const s = store.state.settings;
    $('#profileVisibility').value = s.profileVisibility;
    $('#dataStorage').value = s.dataStorage;
    $('#allowNotifications').checked = s.allowNotifications;
    $('#anonymousMode').checked = s.anonymousMode;
    $('#interfaceSounds').checked = s.interfaceSounds;
  }

  function update(partial) {
    store.commit((s) => Object.assign(s.settings, partial), 'settings');
  }

  /** Identifica o que há em um arquivo importado: modelo de categorias, backup ou inválido. */
  function normalizeImport(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { kind: 'invalid' };
    if (obj.kynoaTemplate && Array.isArray(obj.categories)) return { kind: 'template', data: obj };
    const data = obj.data && typeof obj.data === 'object' ? obj.data : obj;
    return KNOWN_KEYS.some((key) => key in data) ? { kind: 'backup', data } : { kind: 'invalid' };
  }

  function mergeImport(data) {
    const incoming = K.migrate(data);
    store.commit((s) => {
      ARRAY_KEYS.forEach((key) => {
        if (!Array.isArray(data[key])) return;
        const map = new Map(s[key].map((item) => [item.id, item]));
        incoming[key].forEach((item) => map.set(item.id, item));
        s[key] = Array.from(map.values());
      });
    }, 'all');
  }

  async function runImport(obj) {
    const result = normalizeImport(obj);
    if (result.kind === 'invalid') {
      K.toast.error('Arquivo não reconhecido. Use um backup ou modelo exportado pelo Kynoa.');
      return;
    }
    if (result.kind === 'template') {
      const missing = result.data.categories.filter((c) => c && c.name && !store.state.categories.some((x) => x.name.toLowerCase() === String(c.name).toLowerCase()));
      store.commit((s) => {
        K.migrate({ categories: missing }).categories.forEach((c) => s.categories.push(c));
      }, 'categories');
      K.toast.success(missing.length + ' ' + U.plural(missing.length, 'categoria importada', 'categorias importadas') + '.');
      return;
    }

    const choice = await K.dialog.choice({
      title: 'Importar dados',
      message: 'Como deseja importar este backup? Mesclar mantém o que você já tem e adiciona o que vier do arquivo. Substituir troca tudo pelo conteúdo do arquivo.',
      choices: [
        { label: 'Cancelar', value: null, variant: 'btn-ghost' },
        { label: 'Mesclar', value: 'merge', variant: 'btn-secondary' },
        { label: 'Substituir', value: 'replace', variant: 'btn-danger' }
      ]
    });
    if (!choice) return;

    if (choice === 'merge') mergeImport(result.data);
    else store.replace(Object.assign({}, result.data, { chat: store.state.chat }));
    K.toast.success('Dados importados com sucesso.');
  }

  function init() {
    hydrate();
    store.on(['settings', 'all'], hydrate);
    $('#appVersion').textContent = 'Versão ' + K.meta.version;

    $('#profileVisibility').addEventListener('change', (e) => update({ profileVisibility: e.target.value }));
    $('#anonymousMode').addEventListener('change', (e) => update({ anonymousMode: e.target.checked }));
    $('#interfaceSounds').addEventListener('change', (e) => {
      update({ interfaceSounds: e.target.checked });
      if (e.target.checked) K.audio.feedback('add');
    });

    $('#allowNotifications').addEventListener('change', async (e) => {
      const box = e.target;
      if (!box.checked) return update({ allowNotifications: false });
      if (!('Notification' in global)) {
        box.checked = false;
        K.toast.warning('Este navegador não oferece suporte a notificações.');
        return;
      }
      let permission = global.Notification.permission;
      if (permission === 'default') permission = await global.Notification.requestPermission();
      if (permission === 'granted') {
        update({ allowNotifications: true });
        K.toast.success('Notificações ativadas. Elas aparecem quando a aba estiver em segundo plano.');
      } else {
        box.checked = false;
        update({ allowNotifications: false });
        K.toast.warning('A permissão foi negada. Você pode liberá-la nas configurações do navegador.');
      }
    });

    $('#dataStorage').addEventListener('change', async (e) => {
      const mode = e.target.value;
      const from = store.state.settings.dataStorage;
      if (mode === from) return;
      const ok = await K.dialog.confirm({
        title: mode === 'session' ? 'Manter dados só nesta sessão' : 'Salvar dados no navegador',
        message: mode === 'session'
          ? 'Seus dados deixarão de ser guardados de forma permanente e a cópia salva no navegador será removida. Ao fechar a aba, eles se perdem. Faça uma exportação antes, se quiser guardá-los.'
          : 'Seus dados passarão a ser guardados no navegador e continuarão disponíveis quando você voltar.',
        confirmLabel: 'Confirmar'
      });
      if (!ok) {
        e.target.value = from;
        return;
      }
      store.state.settings.dataStorage = mode;
      K.storage.move(from, mode, store.state);
      store.emit('settings');
      K.toast.success(mode === 'session' ? 'Dados mantidos apenas nesta sessão.' : 'Dados salvos no navegador.');
    });

    $('#importFile').addEventListener('change', () => {
      $('#import-button').disabled = !$('#importFile').files.length;
    });

    K.actions['export-data'] = () => {
      const data = JSON.parse(JSON.stringify(store.state));
      delete data.chat;
      const payload = { kynoaBackup: true, appVersion: K.meta.version, exportedAt: new Date().toISOString(), data };
      U.downloadFile('kynoa-backup-' + U.dayKey() + '.json', JSON.stringify(payload, null, 2), 'application/json');
      K.toast.success('Dados exportados com sucesso.');
    };

    K.actions['import-data'] = () => {
      const file = $('#importFile').files[0];
      if (!file) {
        K.toast.warning('Escolha um arquivo .json para importar.');
        return;
      }
      const reader = new global.FileReader();
      reader.onload = () => {
        try {
          runImport(JSON.parse(String(reader.result)));
        } catch (error) {
          K.toast.error('Não foi possível ler o arquivo. Verifique se é um JSON válido.');
        }
        $('#importFile').value = '';
        $('#import-button').disabled = true;
      };
      reader.onerror = () => K.toast.error('Não foi possível ler o arquivo.');
      reader.readAsText(file);
    };

    K.actions['reset-system'] = async () => {
      const ok = await K.dialog.confirm({
        title: 'Redefinir sistema',
        message: 'Todos os seus dados serão apagados deste navegador: categorias, tarefas, micro-etapas, projetos, histórico de foco e ajustes. Essa ação não pode ser desfeita.',
        confirmLabel: 'Redefinir tudo',
        danger: true
      });
      if (!ok) return;
      K.audio.stopAll();
      K.focus.stop({ silent: true });
      store.reset();
      K.toast.success('Sistema redefinido.');
    };

    global.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installEvent = event;
      $('#installGroup').hidden = false;
    });
    global.addEventListener('appinstalled', () => {
      installEvent = null;
      $('#installGroup').hidden = true;
      K.toast.success('Kynoa instalado.');
    });
    K.actions['install-app'] = async () => {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice;
      installEvent = null;
      $('#installGroup').hidden = true;
    };
  }

  K.settings = { init, normalizeImport, runImport };
})(window);
