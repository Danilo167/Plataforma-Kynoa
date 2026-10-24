# Guia de contribuição

Obrigado por ajudar a melhorar o Kynoa.

## Princípios

O Kynoa existe para dar controle à pessoa que o usa. Toda mudança deve preservar quatro ideias: começar do zero, permitir ajustes, não gerar pressão e respeitar a privacidade dos dados.

## Fluxo de trabalho

1. Faça um fork e crie uma branch descritiva, como `feature/lembretes` ou `fix/timer-pausa`.
2. Mantenha as mudanças pequenas e focadas.
3. Rode `npm install` e `npm test` antes de abrir o pull request.
4. Descreva o que mudou e por que no pull request, e atualize o `CHANGELOG.md`.

## Convenções de código

1. JavaScript sem dependências externas e sem build. Cada módulo fica em uma função anônima que recebe `window` e usa o namespace `Kynoa`.
2. Nunca insira texto digitado pela pessoa com `innerHTML`. Use `h()` ou `textContent`.
3. Use `store.commit` para qualquer alteração de estado, informando os tópicos afetados.
4. Registre ações da interface em `Kynoa.actions` e use `data-action` no HTML. Não use atributos `onclick`.
5. Estilos usam as variáveis de `tokens.css`. Não escreva cores fixas nos componentes.
6. Todo campo precisa de rótulo e todo botão apenas com ícone precisa de `aria-label`.
7. Textos da interface em português do Brasil, sem emojis.

## Mensagens de commit

Use o formato `tipo: resumo no imperativo`, com os tipos `feat`, `fix`, `docs`, `style`, `refactor` e `test`.
