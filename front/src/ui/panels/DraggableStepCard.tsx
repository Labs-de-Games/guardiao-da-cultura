import { useDraggable } from "@dnd-kit/core";
import { Box } from "@mui/material";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { getStepImageSrc, type StepCard } from "./step-sequence-types";

export function DraggableStepCard({
  index,
  card,
  isSelected,
}: {
  index: number;
  card: StepCard;
  isSelected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `step-${index}`,
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={card.name}
      sx={{
        width: "100%",
        aspectRatio: "16 / 9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        cursor: "grab",
        bgcolor: LayoutConfig.COLORS.CHUNK_BG_CSS,
        borderRadius: "10px",
        border: isSelected
          ? `2px solid ${GAME_UI_TOKENS.colors.accentGold}`
          : `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
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
    </Box>
  );
}
