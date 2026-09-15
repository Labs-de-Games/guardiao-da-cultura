import { useDraggable } from "@dnd-kit/core";
import { Box, Button } from "@mui/material";

import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

export function DraggableNoteItem({
  id,
  note,
  isGripped,
  onSetRef,
  onActivate,
}: {
  id: string;
  note: string;
  isGripped: boolean;
  onSetRef: (node: HTMLButtonElement | null) => void;
  onActivate: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tray-${id}`,
  });

  return (
    <Button
      ref={(node: HTMLButtonElement | null) => {
        setNodeRef(node);
        onSetRef(node);
      }}
      {...listeners}
      {...attributes}
      variant="outlined"
      onClick={onActivate}
      sx={{
        py: 3,
        position: "relative",
        minWidth: 0,
        color: GAME_UI_TOKENS.colors.textPrimary,
        borderColor: isGripped
          ? GAME_UI_TOKENS.colors.accentGold
          : GAME_UI_TOKENS.colors.accentGoldMuted,
        borderWidth: isGripped ? "2px" : "1px",
        bgcolor: isGripped ? "rgba(217, 173, 86, 0.16)" : undefined,
        fontFamily: GAME_UI_TOKENS.fonts.body,
        fontWeight: 700,
        fontSize: "13px",
        opacity: isDragging ? 0.3 : 1,
        "&:hover": {
          borderColor: GAME_UI_TOKENS.colors.accentGold,
          bgcolor: "rgba(217, 173, 86, 0.1)",
        },
      }}
    >
      {note}
      <Box
        component="img"
        src="/assets/ui/sound_icon.png"
        alt=""
        sx={{
          position: "absolute",
          top: 3,
          right: 3,
          width: "12px",
          height: "12px",
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />
    </Button>
  );
}
