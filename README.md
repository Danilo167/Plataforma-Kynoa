# Kynoa

Sistema web de organização pessoal, totalmente personalizável, pensado para pessoas neurodivergentes. O Kynoa começa vazio e é construído pela própria pessoa: categorias, tarefas, micro-etapas, ritmo de foco e ambiente sensorial seguem as preferências de quem usa.

O projeto é estático, não usa framework nem etapa de build e roda diretamente no GitHub Pages. Todos os dados ficam no navegador da pessoa.

## Sumário

1. Principais funcionalidades
2. Tecnologias
3. Estrutura do projeto
4. Como executar
5. Publicação no GitHub Pages
6. Arquitetura
7. Privacidade e armazenamento
8. Acessibilidade
9. Testes
10. Limitações conhecidas e próximos passos
11. Contribuição
12. Licença

## Principais funcionalidades

**Início.** Painel com tarefas pendentes, concluídas no dia e minutos de foco. Registro de energia do dia, que sugere tarefas compatíveis com o nível escolhido.

**Personalização.** Estilo de organização (visual, textual, temporal, por projetos ou misto) e preferências de neurodiversidade. As sugestões geradas podem ser aplicadas com um clique e alteram de fato o sistema, como cores suaves, ritmo de pausas e categorias iniciais.

**Meu Sistema.** Categorias com cor, ícone, descrição e prioridade padrão, além de projetos com barra de progresso. A edição acontece no próprio formulário e a exclusão pede confirmação.

**Tarefas.** Prazo, energia necessária, tempo estimado, prioridade, categoria e projeto. Filtros, busca, ordenação e agrupamento conforme o estilo de organização. Exclusão com opção de desfazer.

**Micro-etapas.** Divisão de tarefas em passos pequenos, com sugestão automática por tipo de tarefa e por dificuldade percebida, reordenação, progresso e vínculo com uma tarefa existente.

**Foco.** Cronômetro com anel de progresso, fases de foco e pausa, política de pausa configurável (automática, manual ou perguntando), vínculo com tarefa, sino sonoro ao final de cada fase, título da aba com o tempo restante e notificação do navegador. Registro de sessões, estatísticas do dia, gráfico dos últimos sete dias e sinais de foco persistentes.

**Ambiente sensorial.** Temas claro, escuro, sépia e automático, cores personalizadas com contraste calculado, redução de animações, cores suaves, menos contraste, fonte com ou sem serifa, espaçamento ampliado e tamanho do texto. Modo foco com barra flutuante e ambientes salvos que guardam tema, ajustes e sons.

**Sons ambiente.** Chuva, floresta, café, ondas, ruído branco e ruído marrom, sintetizados no navegador com a Web Audio API. Os sons podem ser misturados e o volume muda em tempo real. Não há arquivos de áudio no projeto.

**Comunidade.** Perfil opcional com pronomes e salas de conversa. Sem servidor, as mensagens ficam no navegador e são sincronizadas entre abas abertas.

**Recursos.** Três artigos de leitura sobre neurodiversidade, organização e bem-estar, modelo de categorias importável e guia de micro-etapas para download.

**Configurações.** Visibilidade do perfil, armazenamento permanente ou apenas de sessão, notificações, modo anônimo, exportação e importação de backup (mesclar ou substituir), redefinição e instalação como aplicativo.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Marcação | HTML5 semântico |
| Estilo | CSS3 modular com variáveis, `color-mix` e temas por atributo |
| Lógica | JavaScript (ES2018+) sem dependências, organizado em módulos por namespace |
| Áudio | Web Audio API |
| Dados | JSON, `localStorage` e `sessionStorage` |
| Aplicativo | Web App Manifest e Service Worker |
| Ícones | SVG |
| Automação | GitHub Actions (YAML) |
| Testes | Node.js com jsdom |

## Estrutura do projeto

```text
Plataforma-Kynoa/
├── index.html                 Página única com todas as áreas do sistema
├── manifest.webmanifest       Metadados para instalação como aplicativo
├── sw.js                      Service Worker (uso offline)
├── assets/
│   ├── css/
│   │   ├── tokens.css         Variáveis de design e temas
│   │   ├── base.css           Reset, tipografia, foco e utilitários
│   │   ├── layout.css         Sidebar, grids e responsividade
│   │   ├── components.css     Botões, formulários, cartões, timer, chat, diálogos
│   │   ├── adjustments.css    Ajustes sensoriais controlados pela pessoa
│   │   └── print.css          Impressão
│   ├── js/
│   │   ├── core/              Utilitários, ícones, armazenamento, estado e áudio
│   │   ├── ui/                Toasts, diálogos, notificações e roteador
│   │   ├── data/              Conteúdo estático (artigos, modelos, guia)
│   │   ├── features/          Um módulo por área do sistema
│   │   └── main.js            Ponto de entrada
│   └── icons/                 Favicon e ícones do aplicativo
├── tests/
│   └── smoke.test.js          Testes de fluxo completo
├── .github/workflows/         Integração contínua e publicação
├── package.json               Apenas para os testes
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

## Como executar

O projeto não precisa de instalação. Há duas formas de abrir:

1. Abrir o arquivo `index.html` diretamente no navegador. Todas as funções de interface funcionam. O uso offline e a instalação como aplicativo só são ativados quando a página é servida por HTTP.
2. Servir a pasta com um servidor estático, por exemplo:

```bash
python3 -m http.server 8080
```

Depois acessar `http://localhost:8080`.

## Publicação no GitHub Pages

**Opção 1: publicar a partir da branch.** No repositório, abrir Settings, Pages, e em Build and deployment escolher Deploy from a branch, com a branch `main` e a pasta `/ (root)`. O arquivo `.nojekyll` já está incluído para que o GitHub não processe os arquivos com Jekyll.

**Opção 2: publicar com GitHub Actions.** Em Settings, Pages, escolher GitHub Actions como fonte. Em seguida, executar manualmente o workflow `Publicar no GitHub Pages` na aba Actions. Ele copia apenas os arquivos do site e dispensa a publicação a partir da branch.

Todos os caminhos do projeto são relativos, então o site funciona tanto em `usuario.github.io/Plataforma-Kynoa/` quanto em domínio próprio. Ao publicar uma nova versão, altere `CACHE_VERSION` em `sw.js` para que o cache offline seja renovado.

## Arquitetura

A aplicação segue uma separação simples por responsabilidade, sem bibliotecas externas.

**Estado central.** O módulo `core/store.js` guarda todo o estado em um único objeto versionado. As alterações passam por `store.commit(mutator, ...topicos)`, que persiste os dados e avisa apenas os módulos interessados. A função `migrate` valida e converte qualquer dado recebido, inclusive os salvos pela versão 1 do Kynoa e os importados de backup.

**Módulos por área.** Cada arquivo em `features/` cuida de uma aba, expõe um `init()` e registra suas ações em `Kynoa.actions`. O HTML não contém JavaScript embutido. Os botões declaram a ação em `data-action` e um único ouvinte global a despacha.

**Renderização segura.** Textos digitados pela pessoa nunca são inseridos como HTML. A função `h()` monta o DOM com `textContent`, o que elimina injeção de código em títulos, mensagens e nomes.

**Navegação por hash.** O roteador usa `#tarefas`, `#foco` e similares. Funciona no GitHub Pages sem configuração e permite compartilhar links diretos.

**Áudio sintetizado.** `core/audio.js` gera ruídos branco, rosa e marrom, filtra, modula e agenda eventos aleatórios (gotas, pássaros, talheres). Cada som é uma instância com ganho próprio, com entrada e saída suaves.

**Cronômetro por horário final.** O foco guarda o instante de término em vez de contar segundos, portanto não se atrasa quando a aba fica em segundo plano.

**Comunidade com transporte isolado.** O objeto `transport` em `features/community.js` concentra o envio e o recebimento. Hoje usa `BroadcastChannel`. Um backend futuro precisa substituir apenas essa camada.

## Privacidade e armazenamento

Nenhum dado é enviado a servidores. As informações ficam em `localStorage` por padrão, ou em `sessionStorage` quando a pessoa escolhe não salvar de forma permanente. A exportação gera um arquivo JSON, e o chat não entra no backup. A opção Redefinir apaga tudo do navegador.

## Acessibilidade

O sistema foi desenhado para que cada pessoa ajuste a interface às próprias necessidades.

1. Estrutura semântica com `nav`, `main` e seções nomeadas, link para pular ao conteúdo e foco movido ao título da área ao navegar.
2. Todos os campos possuem rótulo associado e todos os botões apenas com ícone têm nome acessível.
3. Avisos anunciados por região `aria-live` e diálogos nativos com retorno de foco.
4. Indicador de foco visível, navegação completa por teclado e tecla Esc para sair do modo foco e dos diálogos.
5. Respeito às preferências `prefers-reduced-motion`, `prefers-contrast` e `forced-colors`.
6. Cores de interface calculadas para manter o contraste, inclusive com cores personalizadas.
7. Controles de estímulo: animações, saturação, contraste, fonte, espaçamento e tamanho do texto.

## Testes

Os testes carregam a aplicação em um DOM simulado e exercitam os fluxos principais: navegação, categorias, tarefas, micro-etapas, foco, ambiente, sons, comunidade, exportação, persistência e migração de dados antigos.

```bash
npm install
npm test
```

## Limitações conhecidas e próximos passos

1. A comunidade não tem servidor. Para conversas entre pessoas em dispositivos diferentes é necessário um backend ou um serviço em tempo real, conectado pela camada `transport`.
2. Os dados não sincronizam entre dispositivos. A exportação e a importação cobrem a transferência manual.
3. As estimativas de passos das micro-etapas são sugestões por regras, sem uso de inteligência artificial.
4. Possíveis evoluções: lembretes por horário, tarefas recorrentes, modo de leitura para os artigos e tradução da interface.

## Contribuição

Veja o arquivo `CONTRIBUTING.md` para convenções de código e o fluxo de contribuição.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE`.
