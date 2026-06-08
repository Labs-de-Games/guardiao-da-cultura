"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";

import {
  selectInventoryCollectibles,
  useGameUIStore,
} from "@/ui/state/game-ui-store";

interface InventoryCardProps {
  isActive: boolean;
  onToggle: () => void;
}

export function InventoryCard({ isActive, onToggle }: InventoryCardProps) {
  const collectedCount = useGameUIStore(
    (s) =>
      selectInventoryCollectibles(s).filter((item) => item.collected).length,
  );

  return (
    <Card
      onClick={onToggle}
      sx={{
        bgcolor: "#161717",
        borderRadius: isActive ? "0 16px 16px 0" : "16px",
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
        "&:hover": {
          bgcolor: "#1e1f1f",
        },
      }}
    >
      <CardContent sx={{ "&:last-child": { pb: 2 }, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <Box
            component="img"
            src="/assets/ui/backpack.png"
            alt="Mochila"
            sx={{
              width: 48,
              height: 48,
              borderRadius: "8px",
              objectFit: "cover",
            }}
          />

          <Box
            sx={{
              position: "relative",
              bgcolor: "rgba(217, 173, 86, 0.18)",
              borderRadius: "12px",
              px: 1.5,
              py: 0.25,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                color: "#f4eede",
                fontWeight: 600,
                fontSize: "13px",
                lineHeight: 1.2,
                textAlign: "center",
              }}
            >
              Itens Coletados
            </Typography>
            {collectedCount > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: -12,
                  right: -12,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: "rgba(33,150,243)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#f4eede",
                    fontWeight: 600,
                    fontSize: "12px",
                    lineHeight: 1,
                  }}
                >
                  {collectedCount}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
