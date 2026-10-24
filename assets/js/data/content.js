/**
 * Conteúdo estático da plataforma: artigos da aba Recursos, modelos de categorias
 * e o guia de micro-etapas. Mantido separado da lógica para facilitar a revisão e a tradução.
 */
(function (global) {
  'use strict';

  const K = global.Kynoa;

  const SUPPORT_NOTE =
    'Este material é informativo e não substitui avaliação ou acompanhamento de profissionais de saúde. Use o que fizer sentido para você e adapte ou ignore o restante.';

  const resources = {
    neurodiversity: {
      title: 'Para entender neurodiversidade',
      intro: 'Uma introdução curta e prática, escrita para ser lida no seu ritmo.',
      sections: [
        {
          heading: 'O que é neurodiversidade',
          paragraphs: [
            'Neurodiversidade é a ideia de que as pessoas funcionam de maneiras diferentes, e que essas diferenças são uma variação natural da espécie humana. O termo foi popularizado no fim dos anos 1990, no contexto de debates liderados por pessoas autistas.',
            'Ser neurodivergente significa ter um funcionamento que se afasta do que a sociedade costuma tratar como padrão. Isso traz desafios reais, muitos deles causados por ambientes que não foram pensados para todas as pessoas, e também pontos fortes.'
          ]
        },
        {
          heading: 'TDAH, autismo e dislexia',
          items: [
            'TDAH: diferenças na regulação da atenção, da energia e da impulsividade. Muitas pessoas descrevem foco intenso em temas de interesse e dificuldade para iniciar tarefas pouco estimulantes.',
            'Autismo: diferenças na comunicação social, no processamento sensorial e na preferência por rotinas e interesses profundos. Cada pessoa autista tem um perfil próprio.',
            'Dislexia: diferença no processamento da leitura e da escrita, sem relação com inteligência. Costuma ajudar o uso de fontes legíveis, mais espaçamento e leitura em voz alta.'
          ],
          paragraphs: ['Essas descrições são gerais. Diagnósticos são feitos por profissionais de saúde, e a experiência varia muito de pessoa para pessoa.']
        },
        {
          heading: 'Diferenças de processamento',
          items: [
            'Sensorial: luz, som, textura e cheiro podem ser mais intensos ou mais fracos do que para outras pessoas.',
            'Funções executivas: planejar, começar, manter o foco e mudar de uma atividade para outra podem exigir mais esforço.',
            'Percepção de tempo: estimar quanto algo vai durar e perceber o tempo passando pode ser difícil.',
            'Memória de trabalho: guardar várias informações ao mesmo tempo é mais custoso. Anotar e deixar à vista ajuda.'
          ]
        },
        {
          heading: 'Aceitação e acomodações',
          paragraphs: [
            'Acomodações são ajustes que reduzem barreiras: instruções por escrito, pausas planejadas, ambientes mais silenciosos, prazos flexíveis e liberdade para escolher como organizar o trabalho.',
            'No Brasil, leis como a Lei Berenice Piana (12.764/2012) e a Lei Brasileira de Inclusão (13.146/2015) tratam de direitos de pessoas autistas e de pessoas com deficiência. Vale conhecer o que se aplica ao seu caso na escola, no trabalho e nos serviços de saúde.'
          ]
        }
      ],
      note: SUPPORT_NOTE
    },

    organization: {
      title: 'Estratégias de organização',
      intro: 'Ideias para testar e ajustar. Nenhuma delas é obrigatória.',
      sections: [
        {
          heading: 'Sistemas visuais',
          items: [
            'Use cores e ícones nas categorias do Kynoa para reconhecer o tipo de tarefa sem ler.',
            'Deixe à vista o que precisa ser lembrado. Itens guardados tendem a ser esquecidos.',
            'Prefira poucos elementos visuais por vez. Um quadro enxuto é mais útil do que um completo e cansativo.'
          ]
        },
        {
          heading: 'Checklists adaptados',
          items: [
            'Escreva cada item começando com um verbo concreto, como "separar", "enviar" ou "guardar".',
            'Mantenha as listas curtas. Se passar de sete itens, divida em duas.',
            'Crie listas reutilizáveis para rotinas repetidas, como sair de casa ou começar a estudar.'
          ]
        },
        {
          heading: 'Gestão de tempo flexível',
          items: [
            'Use o timer da aba Foco para tornar o tempo visível.',
            'Acrescente uma folga às estimativas. Multiplicar a previsão por uma vez e meia costuma aproximar da realidade.',
            'Agrupe tarefas pelo nível de energia que exigem, e não apenas pelo horário.'
          ]
        },
        {
          heading: 'Lidando com sobrecarga',
          items: [
            'Reduza o dia a uma a três tarefas. O restante pode esperar.',
            'Escolha o menor passo possível, como abrir o documento, e use as Micro-etapas.',
            'Faça uma pausa sensorial: menos luz, menos som, um pouco de silêncio.',
            'Se der, peça ajuda. Dividir uma tarefa com alguém também é uma estratégia válida.'
          ]
        }
      ],
      note: SUPPORT_NOTE
    },

    wellbeing: {
      title: 'Saúde e bem-estar',
      intro: 'Cuidados básicos e caminhos de apoio.',
      sections: [
        {
          heading: 'Autocuidado neurodivergente',
          items: [
            'Sono, alimentação, movimento e hidratação afetam diretamente a atenção e a regulação emocional.',
            'Defina uma rotina mínima de cuidado, pequena o bastante para ser mantida nos dias difíceis.',
            'Inclua pausas sensoriais e momentos de interesse especial. Eles recarregam a energia.'
          ]
        },
        {
          heading: 'Gerenciamento de energia',
          paragraphs: [
            'Muitas pessoas descrevem a energia como um recurso limitado que varia de dia para dia, ideia conhecida como teoria das colheres. Observar quando você rende mais ajuda a planejar.'
          ],
          items: [
            'Use o campo Energia necessária nas tarefas e o registro de energia da tela inicial.',
            'Deixe as tarefas de alta energia para os seus melhores momentos.',
            'Planeje o descanso como parte do dia, sem culpa.'
          ]
        },
        {
          heading: 'Limites',
          items: [
            'Dizer não, ou ainda não, também é uma forma de cuidado.',
            'Comunique o que você precisa de maneira direta e concreta, por exemplo: "preciso das instruções por escrito".',
            'Combine pausas e prazos realistas com quem convive e trabalha com você.'
          ]
        },
        {
          heading: 'Apoio profissional',
          paragraphs: [
            'Psicólogos, psiquiatras, terapeutas ocupacionais, fonoaudiólogos e neuropsicólogos podem ajudar na avaliação e no acompanhamento. No SUS, o primeiro contato costuma ser a Unidade Básica de Saúde, e os CAPS atendem situações de sofrimento psíquico mais intenso.',
            'Se estiver passando por um momento de crise emocional, o CVV atende gratuitamente, 24 horas por dia, pelo telefone 188. Em emergência médica, ligue para o SAMU, no 192.'
          ]
        }
      ],
      note: SUPPORT_NOTE
    }
  };

  const categoryTemplate = [
    { name: 'Estudos', description: 'Aulas, leituras e trabalhos', color: '#4f46e5', icon: 'book', priority: 'medium' },
    { name: 'Trabalho', description: 'Compromissos e entregas profissionais', color: '#0891b2', icon: 'briefcase', priority: 'high' },
    { name: 'Casa', description: 'Tarefas domésticas e organização do espaço', color: '#10b981', icon: 'home', priority: 'medium' },
    { name: 'Saúde e bem-estar', description: 'Consultas, medicamentos, descanso e movimento', color: '#ec4899', icon: 'heart', priority: 'high' },
    { name: 'Pessoal', description: 'Hobbies, família e amizades', color: '#f59e0b', icon: 'star', priority: 'low' }
  ];

  const microstepGuide = [
    '# Guia de Micro-etapas',
    '',
    'Micro-etapas são passos tão pequenos que começar deixa de ser um problema. Este guia faz parte do Kynoa.',
    '',
    '## Como quebrar uma tarefa',
    '',
    '1. Escreva o resultado final em uma frase. Exemplo: "entregar o relatório".',
    '2. Liste tudo o que precisa existir para isso acontecer, sem se preocupar com a ordem.',
    '3. Ordene a lista. Se um item ainda parecer grande, divida de novo.',
    '4. Deixe o primeiro passo ridiculamente pequeno, como abrir o arquivo ou separar o material.',
    '5. Marque o que for concluído. Cada marca é um avanço real.',
    '',
    '## Exemplo',
    '',
    'Tarefa: arrumar a mesa de estudo.',
    '',
    '1. Tirar da mesa apenas o que é lixo.',
    '2. Juntar copos e pratos e levar para a cozinha.',
    '3. Empilhar os papéis em um único lugar.',
    '4. Guardar os itens que têm lugar fixo.',
    '5. Separar o material do próximo estudo.',
    '',
    '## Dicas',
    '',
    '- Um passo pode ser apenas pensar sobre a tarefa.',
    '- Pare quando precisar. Uma pausa faz parte do processo.',
    '- Estime menos tempo por passo e use o timer de foco.',
    '- Celebre cada passo concluído, mesmo os menores.',
    '- Se travar, reduza ainda mais o passo.',
    ''
  ].join('\n');

  K.data = { resources, categoryTemplate, microstepGuide };
})(window);
