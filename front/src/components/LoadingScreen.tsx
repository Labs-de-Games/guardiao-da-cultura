"use client";

import { useEffect, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

export default function LoadingScreen() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: LayoutConfig.COLORS.MAP_BG_CSS,
      }}
    >
      <div
        style={{
          width: 260,
          textAlign: "left",
          color: GAME_UI_TOKENS.colors.accentGold,
          fontFamily: `${LayoutConfig.FONTS.TITLE}, sans-serif`,
          fontSize: LayoutConfig.FONTS.SIZES.TITLE_LARGE,
        }}
        aria-live="polite"
        aria-busy="true"
      >
        Carregando{dots}
      </div>
    </div>
  );
}
