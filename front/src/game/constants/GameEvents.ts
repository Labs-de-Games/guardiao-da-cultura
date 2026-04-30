export const GameEvents = {
  // Interação
  INTERACTION_PROMPT_SHOWN: "interaction-prompt-shown",
  INTERACTION_PROMPT_HIDDEN: "interaction-prompt-hidden",

  // Diálogo e Input
  DIALOGUE_STARTED: "dialogue-started",
  DIALOGUE_ENDED: "dialogue-ended",

  // UI overlays
  INSPECT_TUTORIAL_OPENED: "inspect-tutorial-opened",
  INSPECT_TUTORIAL_CLOSED: "inspect-tutorial-closed",
  CONTROLS_OVERLAY_OPENED: "controls-overlay-opened",
  CONTROLS_OVERLAY_CLOSED: "controls-overlay-closed",
  INVENTORY_OPENED: "inventory-opened",
  INVENTORY_CLOSED: "inventory-closed",
  INSPECT_MODE_TOGGLED: "inspect-mode-toggled",

  // Requisiçōes de UI
  SHOW_DIALOGUE_REQUEST: "show-dialogue-request",
  SHOW_QUIZ_REQUEST: "show-quiz-request",
  SHOW_CONFIRMATION_REQUEST: "show-confirmation-request",

  // Missões / Quests
  MISSION_ACCEPTED: "mission-accepted",
  MISSION_PROGRESS_CHANGED: "mission-progress-changed",
  MISSION_STATUS_CHANGED: "mission-status-changed",
  INFO_COLLECTED: "info-collected",

  // Interações Genéricas (Substituindo Chunks)
  OPEN_INTERACTION_UI_REQUEST: "open-interaction-ui-request",
  INTERACTION_SUBMITTED: "interaction-submitted",

  // Badges
  SHOW_BADGE_TOAST: "show-badge-toast",
} as const;
