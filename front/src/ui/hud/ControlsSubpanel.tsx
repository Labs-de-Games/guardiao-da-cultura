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
  { key: "ESC", action: "Voltar ao mapa" },
];

const TITLE_BG = "#3B8C45";
const TEXT_COLOR = "#252726";
const CONTENT_TEXT_COLOR = "#F5F5F5";

/* const JoystickIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={TEXT_COLOR}
    role="img"
  >
    <title>Controles</title>
    <path d="M21,5H3l-2,9v5h22v-5L21,5z M11,13H9v2H7v-2H5v-2h2V9h2v2h2V13z M16,11c-0.552,0-1-0.448-1-1c0-0.552,0.448-1,1-1 s1,0.448,1,1C17,10.552,16.552,11,16,11z M18,15c-0.552,0-1-0.448-1-1c0-0.552,0.448-1,1-1s1,0.448,1,1C19,14.552,18.552,15,18,15 z" />
  </svg>
);
*/

/*
const JoystickIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 30 30"
    fill={TEXT_COLOR}
    role="img"
  >
      <title>Controles</title>
      <path d="M27,6H3C1.895,6,1,6.895,1,8v14c0,1.105,0.895,2,2,2h24c1.105,0,2-0.895,2-2V8C29,6.895,28.105,6,27,6z M20,10h2v2h-2V10z M16,10h2v2h-2V10z M20,14v2h-2v-2H20z M12,10h2v2h-2V10z M16,14v2h-2v-2H16z M8,10h2v2H8V10z M12,14v2h-2v-2H12z M4,10h2v2H4V10z M4,14h4v2H4V14z M6,20H4v-2h2V20z M22,20H8v-2h14V20z M26,20h-2v-2h2V20z M26,16h-4v-2h4V16z M26,12h-2v-2h2V12z"></path>
  </svg>
);
*/

const JoystickIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 100 95"
    fill={TEXT_COLOR}
    role="img"
  >
    <title>Controles</title>
    <path d="M63.605,17.212h-27.21c-1.066,0-1.93,0.864-1.93,1.93v27.211c0,1.065,0.863,1.93,1.93,1.93h27.21   c1.066,0,1.93-0.864,1.93-1.93V19.142C65.535,18.076,64.672,17.212,63.605,17.212z M39.931,36.855L50,26.786l10.07,10.07H39.931z    M63.605,51.718H36.395c-1.066,0-1.929,0.864-1.929,1.93v27.211c0,1.065,0.863,1.929,1.929,1.929h27.211   c1.066,0,1.93-0.863,1.93-1.929V53.647C65.535,52.582,64.672,51.718,63.605,51.718z M50,73.882l-10.069-10.07h20.14L50,73.882z    M29.141,51.718H1.93c-1.065,0-1.93,0.864-1.93,1.93v27.21c0,1.066,0.864,1.931,1.93,1.931h27.211c1.065,0,1.929-0.864,1.929-1.931   v-27.21C31.07,52.582,30.206,51.718,29.141,51.718z M19.117,77.322L9.047,67.253l10.07-10.069V77.322z M98.07,51.718H70.859   c-1.065,0-1.93,0.864-1.93,1.93v27.211c0,1.065,0.864,1.93,1.93,1.93H98.07c1.066,0,1.93-0.864,1.93-1.93V53.647   C100,52.582,99.137,51.718,98.07,51.718z M81.047,77.322V57.184l10.069,10.069L81.047,77.322z" />
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
