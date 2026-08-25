"use client";

import { Box, Paper } from "@mui/material";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { UI_LAYERS } from "@/ui/theme/tokens";

import { AudioSubpanel } from "./AudioSubpanel";
import { ControlsSubpanel } from "./ControlsSubpanel";
import { HintCard } from "./HintCard";
import { ObjectiveList } from "./ObjectiveList";
import { PhaseInfoCard } from "./PhaseInfoCard";

const SIDEBAR_WIDTH = 217;

export function Sidebar() {
  const sidebarOpen = useGameUIStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        right: 0,
        height: "100%",
        zIndex: UI_LAYERS.SIDE_PANEL,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        pointerEvents: "auto",
      }}
    >
      <Paper
        square
        sx={{
          width: SIDEBAR_WIDTH,
          height: "100%",
          bgcolor: LayoutConfig.COLORS.PANEL_BG_CSS,
          borderRadius: 0,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            px: 1.5,
            py: 1,
            flex: 1,
            overflowY: "auto",
          }}
        >
          <HintCard />
          <ObjectiveList />
          <ControlsSubpanel />
          <AudioSubpanel />
          <PhaseInfoCard sx={{ mt: "auto" }} />
        </Box>
      </Paper>
    </Box>
  );
}
