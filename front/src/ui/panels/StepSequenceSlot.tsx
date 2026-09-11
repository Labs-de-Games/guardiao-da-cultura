import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/system";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { getStepImageSrc, type StepCard } from "./step-sequence-types";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

export function StepSequenceSlot({
  idx,
  card,
  isLocked,
  isJustPlaced,
  isRejecting,
  previewCard,
  isSelected,
}: {
  idx: number;
  card: StepCard | null;
  isLocked: boolean;
  isJustPlaced?: boolean;
  isRejecting?: boolean;
  previewCard?: StepCard | null;
  isSelected?: boolean;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot-${idx}`,
    disabled: isLocked,
  });

  const isDraggable = !isLocked && card !== null;
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `seq-${idx}`,
    disabled: !isDraggable,
  });

  const borderStyle = isOver
    ? `3px solid ${LayoutConfig.COLORS.INFO_TITLE}`
    : isRejecting
      ? `2px solid ${LayoutConfig.COLORS.UNAVAILABLE_RED}`
      : isJustPlaced
        ? `3px solid ${LayoutConfig.COLORS.AVAILABLE_GREEN}`
        : isLocked
          ? `2px solid ${LayoutConfig.COLORS.AVAILABLE_GREEN}`
          : isSelected
            ? `2px solid ${GAME_UI_TOKENS.colors.accentGold}`
            : `2px solid ${LayoutConfig.COLORS.CHUNK_STROKE_EMPTY_CSS}`;

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        setDropRef(node);
        setDragRef(node);
      }}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      data-testid={`step-slot-${idx}`}
      aria-label={`Passo ${idx + 1}${card ? `: ${card.name}` : " vazio"}`}
      sx={{
        width: "100%",
        aspectRatio: "16 / 9",
        bgcolor: LayoutConfig.COLORS.CHUNK_BG_CSS,
        border: borderStyle,
        borderRadius: "10px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: isDraggable ? "grab" : "default",
        opacity: isDragging ? 0.3 : 1,
        userSelect: "none",
        animation: isRejecting ? `${shake} 0.4s ease` : "none",
      }}
    >
      {card ? (
        <Box
          component="img"
          src={getStepImageSrc(card)}
          alt=""
          draggable={false}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : previewCard ? (
        <Box
          component="img"
          src={getStepImageSrc(previewCard)}
          alt=""
          draggable={false}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.6,
          }}
        />
      ) : (
        <Typography
          sx={{ color: LayoutConfig.COLORS.TEXT_DIM, fontWeight: 700 }}
        >
          {idx + 1}
        </Typography>
      )}
    </Box>
  );
}
