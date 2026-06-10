"use client";

import { Box, Paper } from "@mui/material";
import { useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  selectHintCollectibles,
  selectInventoryCollectibles,
  useGameUIStore,
} from "@/ui/state/game-ui-store";

import { CollectibleGrid } from "./CollectibleGrid";
import { HintCard } from "./HintCard";
import { InventoryCard } from "./InventoryCard";
import { ObjectiveList } from "./ObjectiveList";

const SIDEBAR_WIDTH = 217;
const DRAWER_WIDTH = 475;

type ActivePanel = "none" | "topCard" | "bottomCard";

function HintPanel() {
  const items = useGameUIStore(useShallow(selectHintCollectibles));
  return (
    <CollectibleGrid
      title="Dica do Vândalo"
      items={items}
      emptySlotLabel="???"
    />
  );
}

function InventoryPanel() {
  const items = useGameUIStore(useShallow(selectInventoryCollectibles));
  return (
    <CollectibleGrid
      title="Artefatos"
      items={items}
      emptySlotLabel="item secreto"
    />
  );
}

export function Sidebar() {
  const sidebarOpen = useGameUIStore((s) => s.sidebarOpen);
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");

  const hintCardRef = useRef<HTMLDivElement>(null);
  const inventoryCardRef = useRef<HTMLDivElement>(null);

  const drawerTop =
    activePanel === "topCard"
      ? (hintCardRef.current?.offsetTop ?? 0)
      : activePanel === "bottomCard"
        ? (inventoryCardRef.current?.offsetTop ?? 0)
        : 0;

  const handleToggle = (panel: "topCard" | "bottomCard") => {
    setActivePanel((prev) => (prev === panel ? "none" : panel));
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
        zIndex: 20,
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
            bgcolor: "#161717",
            borderRadius: "16px 0 0 16px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {activePanel === "topCard" && <HintPanel />}
          {activePanel === "bottomCard" && <InventoryPanel />}
        </Paper>
      )}

      <Paper
        square
        sx={{
          width: SIDEBAR_WIDTH,
          height: "100%",
          bgcolor: "#1c1d1d",
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
              onToggle={() => handleToggle("topCard")}
            />
          </Box>
          <Box
            ref={inventoryCardRef}
            sx={activePanel === "bottomCard" ? { ml: -1.5 } : undefined}
          >
            <InventoryCard
              isActive={activePanel === "bottomCard"}
              onToggle={() => handleToggle("bottomCard")}
            />
          </Box>
          <ObjectiveList />
        </Box>
      </Paper>
    </Box>
  );
}
