import type { BadgeConfig } from "./badgesApi";

export const MOCK_BADGES: BadgeConfig[] = [
  {
    id: "badge_explorador",
    name: "Explorador",
    description: "Inspecionou todos os objetos.",
    stat_required: "objects_inspected",
    condition: ">=",
    goal_value: 10,
    icon_key: "badge_explorer",
  },
  {
    id: "badge_restaurador",
    name: "Restaurador",
    description: "Resolveu sem erros.",
    stat_required: "puzzles_solved_flawlessly",
    condition: ">=",
    goal_value: 1,
    icon_key: "badge_restorer",
  },
  {
    id: "badge_curador",
    name: "Curador",
    description: "Acertou 100% do quiz.",
    stat_required: "quiz_perfect_score",
    condition: "==",
    goal_value: 1,
    icon_key: "badge_curator",
  },
  {
    id: "badge_detetive",
    name: "Detetive",
    description: "Coletou pista secreta.",
    stat_required: "secret_clues_collected",
    condition: ">=",
    goal_value: 1,
    icon_key: "badge_detective",
  },
  {
    id: "badge_persistente",
    name: "Persistente",
    description: "Concluiu o quiz após uma falha anterior.",
    stat_required: "quiz_solved_after_failure",
    condition: "==",
    goal_value: 1,
    icon_key: "badge_persistent",
  },
];
