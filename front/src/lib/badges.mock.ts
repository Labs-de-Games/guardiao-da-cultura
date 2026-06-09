import type { BadgeConfig } from "./badgesApi";

export const MOCK_BADGES: BadgeConfig[] = [
  {
    id: "badge_explorador",
    name: "Exploração",
    description: "Achou todos os objetos.",
    stat_required: "objects_inspected",
    condition: ">=",
    goal_value: 10,
    icon_key: "badge_explorer",
  },
  {
    id: "badge_restaurador",
    name: "Restauração",
    description: "Pôs tudo no lugar sem errar.",
    stat_required: "puzzles_solved_flawlessly",
    condition: ">=",
    goal_value: 1,
    icon_key: "badge_restorer",
  },
  {
    id: "badge_curador",
    name: "Curadoria",
    description: "Acertou todas as perguntas do teste.",
    stat_required: "quiz_perfect_score",
    condition: "==",
    goal_value: 1,
    icon_key: "badge_curator",
  },
  {
    id: "badge_detetive",
    name: "Detetive",
    description: "Achou uma pista.",
    stat_required: "secret_clues_collected",
    condition: ">=",
    goal_value: 1,
    icon_key: "badge_detective",
  },
  {
    id: "badge_persistente",
    name: "Persistência",
    description: "Passou no teste depois de errar uma vez.",
    stat_required: "quiz_solved_after_failure",
    condition: "==",
    goal_value: 1,
    icon_key: "badge_persistent",
  },
];
