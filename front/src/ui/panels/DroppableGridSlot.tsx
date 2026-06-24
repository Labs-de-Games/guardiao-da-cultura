import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";

import { getChunkImageSrc } from "./chunk-selector-types";

export function DroppableGridSlot({
  idx,
  slot,
  isSelected,
  isLocked,
}: {
  idx: number;
  slot: string | null;
  isSelected: boolean;
  isLocked: boolean;
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
        bgcolor: "#111",
        border: isLocked
          ? "2px solid #4b8b5f"
          : isOver || isSelected
            ? "3px solid #d9ad56"
            : "2px solid #454646",
        borderRadius: "10px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        cursor: isDraggable ? "grab" : "default",
        opacity: isDragging ? 0.3 : 1,
        userSelect: "none",
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
        <Typography sx={{ color: "#5f6060", fontWeight: 700 }}>?</Typography>
      )}
      {isLocked && (
        <Box
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "#8dd39d",
          }}
        />
      )}
    </Box>
  );
}
