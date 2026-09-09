import { useDraggable } from "@dnd-kit/core";
import { Box } from "@mui/material";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { getStepImageSrc, type StepCard } from "./step-sequence-types";

export function DraggableStepCard({
  index,
  card,
  isUsed,
}: {
  index: number;
  card: StepCard;
  isUsed: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `step-${index}`,
    disabled: isUsed,
  });

  return (
    <Box
      ref={setNodeRef}
      {...(isUsed ? {} : listeners)}
      {...(isUsed ? {} : attributes)}
      aria-label={card.name}
      sx={{
        width: "100%",
        aspectRatio: "16 / 9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        cursor: isUsed ? "default" : "grab",
        bgcolor: LayoutConfig.COLORS.CHUNK_BG_CSS,
        borderRadius: "10px",
        border: `2px solid ${
          isUsed
            ? LayoutConfig.COLORS.CHUNK_STROKE_EMPTY_CSS
            : GAME_UI_TOKENS.colors.accentGoldMuted
        }`,
        opacity: isDragging ? 0.3 : isUsed ? 0.35 : 1,
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
