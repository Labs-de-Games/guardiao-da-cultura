export interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  stat_required: string;
  condition: ">=" | "<=" | "==" | "<" | ">";
  goal_value: number;
  icon_key: string;
}

// Temporary mock data until the NestJS backend is implemented
const MOCK_BADGES: BadgeConfig[] = [
  {
    id: "badge_explorador",
    name: "Explorador",
    description: "Inspecionou todos os objetos.",
    stat_required: "objects_inspected",
    condition: ">=",
    goal_value: 10, // Exemplo: 10 objetos na fase
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
    description: "Repetiu e concluiu.",
    stat_required: "level_retries_completed",
    condition: ">=",
    goal_value: 1,
    icon_key: "badge_persistent",
  },
];

/**
 * Fetches the available badges from the backend API.
 * Currently returns mocked data for frontend development.
 */
export async function fetchBadges(): Promise<BadgeConfig[]> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In the future, this will be:
  // const res = await fetch('/api/badges');
  // return res.json();

  return MOCK_BADGES;
}

/**
 * Sends a request to the backend to unlock a badge for the current user.
 */
export async function unlockBadgeOnServer(badgeId: string): Promise<boolean> {
  console.log(`[API Mock] Unlocking badge on server: ${badgeId}`);
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In the future:
  // await fetch('/api/badges/unlock', { method: 'POST', body: JSON.stringify({ badgeId }) });

  return true;
}
