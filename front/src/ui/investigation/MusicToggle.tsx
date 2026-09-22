"use client";

import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { AudioManager } from "@/game/audio/AudioManager";
import { DEFAULT_AUDIO_SETTINGS } from "@/game/audio/types";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const { colors, radius } = GAME_UI_TOKENS;

const MusicOnIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 16 16"
    fill="currentColor"
    role="img"
  >
    <title>Música ligada</title>
    <path d="M 4 1 L 4 4 L 4 5 L 4 9.171875 A 3 3 0 0 0 3 9 A 3 3 0 0 0 3 15 A 3 3 0 0 0 5.9960938 12 L 6 12 L 6 5 L 13 5 L 13 9.171875 A 3 3 0 0 0 12 9 A 3 3 0 0 0 12 15 A 3 3 0 0 0 14.996094 12 L 15 12 L 15 5 L 15 4 L 15 1 L 4 1 z" />
  </svg>
);

const MusicOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 16 16"
    fill="currentColor"
    role="img"
  >
    <title>Música silenciada</title>
    <path d="M 4 1 L 4 4 L 4 5 L 4 9.171875 A 3 3 0 0 0 3 9 A 3 3 0 0 0 3 15 A 3 3 0 0 0 5.9960938 12 L 6 12 L 6 5 L 13 5 L 13 9.171875 A 3 3 0 0 0 12 9 A 3 3 0 0 0 12 15 A 3 3 0 0 0 14.996094 12 L 15 12 L 15 5 L 15 4 L 15 1 L 4 1 z" />
    {/* The slash is drawn twice: a dark stroke underneath keeps it readable
        wherever it crosses the note itself. */}
    <path
      d="M 1.2 14.1 L 14.1 1.2"
      stroke={colors.bgSecondary}
      strokeWidth="3.4"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M 1.2 14.1 L 14.1 1.2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/**
 * Music on/off for the identification phase.
 *
 * The phase takes the whole screen and leaves the HUD behind, so the audio
 * panel the rest of the game offers is out of reach here. This silences the
 * music only — the error sound a wrong accusation plays is feedback, not
 * atmosphere, and goes on working.
 *
 * Volume is the game's own setting, so muting here is remembered everywhere and
 * survives leaving the phase.
 */
export function MusicToggle() {
  const [muted, setMuted] = useState(false);
  const previousVolume = useRef(DEFAULT_AUDIO_SETTINGS.musicVolume);

  // Read on mount rather than at render: the settings come from localStorage,
  // which does not exist while this is being rendered on the server.
  useEffect(() => {
    const { musicVolume } = AudioManager.getSettings();
    if (musicVolume > 0) previousVolume.current = musicVolume;
    setMuted(musicVolume === 0);
  }, []);

  const toggle = () => {
    if (muted) {
      AudioManager.setMusicVolume(previousVolume.current);
      setMuted(false);
      return;
    }
    // Whatever it was set to elsewhere is what unmuting should bring back.
    const { musicVolume } = AudioManager.getSettings();
    if (musicVolume > 0) previousVolume.current = musicVolume;
    AudioManager.setMusicVolume(0);
    setMuted(true);
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Ativar música" : "Silenciar música"}
      title={muted ? "Ativar música" : "Silenciar música"}
      sx={{
        position: "absolute",
        top: 12,
        right: 12,
        // Above the board, below every panel that takes the screen.
        zIndex: 1,
        width: 40,
        height: 40,
        scale: 1.2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mr: 1.2,
        mt: 1.2,
        p: 0,
        cursor: "pointer",
        color: muted ? colors.textSecondary : colors.accentGold,
        bgcolor: "rgba(17, 15, 19, 0.85)",
        border: `1px solid ${muted ? colors.bgTertiary : colors.accentGoldMuted}`,
        borderRadius: `${radius.small}px`,
        transition: "color 120ms linear, border-color 120ms linear",
        "&:hover": {
          color: colors.textPrimary,
          borderColor: colors.accentGold,
        },
      }}
    >
      {muted ? <MusicOffIcon /> : <MusicOnIcon />}
    </Box>
  );
}
