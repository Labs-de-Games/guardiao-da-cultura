"use client";

import { useDraggable } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import { useRef, useState } from "react";
import type { InvestigationClue } from "@/game/types/InvestigationTypes";
import { holderOf, useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { ClueHearts } from "./ClueHearts";
import { ClueTooltip } from "./ClueTooltip";
import { CLUE_DRAG_PREFIX, clueImageSrc } from "./investigation-dnd";
import { RAIL_WIDTH } from "./investigation-layout";

const { colors, fonts, radius } = GAME_UI_TOKENS;

function ClueChip({ clue, index }: { clue: InvestigationClue; index: number }) {
  const setHoveredClue = useGameUIStore((s) => s.setHoveredClue);
  const hoveredClueKey = useGameUIStore((s) => s.investigation.hoveredClueKey);
  const hearts = useGameUIStore(
    (s) => s.investigation.clueHearts[clue.key] ?? 0,
  );
  const holderName = useGameUIStore((s) => {
    const holder = holderOf(s.investigation.boards, clue.key);
    if (!holder) return null;
    return (
      s.investigation.payload?.suspects.find((x) => x.id === holder)?.name ??
      null
    );
  });

  const rowRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  // The walkthrough asks for one drop and then holds the board still, so no
  // second clue can be picked up while its remaining steps play out.
  const frozen = useGameUIStore(
    (s) =>
      s.investigation.tutorial.active && s.investigation.tutorial.demoPlaced,
  );

  const spent = hearts <= 0;
  // A clue on the board is out of the rail's hands: to take it somewhere else
  // the player has to pull it off that seat first, which keeps a move a
  // decision rather than something a stray drag can undo.
  const held = holderName !== null;
  const grabbable = !spent && !frozen && !held;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${CLUE_DRAG_PREFIX}${clue.key}`,
    disabled: !grabbable,
  });

  const hovered = hoveredClueKey === clue.key;

  const show = () => {
    setAnchor(rowRef.current?.getBoundingClientRect() ?? null);
    setHoveredClue(clue.key);
  };
  const hide = () => {
    setAnchor(null);
    setHoveredClue(null);
  };

  return (
    <Box
      ref={rowRef}
      data-tutorial="clue-chip"
      data-clue-key={clue.key}
      sx={{ mb: 0.5 }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <Box
        ref={grabbable ? setNodeRef : undefined}
        {...(grabbable ? listeners : {})}
        {...(grabbable ? attributes : {})}
        aria-label={
          spent
            ? `${clue.title}. Sem usos restantes, fixada em ${holderName ?? "um suspeito"}.`
            : held
              ? `${clue.title}. Em uso com ${holderName}. Remova-a do espaço para levá-la a outro suspeito.`
              : `${clue.title}. ${hearts} usos restantes. Arraste para um espaço do suspeito.`
        }
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.75,
          width: "100%",
          p: 1.25,
          cursor: grabbable ? "grab" : "not-allowed",
          userSelect: "none",
          touchAction: "none",
          bgcolor: hovered ? colors.bgTertiary : "transparent",
          border: `2px solid ${hovered ? colors.accentGold : "transparent"}`,
          borderRadius: `${radius.small}px`,
          // A held clue is dimmed but not greyed like a spent one: it is still
          // in play, just not here.
          opacity: isDragging ? 0.3 : spent ? 0.5 : held ? 0.65 : 1,
        }}
      >
        <Box
          data-clue-thumb={clue.key}
          sx={{
            position: "relative",
            width: 68,
            height: 68,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: colors.bgPrimary,
            border: `1px solid ${colors.accentGoldMuted}`,
            borderRadius: "4px",
          }}
        >
          <Box
            component="img"
            src={clueImageSrc(clue)}
            alt=""
            aria-hidden="true"
            draggable={false}
            sx={{
              width: 48,
              height: 48,
              objectFit: "contain",
              imageRendering: "pixelated",
              filter: spent ? "grayscale(1)" : "none",
            }}
          />
          {spent && (
            <Box
              aria-hidden="true"
              sx={{
                position: "absolute",
                bottom: -3,
                right: -3,
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              🔒
            </Box>
          )}
        </Box>

        <Box sx={{ minWidth: 0, textAlign: "left", flex: 1 }}>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: "1.15rem",
              color: colors.accentGold,
              lineHeight: 1.1,
              letterSpacing: "0.04em",
            }}
          >
            PISTA {String(index + 1).padStart(2, "0")}
          </Typography>
          <Typography
            sx={{
              fontSize: "1rem",
              color: colors.textPrimary,
              lineHeight: 1.25,
            }}
          >
            {clue.title}
          </Typography>
          <Box sx={{ mt: 0.4 }}>
            <ClueHearts hearts={hearts} />
            {holderName && (
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  color: spent ? "#c96a6a" : colors.textSecondary,
                  lineHeight: 1.2,
                  mt: 0.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {spent ? "fixada em" : "com"} {holderName.split(" ")[0]}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {hovered && anchor && !isDragging && (
        <ClueTooltip clue={clue} hearts={hearts} anchor={anchor} />
      )}
    </Box>
  );
}

/**
 * The always-visible evidence rail.
 *
 * Every clue stays listed here for the whole run, whether it is loose, sitting
 * on a suspect, or out of hearts and stuck there.
 */
export function ClueRail() {
  const payload = useGameUIStore((s) => s.investigation.payload);
  const clues = payload?.clues ?? [];
  const curatorCount = clues.filter((c) => c.source === "curator").length;

  return (
    <Box
      component="aside"
      aria-label="Pistas coletadas"
      data-tutorial="clue-rail"
      sx={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(17, 15, 19, 0.93)",
        borderRight: `2px solid ${colors.accentGoldMuted}`,
        boxShadow: "6px 0 18px rgba(0, 0, 0, 0.55)",
        p: { xs: 1.5, md: 2 },
      }}
    >
      <Typography
        sx={{
          fontFamily: fonts.display,
          fontSize: { xs: "1.5rem", md: "1.9rem" },
          color: colors.textPrimary,
          lineHeight: 1.05,
          letterSpacing: "0.04em",
          mb: 1,
        }}
      >
        PISTAS
        <br />
        COLETADAS
      </Typography>
      <Typography
        sx={{
          fontSize: "0.82rem",
          color: colors.textSecondary,
          lineHeight: 1.4,
          mb: 1.5,
        }}
      >
        Cada pista tem três usos. Soltá-la sobre um suspeito gasta um — e o
        último a prende ali para sempre.
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
        {clues.length === 0 ? (
          <Typography sx={{ fontSize: "0.95rem", color: colors.textSecondary }}>
            Nenhuma pista disponível.
          </Typography>
        ) : (
          clues.map((clue, i) => (
            <ClueChip key={clue.key} clue={clue} index={i} />
          ))
        )}
      </Box>

      {curatorCount > 0 && (
        <Typography
          sx={{
            mt: 1.5,
            fontSize: "0.85rem",
            color: colors.accentGold,
            borderTop: `1px solid ${colors.bgTertiary}`,
            pt: 1.5,
            lineHeight: 1.4,
          }}
        >
          {curatorCount === 1
            ? "Uma das pistas veio dos arquivos da curadora."
            : `${curatorCount} pistas vieram dos arquivos da curadora.`}
        </Typography>
      )}
    </Box>
  );
}
