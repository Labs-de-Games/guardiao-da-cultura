"use client";

import { Box, Paper } from "@mui/material";
import posthog from "posthog-js";
import { useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import {
  selectHintCollectibles,
  useGameUIStore,
} from "@/ui/state/game-ui-store";
import { UI_LAYERS } from "@/ui/theme/tokens";

import { AudioSubpanel } from "./AudioSubpanel";
import { CollectibleGrid } from "./CollectibleGrid";
import { ControlsSubpanel } from "./ControlsSubpanel";
import { HintCard } from "./HintCard";
import { ObjectiveList } from "./ObjectiveList";
import { PhaseInfoCard } from "./PhaseInfoCard";

const SIDEBAR_WIDTH = 217;
const DRAWER_WIDTH = 475;

type ActivePanel = "none" | "topCard";

function HintPanel() {
  const items = useGameUIStore(useShallow(selectHintCollectibles));
  return (
    <CollectibleGrid
      title="Pistas"
      items={items}
      emptySlotLabel="Item secreto"
    />
  );
}

export function Sidebar() {
  const sidebarOpen = useGameUIStore((s) => s.sidebarOpen);
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");

  const hintCardRef = useRef<HTMLDivElement>(null);

  const drawerTop =
    activePanel === "topCard" ? (hintCardRef.current?.offsetTop ?? 0) : 0;

  const handleToggle = () => {
    const next = activePanel === "topCard" ? "none" : "topCard";
    posthog.capture(
      next === "topCard" ? "pistas_panel_opened" : "pistas_panel_closed",
    );
    setActivePanel(next);
  };

  const drawerOpen = activePanel !== "none";

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
      {drawerOpen && (
        <Paper
          square
          sx={{
            width: DRAWER_WIDTH,
            height: "fit-content",
            minHeight: "320px",
            maxHeight: `calc(100% - ${drawerTop}px)`,
            mt: `${drawerTop}px`,
            bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
            borderRadius: "16px 0 0 16px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {activePanel === "topCard" && <HintPanel />}
        </Paper>
      )}

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
          <Box
            ref={hintCardRef}
            sx={activePanel === "topCard" ? { ml: -1.5 } : undefined}
          >
            <HintCard
              isActive={activePanel === "topCard"}
              onToggle={handleToggle}
            />
          </Box>
          <ObjectiveList />
          <ControlsSubpanel />
          <AudioSubpanel />
          <PhaseInfoCard sx={{ mt: "auto" }} />
        </Box>
      </Paper>
    </Box>
  );
}
