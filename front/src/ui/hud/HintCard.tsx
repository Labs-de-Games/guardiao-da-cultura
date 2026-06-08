"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";
import { useShallow } from "zustand/react/shallow";

import {
  selectHintCollectibles,
  useGameUIStore,
} from "@/ui/state/game-ui-store";

interface HintCardProps {
  isActive: boolean;
  onToggle: () => void;
}

export function HintCard({ isActive, onToggle }: HintCardProps) {
  const hintCollectibles = useGameUIStore(
    useShallow((s) => selectHintCollectibles(s)),
  );
  const hintCollectiblesCount = hintCollectibles.length;
  const collectedHintCount = hintCollectibles.filter((i) => i.collected).length;

  if (hintCollectiblesCount === 0) return null;

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
            src="/assets/ui/vandal.png"
            alt="Vândalo"
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
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
              Dica do Vândalo
            </Typography>
            {collectedHintCount > 0 && (
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
                  {collectedHintCount}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
