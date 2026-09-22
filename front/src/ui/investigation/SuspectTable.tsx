"use client";

import { Box, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { INVESTIGATION_SLOTS } from "@/game/constants/Investigation";
import type { Suspect } from "@/game/types/InvestigationTypes";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { ClueSlot } from "./ClueSlot";
import { HoverPopover } from "./HoverPopover";
import {
  CORK,
  NAMEPLATE,
  ROOM_ART,
  ROOM_ASPECT,
  ROOM_COVER_WIDTH,
  ROOM_LIFT,
} from "./investigation-layout";
import { SuspectPortrait } from "./SuspectPortrait";

const { colors, fonts, radius } = GAME_UI_TOKENS;

/**
 * Where each suspect is pinned on the corkboard, in percentages of the cork.
 *
 * Three across the top, two below, all inset from the frame. The seats size
 * themselves off the board too (see `--portrait` and friends), so a suspect
 * never drifts off the cork no matter how large the room is drawn.
 */
const SEATS = [
  { left: "17%", edge: "top" },
  { left: "50%", edge: "top" },
  { left: "83%", edge: "top" },
  { left: "32%", edge: "bottom" },
  { left: "68%", edge: "bottom" },
] as const;

/**
 * Seat metrics, all relative to the corkboard's width (`cqw`), clamped so they
 * stay legible on a small window and stop growing on a very large one.
 */
const SEAT_SCALE = {
  "--portrait": "clamp(52px, 9cqw, 128px)",
  "--slot": "clamp(64px, 5.8cqw, 82px)",
  "--seat-text": "clamp(0.62rem, 1.75cqw, 1.2rem)",
  "--seat-small": "clamp(0.52rem, 1.35cqw, 0.95rem)",
} as const;

/** The hover dossier: prose only, so the facts have to be read for. */
function SuspectInfo({
  suspect,
  anchor,
}: {
  suspect: Suspect;
  anchor: DOMRect;
}) {
  return (
    <HoverPopover anchor={anchor} placement="above" width={340}>
      <Typography
        sx={{
          fontFamily: fonts.display,
          fontSize: "1.35rem",
          color: colors.accentGold,
          lineHeight: 1.15,
        }}
      >
        {suspect.name}
        {suspect.age ? `, ${suspect.age}` : ""}
      </Typography>
      <Typography sx={{ fontSize: "0.9rem", color: colors.textSecondary }}>
        {suspect.role}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.98rem",
          color: colors.textPrimary,
          lineHeight: 1.55,
        }}
      >
        {suspect.summary}
      </Typography>
    </HoverPopover>
  );
}

function SuspectSeat({
  suspect,
  seatIndex,
}: {
  suspect: Suspect;
  seatIndex: number;
}) {
  const payload = useGameUIStore((s) => s.investigation.payload);
  const board = useGameUIStore((s) => s.investigation.boards[suspect.id]);
  const clueHearts = useGameUIStore((s) => s.investigation.clueHearts);
  const wrongSuspectIds = useGameUIStore(
    (s) => s.investigation.wrongSuspectIds,
  );
  const clearSlot = useGameUIStore((s) => s.clearSlot);
  const requestAccusation = useGameUIStore((s) => s.requestAccusation);
  const tutorialActive = useGameUIStore((s) => s.investigation.tutorial.active);
  // Once the walkthrough has its one drop, the board stops taking input until
  // the lesson ends: no second clue, no taking the first one back.
  const frozen = useGameUIStore(
    (s) =>
      s.investigation.tutorial.active && s.investigation.tutorial.demoPlaced,
  );

  const portraitRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const cleared = wrongSuspectIds.includes(suspect.id);

  const seat = SEATS[seatIndex % SEATS.length];
  const slots =
    board?.slots ?? Array.from({ length: INVESTIGATION_SLOTS }, () => null);
  // Kept lit through the walkthrough — the point of its last step is to show
  // the button coming alive — but inert until the lesson is over.
  const canAccuse = !cleared && slots.some((k) => k !== null);
  const accusable = canAccuse && !tutorialActive;

  const showInfo = () =>
    setAnchor(portraitRef.current?.getBoundingClientRect() ?? null);

  return (
    <Box
      sx={{
        position: "absolute",
        left: seat.left,
        [seat.edge]: "1%",
        transform: "translateX(-50%)",
      }}
    >
      <Box
        sx={{
          pt: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.6,
        }}
      >
        <Box
          ref={portraitRef}
          component="button"
          type="button"
          data-tutorial="suspect-portrait"
          data-suspect={suspect.id}
          onMouseEnter={showInfo}
          onMouseLeave={() => setAnchor(null)}
          onFocus={showInfo}
          onBlur={() => setAnchor(null)}
          onClick={() => (anchor ? setAnchor(null) : showInfo())}
          aria-label={
            cleared
              ? `${suspect.name}, ${suspect.role}. Já descartado.`
              : `${suspect.name}, ${suspect.role}. Ver informações.`
          }
          sx={{
            p: 0,
            bgcolor: "transparent",
            cursor: "help",
            lineHeight: 0,
            border: `3px solid ${cleared ? "#6b6767" : colors.accentGoldMuted}`,
            borderRadius: `${radius.small}px`,
            boxShadow: cleared ? "none" : "0 6px 16px rgba(0,0,0,0.55)",
            opacity: cleared ? 0.4 : 1,
            filter: cleared ? "grayscale(1) brightness(0.55)" : "none",
            transition: "border-color 120ms linear",
            "&:hover": cleared ? undefined : { borderColor: colors.accentGold },
          }}
        >
          <SuspectPortrait
            suspect={suspect}
            size="var(--portrait)"
            dimmed={cleared}
          />
        </Box>

        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: "var(--seat-text)",
            letterSpacing: "0.04em",
            color: cleared ? colors.textSecondary : colors.textPrimary,
            bgcolor: colors.bgPrimary,
            border: `1px solid ${colors.bgTertiary}`,
            borderRadius: "4px",
            px: 1,
            py: 0.2,
            whiteSpace: "nowrap",
            textDecoration: cleared ? "line-through" : "none",
          }}
        >
          {suspect.name}
        </Typography>

        <Box
          data-tutorial="suspect-slots"
          data-suspect={suspect.id}
          sx={{ display: "flex", gap: "4%" }}
        >
          {slots.map((clueKey, i) => (
            <ClueSlot
              key={`${suspect.id}-slot-${i}`}
              suspectId={suspect.id}
              index={i}
              clue={payload?.clues.find((c) => c.key === clueKey) ?? null}
              verdict={clueKey ? (board?.verdicts[clueKey] ?? null) : null}
              locked={clueKey ? (clueHearts[clueKey] ?? 0) <= 0 : false}
              disabled={cleared}
              frozen={frozen}
              onClear={() => clearSlot(suspect.id, i)}
            />
          ))}
        </Box>

        <Box
          component="button"
          type="button"
          data-tutorial="accuse-button"
          data-suspect={suspect.id}
          disabled={!canAccuse}
          aria-disabled={accusable ? undefined : true}
          onClick={() => requestAccusation(suspect.id)}
          aria-label={`Acusar ${suspect.name}`}
          sx={{
            width: "100%",
            px: 1,
            py: 0.7,
            mb: 1,
            border: "none",
            borderRadius: `${radius.small}px`,
            cursor: accusable ? "pointer" : "not-allowed",
            bgcolor: canAccuse ? "#8c3b3b" : colors.bgTertiary,
            color: canAccuse ? colors.textPrimary : colors.textSecondary,
            fontFamily: fonts.display,
            fontSize: "var(--seat-text)",
            letterSpacing: "0.05em",
            opacity: cleared ? 0.4 : 1,
            "&:hover": accusable ? { filter: "brightness(1.15)" } : undefined,
          }}
        >
          {cleared ? "DESCARTADO" : "ACUSAR"}
        </Box>
      </Box>

      {anchor && <SuspectInfo suspect={suspect} anchor={anchor} />}
    </Box>
  );
}

/**
 * The room, the board, and the five suspects pinned to it.
 *
 * The artwork is a real element rather than a `cover` background: its size is
 * known, so the corkboard overlay can be placed on it by percentage and lines up
 * exactly at any resolution. The room is widened and nudged right by the rail's
 * width so the board lands centred in the space the rail leaves, while the art
 * still reaches both screen edges.
 */
export function SuspectTable() {
  const payload = useGameUIStore((s) => s.investigation.payload);
  const suspects = payload?.suspects ?? [];

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        bgcolor: colors.bgPrimary,
        // Gives the room `100cqw` / `100cqh` to size itself against, which is
        // what lets it cover this stage in pure CSS.
        containerType: "size",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: ROOM_COVER_WIDTH,
          aspectRatio: ROOM_ASPECT,
          // Centred horizontally (the board's centre is the art's centre), then
          // lifted so the board — not the room — sits mid-stage.
          transform: `translateX(-50%) ${ROOM_LIFT}`,
          backgroundImage: `url(${ROOM_ART})`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          containerType: "inline-size",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            ...NAMEPLATE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: "clamp(0.6rem, 1.7cqw, 2rem)",
              letterSpacing: "0.03em",
              lineHeight: 1,
              whiteSpace: "nowrap",
              color: "#4a3313",
              textShadow: "0 1px 0 rgba(255, 228, 160, 0.45)",
              pt: 1.6,
            }}
          >
            QUEM É O VÂNDALO?
          </Typography>
        </Box>

        <Box
          sx={{
            position: "absolute",
            ...CORK,
            containerType: "inline-size",
            ...SEAT_SCALE,
          }}
        >
          {suspects.map((suspect, i) => (
            <SuspectSeat key={suspect.id} suspect={suspect} seatIndex={i} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
