export const LayoutConfig = {
  // Cores Principais
  COLORS: {
    WHITE: "#ffffff",
    BLACK: "#000000",
    PRIMARY_BROWN: "#3b2a1a",
    SECONDARY_BROWN: "#5a4634",
    BORDER_BROWN: 0x6a4b2a,
    DANGER_RED: "#ff4d4d",
    SUCCESS_GREEN: "#a8ffb0",
    GOLD: "#ffd700",
    GOLD_HEX: 0xffd700,
    STAR_YELLOW: "#ffff8bff",
    INVENTORY_BG: 0xdbc8a3,
    INVENTORY_INNER: 0xf3ead2,
    DISABLED_GREY: "#aaaaaa",
    DARK_STAR_TINT: 0x444444,
  },

  // Medidas e Espaçamentos
  UI: {
    PADDING: 16,
    PANEL_WIDTH: 360,
    INVENTORY: {
      MAX_WIDTH: 1320,
      MAX_HEIGHT: 880,
      PADDING: 34,
      SLOT_SIZE: 128,
      SLOT_GAP: 18,
    },
    TOAST: {
      WIDTH: 860,
      HEIGHT: 120,
    },
    DEPTHS: {
      ROOT: 5000,
      CONTROLS: 8500,
      TUTORIAL: 8600,
      TOAST: 8800,
      DIALOGUE: 8900,
      QUIZ: 8950,
      INVENTORY: 9000,
    },
  },
} as const;
