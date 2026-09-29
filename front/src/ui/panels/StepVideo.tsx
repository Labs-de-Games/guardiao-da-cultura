import PlayCircleOutlinedIcon from "@mui/icons-material/PlayCircleOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import { Box, IconButton } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

export function StepVideo({ videoPath }: { videoPath: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Drives which control is shown: the big centre play icon before the first
  // run and after the clip ends, the small corner replay icon while playing.
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    setHasPlayed(false);
  }, [videoPath]);

  const handlePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    void video.play();
    setHasPlayed(true);
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: "10px",
        overflow: "hidden",
        bgcolor: GAME_UI_TOKENS.colors.bgTertiary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        ref={videoRef}
        component="video"
        src={videoPath}
        preload="metadata"
        playsInline
        muted
        aria-label="Vídeo dos passos de quadrilha"
        onEnded={() => setHasPlayed(false)}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />

      {hasPlayed ? (
        <IconButton
          onClick={handlePlay}
          aria-label="Repetir vídeo dos passos de quadrilha"
          size="small"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            color: GAME_UI_TOKENS.colors.textPrimary,
            bgcolor: "rgba(0,0,0,0.5)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
          }}
        >
          <ReplayIcon fontSize="small" />
        </IconButton>
      ) : (
        <IconButton
          onClick={handlePlay}
          aria-label="Reproduzir vídeo dos passos de quadrilha"
          sx={{
            position: "absolute",
            color: LayoutConfig.COLORS.HINT_GREY,
            "&:hover": { color: GAME_UI_TOKENS.colors.accentGold },
          }}
        >
          <PlayCircleOutlinedIcon sx={{ fontSize: 64 }} />
        </IconButton>
      )}
    </Box>
  );
}
