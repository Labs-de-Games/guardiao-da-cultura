"use client";

import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { UI_LAYERS } from "@/ui/theme/tokens";
import type { BadgeConfig } from "../../lib/badgesApi";
import { useGameUIStore } from "../state/game-ui-store";

export default function BadgeGalleryPanel() {
  const badgeGalleryOpen = useGameUIStore((s) => s.badgeGalleryOpen);
  const setBadgeGalleryOpen = useGameUIStore((s) => s.setBadgeGalleryOpen);
  const badges = useGameUIStore((s) => s.badges);
  const unlockedBadgeIds = useGameUIStore((s) => s.unlockedBadgeIds);
  const badgeError = useGameUIStore((s) => s.badgeError);
  const loadBadgeData = useGameUIStore((s) => s.loadBadgeData);

  if (!badgeGalleryOpen) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        zIndex: UI_LAYERS.PANEL,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: { xs: "90vw", sm: 700, md: 1000 },
          maxHeight: { xs: "80vh", md: 650 },
          bgcolor: "#1c1d1d",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.06)",
          p: 3,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontFamily: "Jockey One",
              color: "#af7e2f",
              fontWeight: "bold",
            }}
          >
            Galeria de Conquistas
          </Typography>
          <IconButton
            onClick={() => setBadgeGalleryOpen(false)}
            aria-label="Fechar galeria"
            sx={{ color: "#f4eede", fontSize: "1.5rem" }}
          >
            X
          </IconButton>
        </Box>

        {badgeError && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              flex: 1,
              justifyContent: "center",
            }}
          >
            <Typography sx={{ color: "#ff4d4d" }}>{badgeError}</Typography>
            <IconButton
              onClick={() => void loadBadgeData()}
              sx={{ color: "#af7e2f" }}
            >
              Tentar novamente
            </IconButton>
          </Box>
        )}

        {!badgeError && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 2,
              overflowY: "auto",
              flex: 1,
              pr: 1,
            }}
          >
            {badges.map((badge) => {
              const isUnlocked = unlockedBadgeIds.includes(badge.id);
              return (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isUnlocked={isUnlocked}
                />
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function BadgeCard({
  badge,
  isUnlocked,
}: {
  badge: BadgeConfig;
  isUnlocked: boolean;
}) {
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
            {badge.name}
          </Typography>
          <Typography variant="body2">{badge.description}</Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          bgcolor: "#161717",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          cursor: "default",
          p: 1.5,
          transition: "all 0.15s",
          "&:hover": {
            bgcolor: "#1e1f1f",
          },
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: isUnlocked ? "transparent" : "rgb(74, 74, 74)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {isUnlocked ? (
            <Box
              component="img"
              src={`/assets/data/badges/${badge.icon_key}.png`}
              alt={badge.name}
              sx={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <Box
              component="span"
              sx={{
                color: "#161717",
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              ?
            </Box>
          )}
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
          <Typography
            sx={{
              fontFamily: "Inter",
              fontSize: "15px",
              fontWeight: 600,
              color: "#f4eede",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {badge.name}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: "Inter",
            fontSize: "12px",
            fontWeight: 600,
            color: isUnlocked ? "#f4eede" : "#666",
            textAlign: "center",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {badge.description}
        </Typography>
      </Paper>
    </Tooltip>
  );
}
