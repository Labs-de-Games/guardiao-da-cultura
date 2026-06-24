import { useDraggable } from "@dnd-kit/core";
import { Box } from "@mui/material";

import type { ChunkItem } from "./chunk-selector-types";
import { getChunkImageSrc } from "./chunk-selector-types";

export function DraggableInventoryItem({
  index,
  item,
  isSelected,
  isPicked,
  onSetRef,
}: {
  index: number;
  item: ChunkItem;
  isSelected: boolean;
  isPicked: boolean;
  onSetRef: (node: HTMLDivElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `inv-${index}`,
  });

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        setNodeRef(node);
        onSetRef(node);
      }}
      {...listeners}
      {...attributes}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        width: "100%",
        userSelect: "none",
        bgcolor: isSelected
          ? "rgba(217, 173, 86, 0.24)"
          : isPicked
            ? "rgba(255,255,255,0.08)"
            : "#1c1d1d",
        borderRadius: "12px",
        border: isSelected ? "2px solid #d9ad56" : "1px solid #3f4040",
        p: 0.75,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <Box
        component="img"
        src={getChunkImageSrc(item.id)}
        draggable={false}
        sx={{
          width: "100%",
          aspectRatio: "122 / 70",
          borderRadius: "8px",
          objectFit: "cover",
          imageRendering: "pixelated",
          bgcolor: "#111",
        }}
      />
    </Box>
  );
}
