import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/system";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { getChunkImageSrc } from "./chunk-selector-types";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

export function DroppableGridSlot({
  idx,
  slot,
  isSelected,
  isLocked,
  isJustPlaced,
  isRejecting,
}: {
  idx: number;
  slot: string | null;
  isSelected: boolean;
  isLocked: boolean;
  isJustPlaced?: boolean;
  isRejecting?: boolean;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot-${idx}`,
    disabled: isLocked,
  });

  const isDraggable = !isLocked && slot !== null;
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `grid-${idx}`,
    disabled: !isDraggable,
  });

  const borderStyle =
    isOver || isSelected
      ? `3px solid ${LayoutConfig.COLORS.INFO_TITLE}`
      : isRejecting
        ? `2px solid ${LayoutConfig.COLORS.UNAVAILABLE_RED}`
        : isJustPlaced
          ? `3px solid ${LayoutConfig.COLORS.AVAILABLE_GREEN}`
          : isLocked
            ? `2px solid ${LayoutConfig.COLORS.AVAILABLE_GREEN}`
            : `2px solid ${LayoutConfig.COLORS.CHUNK_STROKE_EMPTY_CSS}`;

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        setDropRef(node);
        setDragRef(node);
      }}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      sx={{
        width: "100%",
        aspectRatio: "122 / 80",
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
      {slot ? (
        <Box
          component="img"
          src={getChunkImageSrc(slot)}
          draggable={false}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <Typography
          sx={{ color: LayoutConfig.COLORS.TEXT_DIM, fontWeight: 700 }}
        >
          ?
        </Typography>
      )}
      {isLocked && !isJustPlaced && (
        <Box
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: LayoutConfig.COLORS.SUCCESS_GREEN,
          }}
        />
      )}
    </Box>
  );
}
