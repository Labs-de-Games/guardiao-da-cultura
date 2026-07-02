"use client";

import {
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  Typography,
} from "@mui/material";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { useGameUIStore } from "@/ui/state/game-ui-store";

function CustomCheckbox({ checked }: { checked: boolean }) {
  return (
    <Box
      sx={{
        width: 14,
        height: 14,
        borderRadius: "2px",
        border: checked ? "none" : "2px solid #555",
        bgcolor: checked ? "#e5c158" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        mt: "2px",
        transition: "all 0.15s",
      }}
    >
      {checked && (
        <Typography
          sx={{
            color: "#1c1d1d",
            fontSize: "10px",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ✓
        </Typography>
      )}
    </Box>
  );
}

export function ObjectiveList() {
  const missions = useGameUIStore((s) => s.missions);

  if (missions.length === 0) return null;

  return (
    <Card
      sx={{
        bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
        borderRadius: "16px",
        border: "none",
      }}
    >
      <CardContent sx={{ "&:last-child": { pb: 2 }, p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: LayoutConfig.COLORS.INFO_TITLE,
            fontWeight: 700,
            fontSize: "16px",
            mb: 1.5,
            textAlign: "center",
          }}
        >
          Objetivos da fase:
        </Typography>
        {missions.map((mission) => (
          <Box key={mission.missionId} sx={{ mb: 1.5 }}>
            <List dense disablePadding>
              {mission.steps.map((step, i) => (
                <ListItem key={i} disableGutters sx={{ py: 0.25, px: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      width: "100%",
                    }}
                  >
                    <CustomCheckbox checked={step.done} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: step.done ? "#a0a0a0" : "#ffffff",
                        textDecoration: step.done ? "line-through" : "none",
                        fontSize: "13px",
                        lineHeight: 1.4,
                      }}
                    >
                      {step.done
                        ? step.text
                        : step.filled !== undefined && step.total !== undefined
                          ? `${step.filled}/${step.total} ${step.text}`
                          : step.text}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
