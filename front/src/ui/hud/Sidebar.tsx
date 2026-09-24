"use client";

import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import { Box, ButtonBase, Paper } from "@mui/material";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

import { AudioSubpanel } from "./AudioSubpanel";
import { ControlsSubpanel } from "./ControlsSubpanel";
import { HintCard } from "./HintCard";
import { ObjectiveList } from "./ObjectiveList";
import { PhaseInfoCard } from "./PhaseInfoCard";

const SIDEBAR_WIDTH = 217;
const TOGGLE_WIDTH = 24;
const TOGGLE_HEIGHT = 48;
const TOGGLE_OFFSET_TOP = 16;

export function Sidebar() {
  const sidebarOpen = useGameUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useGameUIStore((s) => s.toggleSidebar);

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
        pointerEvents: "none",
      }}
    >
      <ButtonBase
        aria-label={sidebarOpen ? "Fechar painel" : "Abrir painel"}
        aria-expanded={sidebarOpen}
        tabIndex={-1}
        // Keep focus on the game so Space/Enter don't re-trigger the toggle.
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleSidebar}
        sx={{
          mt: `${TOGGLE_OFFSET_TOP}px`,
          width: TOGGLE_WIDTH,
          height: TOGGLE_HEIGHT,
          flexShrink: 0,
          bgcolor: LayoutConfig.COLORS.PANEL_BG_CSS,
          color: GAME_UI_TOKENS.colors.textPrimary,
          borderRadius: `${GAME_UI_TOKENS.radius.small}px 0 0 ${GAME_UI_TOKENS.radius.small}px`,
          pointerEvents: "auto",
        }}
      >
        {sidebarOpen ? <ArrowRightIcon /> : <ArrowLeftIcon />}
      </ButtonBase>
      {sidebarOpen && (
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
            pointerEvents: "auto",
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
      )}
    </Box>
  );
}
