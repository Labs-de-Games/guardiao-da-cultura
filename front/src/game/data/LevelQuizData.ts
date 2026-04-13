import type { QuizQuestion } from "../types/GameDataTypes";

/**
 * Banco de Dados de Quizzes do Nível.
 * Centraliza o conteúdo textual e as respostas corretas.
 */
export const LevelQuizData: Record<string, QuizQuestion[]> = {
  obras_famosas: [
    {
      text: "Para ancorarmos a estátua de volta à nossa realidade, me diga: em que ano a rigidez da alma humana foi cravada na pedra?",
      options: ["1832", "1850", "1901"],
      correctIndex: 0,
    },
    {
      text: "A tela estava coberta por uma névoa escura. De quem é a assinatura que luta para não ser apagada pelo Esquecimento?",
      options: ["Leonardo", "Vincent", "Picasso"],
      correctIndex: 1,
    },
    {
      text: "Antes de o mundo perder a sua luz, em que ano aquele céu estrelado foi eternizado na pintura?",
      options: ["1789", "1889", "1920"],
      correctIndex: 1,
    },
  ],
  reliquias_antigas: [
    {
      text: "Ao abrir o pesado túmulo antigo, qual foi a prova que você encontrou de que a humanidade sempre lutou contra o tempo e a morte?",
      options: ["Ouro e Tesouros", "Uma Múmia preservada", "Vazio"],
      correctIndex: 1,
    },
    {
      text: "O monarca encravado na pedra viveu eras antes do primeiro ser humano respirar. A qual período o fóssil pertence?",
      options: ["Cretáceo", "Jurássico", "Triássico"],
      correctIndex: 1,
    },
  ],
};
