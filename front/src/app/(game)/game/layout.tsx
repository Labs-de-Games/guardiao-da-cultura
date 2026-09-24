import type { ReactNode } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { MobileBlocker } from "@/ui/mobile/MobileBlocker";

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: LayoutConfig.COLORS.MAP_BG_CSS,
      }}
    >
      {children}
      <MobileBlocker />
    </div>
  );
}
