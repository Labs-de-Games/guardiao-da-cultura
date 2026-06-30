"use client";

import { Box } from "@mui/material";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import type { CollectibleEntry } from "@/ui/state/game-ui-store";

const SLOT_COUNT = 5;

interface CollectibleGridProps {
  title: string;
  items: CollectibleEntry[];
  emptySlotLabel?: string;
}

export function CollectibleGrid({
  title,
  items,
  emptySlotLabel = "???",
}: CollectibleGridProps) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => items[i] ?? null);

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
        }}
      >
        <Box
          component="span"
          sx={{
            color: "#af7e2f",
            fontSize: "24px",
            fontWeight: 700,
          }}
        >
          {title}
        </Box>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
        }}
      >
        {slots.map((slot, i) => (
          <Box
            key={slot?.id ?? `empty-${i}`}
            sx={{
              bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
              borderRadius: "12px",
              p: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {slot === null ? (
              <>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    bgcolor: "rgb(74, 74, 74)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      color: "#161717",
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    ?
                  </Box>
                </Box>
                <Box
                  sx={{
                    bgcolor: "rgba(217, 173, 86, 0.18)",
                    borderRadius: "8px",
                    px: 0.75,
                    py: 0.25,
                    textAlign: "center",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      color: "#666",
                      fontSize: "10px",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      display: "block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {emptySlotLabel}
                  </Box>
                </Box>
              </>
            ) : (
              <>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: slot.collected ? "8px" : "50%",
                    bgcolor: slot.collected
                      ? "transparent"
                      : "rgba(74, 74, 74)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {slot.collected ? (
                    <Box
                      component="img"
                      src={`/assets/collectibles/${slot.id}.png`}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Box
                      component="span"
                      sx={{
                        color: "#161717",
                        fontSize: "18px",
                        fontWeight: 600,
                      }}
                    >
                      ?
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    bgcolor: slot.collected
                      ? "rgba(33,150,243,0.2)"
                      : "rgba(217, 173, 86, 0.18)",
                    borderRadius: "8px",
                    px: 0.75,
                    py: 0.25,
                    textAlign: "center",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      color: slot.collected
                        ? LayoutConfig.COLORS.WHITE
                        : LayoutConfig.COLORS.TEXT_DIM,
                      fontSize: "10px",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      display: "block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {slot.collected ? slot.name : emptySlotLabel}
                  </Box>
                </Box>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
