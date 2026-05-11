export const GameEvents = {
  INTERACTION_PROMPT_SHOWN: "interaction-prompt-shown",
  INTERACTION_PROMPT_HIDDEN: "interaction-prompt-hidden",

  DIALOGUE_STARTED: "dialogue-started",
  DIALOGUE_ENDED: "dialogue-ended",

  CONTROLS_OVERLAY_OPENED: "controls-overlay-opened",
  CONTROLS_OVERLAY_CLOSED: "controls-overlay-closed",

  SHOW_DIALOGUE_REQUEST: "show-dialogue-request",
  SHOW_QUIZ_REQUEST: "show-quiz-request",
  SHOW_CONFIRMATION_REQUEST: "show-confirmation-request",
  SHOW_LABEL_REQUEST: "show-label-request",

  MISSION_ACCEPTED: "mission-accepted",
  MISSION_PROGRESS_CHANGED: "mission-progress-changed",
  MISSION_STATUS_CHANGED: "mission-status-changed",
  INFO_COLLECTED: "info-collected",

  OPEN_INTERACTION_UI_REQUEST: "open-interaction-ui-request",
  INTERACTION_SUBMITTED: "interaction-submitted",

  SHOW_BADGE_TOAST: "show-badge-toast",
} as const;
