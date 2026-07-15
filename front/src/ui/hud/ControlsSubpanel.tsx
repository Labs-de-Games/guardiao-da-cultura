"use client";

import { Box, Collapse, Paper, Typography } from "@mui/material";
import { useState } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";

const CONTROLS = [
  { key: "W A S D\nou setas", action: "Andar, subir, descer" },
  { key: "ESPAÇO", action: "Pular" },
  { key: "E", action: "Interagir" },
  { key: "TAB", action: "Painel" },
  { key: "B", action: "Conquistas" },
  { key: "ESC", action: "Fechar" },
];

const TITLE_BG = "#3B8C45";
const TEXT_COLOR = "#252726";
const CONTENT_TEXT_COLOR = "#F5F5F5";

const JoystickIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={TEXT_COLOR}
    role="img"
    aria-label="Joystick"
  >
    <title>Joystick</title>
    <path d="M21,5H3l-2,9v5h22v-5L21,5z M11,13H9v2H7v-2H5v-2h2V9h2v2h2V13z M16,11c-0.552,0-1-0.448-1-1c0-0.552,0.448-1,1-1 s1,0.448,1,1C17,10.552,16.552,11,16,11z M18,15c-0.552,0-1-0.448-1-1c0-0.552,0.448-1,1-1s1,0.448,1,1C19,14.552,18.552,15,18,15 z" />
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

export function ControlsSubpanel() {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Paper
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
          onClick={handleToggle}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 0.27,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <JoystickIcon />
          </Box>
          <Typography
            sx={{
              fontFamily: LayoutConfig.FONTS.BODY,
              fontWeight: 700,
              fontSize: "12px",
              color: TEXT_COLOR,
              flex: 1,
              textAlign: "center",
            }}
          >
            Controles
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </Box>
        </Box>

        <Collapse in={expanded} timeout={200} unmountOnExit>
          <Box
            sx={{
              bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
              p: 1.5,
              borderRadius: "0 0 12px 12px",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {CONTROLS.map(({ key, action }) => (
                <Box
                  key={key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      px: 1,
                      py: 0.25,
                      minWidth: 70,
                      textAlign: "center",
                      bgcolor: "rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 600,
                        fontSize: "11px",
                        color: CONTENT_TEXT_COLOR,
                        whiteSpace: "pre-line",
                        // lineHeight: 1.3,
                      }}
                    >
                      {key}
                    </Typography>
                  </Paper>
                  <Typography
                    sx={{
                      fontFamily: LayoutConfig.FONTS.BODY,
                      fontSize: "12px",
                      color: CONTENT_TEXT_COLOR,
                      flex: 1,
                    }}
                  >
                    {action}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}
