import { useDraggable, useDroppable } from "@dnd-kit/core";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Box } from "@mui/material";
import { keyframes } from "@mui/system";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

export function DroppableSequenceSlot({
  slotIndex,
  note,
  isLocked,
  isRejecting,
  isPlaying,
  isFocused,
  onActivate,
}: {
  slotIndex: number;
  note: string | null;
  isLocked: boolean;
  isRejecting: boolean;
  isPlaying: boolean;
  isFocused: boolean;
  onActivate: () => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    disabled: isLocked,
  });

  const isDraggable = !isLocked && note !== null;
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `slot-${slotIndex}`,
    disabled: !isDraggable,
  });

  // A placed-but-unconfirmed note gets a thin gray outline, just enough to
  // read as "filled in by the player" rather than a fixed sequence note.
  const isPlacedNeutral =
    !isPlaying &&
    !isRejecting &&
    !isLocked &&
    !isOver &&
    !isFocused &&
    note !== null;

  const borderColor = isPlaying
    ? GAME_UI_TOKENS.colors.accentGold
    : isRejecting
      ? LayoutConfig.COLORS.UNAVAILABLE_RED
      : isLocked
        ? LayoutConfig.COLORS.SUCCESS_GREEN
        : isOver || isFocused
          ? GAME_UI_TOKENS.colors.accentGold
          : isPlacedNeutral
            ? GAME_UI_TOKENS.colors.textSecondary
            : "transparent";
  const borderWidth = isPlacedNeutral ? 1 : 2;

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        setDropRef(node);
        setDragRef(node);
      }}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      onClick={onActivate}
      sx={{
        aspectRatio: "1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "10px",
        bgcolor: note
          ? GAME_UI_TOKENS.colors.bgTertiary
          : GAME_UI_TOKENS.colors.bgPrimary,
        border: `${borderWidth}px solid ${borderColor}`,
        color: GAME_UI_TOKENS.colors.textPrimary,
        fontFamily: GAME_UI_TOKENS.fonts.body,
        fontWeight: 700,
        fontSize: "11px",
        position: "relative",
        cursor: isLocked ? "default" : "pointer",
        opacity: isDragging ? 0.3 : 1,
        userSelect: "none",
        animation: isRejecting ? `${shake} 0.4s ease` : "none",
      }}
    >
      {note}
      {isLocked && (
        <CheckCircleIcon
          sx={{
            position: "absolute",
            top: "8%",
            right: "8%",
            color: LayoutConfig.COLORS.SUCCESS_GREEN,
            bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
            borderRadius: "50%",
            fontSize: "10px",
          }}
        />
      )}
    </Box>
  );
}
