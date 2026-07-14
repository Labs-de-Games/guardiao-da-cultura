"use client";

import { Box, Collapse, Paper, Slider, Typography } from "@mui/material";
import { useState } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";

const TITLE_BG = "#AF7E2F";
const TEXT_COLOR = "#252726";
const ICON_COLOR = "#F5F5F5";
const SLIDER_COLOR = "#AF7E2F";
const RAMP_COLOR = "#3a3a3a";

interface VolumeControlProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const SpeakerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 50 50"
    fill={TEXT_COLOR}
    role="img"
  >
    <title>Som</title>
    <path d="M 26.609375 2 C 25.945313 2 25.304688 2.28125 24.855469 2.765625 L 12 16 L 12 34 L 24.855469 47.234375 C 25.304688 47.722656 25.945313 48 26.609375 48 C 27.925781 48 29 46.925781 29 45.609375 L 29 4.390625 C 29 3.074219 27.925781 2 26.609375 2 Z M 39.695313 10.421875 L 38.574219 12.074219 C 43.007813 14.679688 46 19.492188 46 25 C 46 30.507813 43.007813 35.320313 38.574219 37.925781 L 39.695313 39.578125 C 44.660156 36.609375 48 31.195313 48 25 C 48 18.804688 44.660156 13.390625 39.695313 10.421875 Z M 36.324219 15.378906 L 35.191406 17.042969 C 38.046875 18.554688 40 21.550781 40 25 C 40 28.449219 38.046875 31.445313 35.191406 32.957031 L 36.324219 34.621094 C 39.707031 32.738281 42 29.136719 42 25 C 42 20.863281 39.707031 17.261719 36.324219 15.378906 Z M 5 16 C 3.347656 16 2 17.347656 2 19 L 2 31 C 2 32.652344 3.347656 34 5 34 L 10 34 L 10 16 Z M 32.921875 20.386719 L 31.753906 22.109375 C 33.042969 22.445313 34 23.605469 34 25 C 34 26.394531 33.042969 27.554688 31.753906 27.890625 L 32.921875 29.613281 C 34.726563 28.855469 36 27.074219 36 25 C 36 22.925781 34.726563 21.140625 32.921875 20.386719 Z" />
  </svg>
);

const MusicIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill={ICON_COLOR}
    role="img"
    aria-label="Música"
  >
    <title>Música</title>
    <path d="M 4 1 L 4 4 L 4 5 L 4 9.171875 A 3 3 0 0 0 3 9 A 3 3 0 0 0 3 15 A 3 3 0 0 0 5.9960938 12 L 6 12 L 6 5 L 13 5 L 13 9.171875 A 3 3 0 0 0 12 9 A 3 3 0 0 0 12 15 A 3 3 0 0 0 14.996094 12 L 15 12 L 15 5 L 15 4 L 15 1 L 4 1 z" />
  </svg>
);

const EffectsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 50 50"
    fill={ICON_COLOR}
    role="img"
    aria-label="Efeitos"
  >
    <title>Efeitos</title>
    <path d="M49.306 26.548l-11.24-3.613-3.613-11.241C34.319 11.28 33.935 11 33.5 11s-.819.28-.952.694l-3.613 11.241-11.24 3.613C17.28 26.681 17 27.065 17 27.5s.28.819.694.952l11.24 3.613 3.613 11.241C32.681 43.72 33.065 44 33.5 44s.819-.28.952-.694l3.613-11.241 11.24-3.613C49.72 28.319 50 27.935 50 27.5S49.72 26.681 49.306 26.548zM1.684 13.949l7.776 2.592 2.592 7.776C12.188 24.725 12.569 25 13 25s.813-.275.948-.684l2.592-7.776 7.776-2.592C24.725 13.813 25 13.431 25 13s-.275-.813-.684-.949L16.54 9.459l-2.592-7.776C13.813 1.275 13.431 1 13 1s-.813.275-.948.684L9.46 9.459l-7.776 2.592C1.275 12.188 1 12.569 1 13S1.275 13.813 1.684 13.949zM17.316 39.05l-5.526-1.842-1.842-5.524C9.813 31.276 9.431 31 9 31s-.813.275-.948.684L6.21 37.208.685 39.05c-.408.136-.684.518-.684.949s.275.813.684.949l5.526 1.842 1.841 5.524C8.188 48.721 8.569 48.997 9 48.997s.813-.275.948-.684l1.842-5.524 5.526-1.842C17.725 40.811 18 40.429 18 39.999S17.725 39.186 17.316 39.05z" />
  </svg>
);

const VoiceIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 30 30"
    fill={ICON_COLOR}
    role="img"
    aria-label="Narração"
  >
    <title>Narração</title>
    <path d="M 13 3 C 6.925 3 2 7.477 2 13 C 2 15.837518 3.306518 18.39284 5.3945312 20.212891 C 5.093984 21.190901 4.4689762 22.164269 3.3242188 23.03125 C 3.3234549 23.031829 3.3230299 23.032625 3.3222656 23.033203 A 0.5 0.5 0 0 0 3.5 24 A 0.5 0.5 0 0 0 3.6054688 23.988281 C 5.5400885 23.981524 7.1912591 23.156263 8.5058594 22.121094 C 9.8792065 22.68134 11.397234 23 13 23 C 19.075 23 24 18.523 24 13 C 24 7.477 19.075 3 13 3 z M 9 10 L 17 10 C 17.552 10 18 10.448 18 11 C 18 11.552 17.552 12 17 12 L 9 12 C 8.448 12 8 11.552 8 11 C 8 10.448 8.448 10 9 10 z M 9 14 L 15 14 C 15.552 14 16 14.448 16 15 C 16 15.552 15.552 16 15 16 L 9 16 C 8.448 16 8 15.552 8 15 C 8 14.448 8.448 14 9 14 z M 25.777344 15.166016 C 24.746344 20.357016 20.094078 24.3935 14.330078 24.9375 C 15.778078 26.2105 17.784 27 20 27 C 21.056083 27 22.061339 26.815582 22.984375 26.490234 C 24.211688 27.347591 25.69711 27.983324 27.398438 27.988281 A 0.5 0.5 0 0 0 27.5 28 A 0.5 0.5 0 0 0 27.673828 27.03125 C 26.75793 26.336176 26.170272 25.57197 25.818359 24.792969 C 27.167112 23.539939 28 21.857118 28 20 C 28 18.123 27.151344 16.423016 25.777344 15.166016 z" />
  </svg>
);

const ExpandIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 50 50"
    fill={TEXT_COLOR}
    role="img"
    aria-label="Expandir"
  >
    <title>Expandir</title>
    <path d="M 4 17 L 25 39 L 46 17 Z" />
  </svg>
);

const CollapseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={TEXT_COLOR}
    role="img"
    aria-label="Recolher"
  >
    <title>Recolher</title>
    <path d="M12 9.929L16.571 14.5 18.071 13 12 6.929 5.929 13 7.429 14.5z" />
  </svg>
);

const VolumeRamp = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 120"
    width="100%"
    height="100%"
    preserveAspectRatio="none"
    role="img"
    aria-label="Indicador de volume"
  >
    <title>Indicador de volume</title>
    <polygon points="10,110 190,110 190,10" fill={RAMP_COLOR} />
  </svg>
);

function VolumeControl({ icon, value, onChange }: VolumeControlProps) {
  const handleChange = (_: Event, newValue: number | number[]) => {
    onChange(newValue as number);
  };

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, position: "relative", height: 28 }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.6,
          }}
        >
          <VolumeRamp />
        </Box>
        <Slider
          value={value}
          onChange={handleChange}
          min={0}
          max={100}
          sx={{
            position: "absolute",
            top: -6,
            left: 6,
            right: 6,
            height: 40,
            padding: 0,
            "& .MuiSlider-rail": {
              display: "none",
            },
            "& .MuiSlider-track": {
              display: "none",
            },
            "& .MuiSlider-thumb": {
              width: 12,
              height: 24,
              bgcolor: SLIDER_COLOR,
              borderRadius: "2px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
              "&:hover": {
                boxShadow: "0 3px 6px rgba(0,0,0,0.5)",
              },
              "&.Mui-focusVisible": {
                boxShadow: "0 0 0 2px rgba(175, 126, 47, 0.4)",
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}

export function AudioSubpanel() {
  const [expanded, setExpanded] = useState(false);
  const [musicVolume, setMusicVolume] = useState(70);
  const [effectsVolume, setEffectsVolume] = useState(80);
  const [voiceVolume, setVoiceVolume] = useState(60);

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
        onClick={handleToggle}
        elevation={2}
        sx={{
          bgcolor: TITLE_BG,
          borderRadius: "12px",
          cursor: "pointer",
          transition: "all 0.15s ease-in-out",
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          "&:hover": {
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SpeakerIcon />
          </Box>
          <Typography
            sx={{
              fontFamily: LayoutConfig.FONTS.BODY,
              fontWeight: 700,
              fontSize: "14px",
              color: TEXT_COLOR,
              flex: 1,
              textAlign: "center",
            }}
          >
            Som
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </Box>
        </Box>
      </Paper>

      <Collapse in={expanded} timeout={200} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
            borderRadius: "12px",
            p: 1.5,
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <VolumeControl
              icon={<MusicIcon />}
              label="Música"
              value={musicVolume}
              onChange={setMusicVolume}
            />
            <VolumeControl
              icon={<EffectsIcon />}
              label="Efeitos"
              value={effectsVolume}
              onChange={setEffectsVolume}
            />
            <VolumeControl
              icon={<VoiceIcon />}
              label="Narração"
              value={voiceVolume}
              onChange={setVoiceVolume}
            />
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
