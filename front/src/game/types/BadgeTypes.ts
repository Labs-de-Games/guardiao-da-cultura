/**
 * Supported comparison operators for badge requirements.
 */
export type BadgeCondition = ">=" | "<=" | "==" | ">" | "<";

/**
 * Configuration for a single badge achievement.
 */
export interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  stat_required: string;
  condition: BadgeCondition | string; // string for flexibility with API
  goal_value: number;
  icon_key: string;
}
