import type { NpcConfig } from "./Npc";

export const NPC_CONFIGS: Record<string, NpcConfig> = {
  obras_famosas: {
    missionId: "obras_famosas",
    dialogues: {
      intro: [
        "Curador Viajante... Finalmente você chegou. Meus olhos já mal conseguem distinguir a luz.",
        "O Grande Esquecimento roubou os tons, as pinceladas... roubou a alma deste salão.",
        "Mas o seu mapa ainda brilha. Há esperança.",
        "Preciso que você encontre a Pintura Famosa e a nossa Estátua mais antiga. Leia seus fragmentos de história.",
        "Se você conseguir se lembrar dos detalhes delas, poderemos trazer as cores de volta a esta ala.",
        "Vá, antes que a tela fique em branco para sempre.",
      ],
      collecting: [
        "O cinza ainda domina este salão, Curador.",
        "Encontre a Estátua e a Pintura Famosa. Observe os anos, os criadores... Cada detalhe é uma faísca de cor.",
      ],
      ready: [
        "Sinto uma vibração no ar... Você tocou as obras antigas, não tocou?",
        "As memórias estão frescas em sua mente.",
        "Chegou a hora. Mostre-me o que aprendeu. Se suas memórias forem precisas, quebraremos o Esquecimento!",
        "Vamos invocar as cores?",
      ],
      completed: [
        "Olhe! O azul, o amarelo... As cores estão voltando! A memória de Vincent vive novamente!",
        "Obrigado, Curador Viajante. Esta ala do museu nunca mais será esquecida.",
      ],
      success: [
        `Incrível! Você demonstrou grande conhecimento!`,
        "E conseguiu trazer um pouco de cor de volta para este salão!",
        "Pegue essa estrela dourada como recompensa!",
        "Você precisará delas ao longo da sua jornada!",
        "Esse é um grande passo para restaurar a luz do mundo!",
      ],
      failure: [
        "Hmm...",
        "Talvez precise observar as obras com mais atenção...",
        "Tente ler as informações novamente!",
      ],
    },
  },
  reliquias_antigas: {
    missionId: "reliquias_antigas",
    dialogues: {
      intro: [
        "Passos? Há tanto tempo não ouço passos neste corredor de poeira e sombras.",
        "Sou o Guardião das Eras. As fundações do mundo estão se desfazendo com o Esquecimento.",
        "Se perdermos nosso passado mais profundo, não teremos chão para o futuro.",
        "Busque as relíquias primordiais nas sombras: o Sarcófago dos reis antigos e o Fóssil cravado na pedra.",
        "Traga-me o conhecimento deles, Curador.",
      ],
      collecting: [
        "As areias do tempo estão escorrendo, e a névoa do Esquecimento continua espessa.",
        "Você ainda não desvendou os segredos do Sarcófago e do Fóssil. Continue buscando.",
      ],
      ready: [
        "A poeira ao seu redor parece brilhar... Você encontrou as fundações do passado!",
        "Agora, devemos ancorar essa realidade. Prove que você detém a verdadeira memória das relíquias.",
        "Prepare-se, Curador. O tempo nos julgará agora.",
      ],
      completed: [
        "As linhas do tempo estão restauradas! O passado profundo respira mais uma vez.",
        "Sua jornada é nobre, Curador. Leve essa luz para os próximos salões.",
      ],
      success: [
        "Parabéns! Agora você entende as relíquias antigas!",
        "O salão está mais iluminado.",
        "Pegue essa estrela dourada, ela trará luz ao seu caminho.",
        "Você precisará delas para avançar em sua jornada!",
      ],
      failure: [
        "Hmm... Não estamos tão certos sobre as relíquias.",
        "Acho que você precisa dar outra olhada.",
        "Preste bem atenção nos detalhes!",
      ],
    },
  },
};

export const SYSTEM_DIALOGUES = {
  SCULPTURE: {
    SUCCESS: [
      "Excelente! A escultura foi posicionada corretamente.",
      "A exposição está ficando cada vez mais bonita!",
    ],
    ERROR: [
      "Ops! Esta escultura não parece pertencer a este local.",
      "Procure o local correto para a exposição.",
    ],
  },
  PAINTING: {
    SUCCESS: [
      "Excelente! A pintura foi posicionada corretamente.",
      "A exposição está ficando cada vez mais bonita!",
    ],
    ERROR: [
      "Ops! Esta pintura não parece pertencer a este local.",
      "Procure o local correto para a exposição.",
    ],
  },
};

export const QUIZ_DIALOGUES = {
  CONFIRMATION: "Você está preparado para ser testado?",
  CANCELLED: "Volte quando estiver pronto.",
} as const;
