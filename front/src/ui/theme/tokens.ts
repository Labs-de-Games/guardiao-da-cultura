import { LayoutConfig } from "@/game/constants/LayoutConfig";

export const GAME_UI_TOKENS = {
  colors: {
    bgPrimary: "#161717",
    bgSecondary: "#1c1d1d",
    bgTertiary: "#1e1f1f",
    textPrimary: "#f4eede",
    textSecondary: "#a0a0a0",
    accentGold: "#d9ad56",
    accentGoldHover: "#e5c158",
    accentGoldMuted: "#af7e2f",
    white: "#ffffff",
    dialogueBg: LayoutConfig.COLORS.MAP_BG_CSS,
    dialogueCta: LayoutConfig.COLORS.AVAILABLE_GREEN,
  },
  fonts: {
    display: LayoutConfig.FONTS.TITLE,
    body: LayoutConfig.FONTS.BODY,
  },
  radius: {
    panel: 16,
    small: 8,
  },
} as const;
