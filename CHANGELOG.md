# Changelog

Todas as mudanças relevantes do projeto são registradas aqui, seguindo o formato Keep a Changelog e o versionamento semântico.

## [2.0.0] - 2026-10-24

### Adicionado
- Estrutura em módulos com CSS, JavaScript, JSON, SVG e workflows YAML.
- Sons ambiente reais sintetizados com Web Audio API: chuva, floresta, café, ondas, ruído branco e ruído marrom, com mistura e volume em tempo real.
- Sinos sonoros ao fim do foco e da pausa, notificações do navegador e tempo restante no título da aba.
- Cronômetro por horário final, anel de progresso, pausa personalizada e política de pausas.
- Registro de sessões de foco, estatísticas do dia e gráfico dos últimos sete dias.
- Painel inicial com números do dia e sugestão de tarefas por nível de energia.
- Ambientes salvos, modo foco com barra flutuante e novos ajustes sensoriais.
- Prioridade, projeto, busca, ordenação e agrupamento nas tarefas, com opção de desfazer a exclusão.
- Sugestão de micro-etapas por tipo de tarefa, reordenação, progresso e vínculo com tarefas.
- Salas de conversa locais sincronizadas entre abas.
- Artigos de leitura, modelo de categorias importável e guia de micro-etapas para download.
- Importação com mesclagem ou substituição, instalação como aplicativo e uso offline.
- Testes automatizados de fluxo completo e integração contínua.

### Corrigido
- Cores personalizadas agora são realmente aplicadas e o contraste é calculado.
- Edição de categorias e tarefas preserva identidade, data e estado de conclusão.
- Textos digitados deixam de ser inseridos como HTML.
- Formulários passam a refletir os dados salvos após recarregar a página.
- Contagem de tarefas por categoria é calculada em tempo real.
- Rótulos de dificuldade das micro-etapas exibidos em português.

### Alterado
- Emojis da interface substituídos por ícones vetoriais.
- Substituição de alert, confirm e prompt por diálogos acessíveis.
- Dados da versão 1 são migrados automaticamente.
