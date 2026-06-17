"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useRef } from "react";

import { EventBus } from "@/shared/events/event-bus";
import { UI_Z_INDEX, useGameUIStore } from "@/ui/state/game-ui-store";

const TITLE_HEIGHT = 80;
const PANEL_BORDER_WIDTH = 4;

export function LabelPanel() {
  const labelData = useGameUIStore((s) => s.labelData);
  const setLabelData = useGameUIStore((s) => s.setLabelData);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setLabelData(null);
    EventBus.emit("ui:label-hide", undefined);
  }, [setLabelData]);

  useEffect(() => {
    if (labelData && panelRef.current) {
      panelRef.current.focus();
    }
  }, [labelData]);

  if (!labelData?.title) return null;

  const rightFields = [
    { label: "Autor", value: labelData.author },
    { label: "Ano", value: labelData.year },
    { label: "Dimensões", value: labelData.dimensions },
    { label: "Técnica", value: labelData.medium },
    { label: "Local", value: labelData.place },
  ].filter((f): f is { label: string; value: string } =>
    Boolean(f.value?.trim()),
  );

  const hasRightColumn = rightFields.length > 0;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: UI_Z_INDEX.PANEL,
        pointerEvents: "auto",
      }}
    >
      <Paper
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Obra: ${labelData.title}`}
        elevation={0}
        sx={{
          width: "70vw",
          maxWidth: 800,
          height: "65vh",
          maxHeight: 550,
          bgcolor: "#ffffff",
          border: `${PANEL_BORDER_WIDTH}px solid #000000`,
          borderRadius: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* Title section */}
        <Box
          sx={{
            height: TITLE_HEIGHT,
            minHeight: TITLE_HEIGHT,
            px: 3,
            pt: 2,
            pb: 1,
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Jockey One", sans-serif',
              fontSize: "2rem",
              color: "#000000",
              lineHeight: 1.2,
              wordBreak: "break-word",
              flex: 1,
              pr: 2,
            }}
          >
            {labelData.title}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#000000",
                whiteSpace: "nowrap",
              }}
            >
              Aperte ESC para fechar
            </Typography>

            <IconButton
              onClick={handleClose}
              size="small"
              sx={{ color: "#000000" }}
              aria-label="Fechar"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Divider */}
        <Box sx={{ borderBottom: "5px solid #000000" }} />

        {/* Body section */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* Description column */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 3,
              py: 2,
              borderRight: hasRightColumn ? "1px solid #cccccc" : "none",
            }}
          >
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#000000",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {labelData.description || ""}
            </Typography>
          </Box>

          {/* Metadata column */}
          {hasRightColumn && (
            <Box
              sx={{
                width: "30%",
                minWidth: 200,
                maxWidth: 360,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {rightFields.map((field, index) => (
                <Box
                  key={`${field.label}-${index}`}
                  sx={{
                    flex: 1,
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    borderTop: index > 0 ? "1px solid #000000" : "none",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.65rem",
                      fontWeight: 400,
                      color: "#666666",
                      lineHeight: 1.3,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {field.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#000000",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {field.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
