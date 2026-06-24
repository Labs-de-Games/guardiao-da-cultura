import { useDroppable } from "@dnd-kit/core";
import { Paper } from "@mui/material";
import type { ReactNode } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";

export function InventoryDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "inventory" });

  return (
    <Paper
      square
      ref={setNodeRef}
      sx={{
        bgcolor: "#161717",
        borderRadius: "16px",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
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
