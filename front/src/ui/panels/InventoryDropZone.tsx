import { useDroppable } from "@dnd-kit/core";
import { Paper } from "@mui/material";
import type { ReactNode } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";

export function InventoryDropZone({
  children,
  minHeight = 360,
  centerContent = false,
}: {
  children: ReactNode;
  minHeight?: number | string;
  centerContent?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "inventory" });

  return (
    <Paper
      square
      ref={setNodeRef}
      sx={{
        bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
        borderRadius: "16px",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        justifyContent: centerContent ? "center" : "flex-start",
        gap: 1,
        height: "100%",
        minHeight,
        overflowY: "auto",
        outline: isOver
          ? `2px solid ${LayoutConfig.COLORS.INFO_TITLE}`
          : "2px solid transparent",
        transition: "outline-color 0.15s",
      }}
    >
      {children}
    </Paper>
  );
}
