export const ProgressionEvents = {
  PROGRESSION_UPDATED: "progression-updated",
} as const;

export type ProgressionEventName =
  (typeof ProgressionEvents)[keyof typeof ProgressionEvents];
