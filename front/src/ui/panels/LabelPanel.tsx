"use client";

import { Box, Paper, Typography } from "@mui/material";
import type { PaginationRenderItemParams } from "@mui/material/Pagination";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { paginateText } from "@/lib/paginateText";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { UI_LAYERS } from "@/ui/theme/tokens";

const CARD_BG = "#FFFFFF";
const HEADER_BG = "#F4EEDE";
const TEXT_COLOR = "#000000";
const TTS_ICON_COLOR = "#3088B9";
const CARD_BORDER_RADIUS = 4;
const CARD_MAX_WIDTH = 1063;
const HEADER_HEIGHT = 139;
const TTS_ICON_SIZE = 36;
const ARROW_COLOR = "#000000";
const ARROW_PATH =
  "M202.5 18.1338C203.167 18.5187 203.167 19.4813 202.5 19.8662L180 32.8564C179.333 33.2413 178.5 32.76 178.5 31.9902L178.5 6.00976C178.5 5.2882 179.232 4.81989 179.873 5.08105L180 5.14355L202.5 18.1338Z";
const DOT_ACTIVE_BG = "#252726";
const DOT_INACTIVE_BG = "#1F1F1F";
const FONT_TITLE = '"Jockey One", sans-serif';
const FONT_BODY = "Inter, sans-serif";
const CLOSE_HINT_FONT = "Inter, sans-serif";
const CLOSE_HINT_SIZE = { xs: "0.8rem", md: "0.9rem" };
const CLOSE_X_SIZE = { xs: 20, md: 24 };
const CLOSE_HINT_FADE_DELAY_MS = 4000;
const CLOSE_HINT_FADE_DURATION_MS = 1500;

const closeHintFadeKeyframe = {
  "0%": {
    clipPath: "inset(0 0 0 0)",
    opacity: 1,
  },
  "100%": {
    clipPath: "inset(0 0 0 100%)",
    opacity: 0,
  },
};

function ArrowLeft() {
  return (
    <svg
      width="26"
      height="38"
      viewBox="0 0 26 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <g transform="scale(-1,1) translate(-204,0)">
        <path d={ARROW_PATH} stroke={ARROW_COLOR} strokeWidth="2" />
      </g>
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width="26"
      height="38"
      viewBox="178 0 26 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d={ARROW_PATH} stroke={ARROW_COLOR} strokeWidth="2" />
    </svg>
  );
}

const X_ICON_PATH =
  "M 9.15625 6.3125 L 6.3125 9.15625 L 22.15625 25 L 6.21875 40.96875 L 9.03125 43.78125 L 25 27.84375 L 40.9375 43.78125 L 43.78125 40.9375 L 27.84375 25 L 43.6875 9.15625 L 40.84375 6.3125 L 25 22.15625 Z";

function CloseXIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d={X_ICON_PATH} fill="currentColor" />
    </svg>
  );
}

const DOT_SX = {
  minWidth: 16,
  width: 16,
  height: 16,
  borderRadius: "50%",
  color: "transparent",
  border: "none",
  fontSize: 0,
  p: 0,
  bgcolor: DOT_INACTIVE_BG,
  "&:hover": { bgcolor: "#2a2c2a" },
  "&.Mui-selected": {
    bgcolor: DOT_ACTIVE_BG,
    width: 24,
    height: 24,
    minWidth: 24,
    "&:hover": { bgcolor: "#3a3c3a" },
  },
  "&.Mui-focusVisible": {
    outline: "2px solid #3088B9",
    outlineOffset: 2,
  },
} as const;

export function LabelPanel() {
  const labelData = useGameUIStore((s) => s.labelData);
  const setLabelData = useGameUIStore((s) => s.setLabelData);
  const panelRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);

  const handleClose = useCallback(() => {
    setLabelData(null);
    EventBus.emit("ui:label-hide", undefined);
  }, [setLabelData]);

  // Reset hint visibility when label opens, then fade out after delay
  useEffect(() => {
    if (!labelData) return;
    setHintVisible(true);
    const timer = setTimeout(() => {
      setHintVisible(false);
    }, CLOSE_HINT_FADE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [labelData]);

  const pages = useMemo(
    () => paginateText(labelData?.description || ""),
    [labelData?.description],
  );

  const totalPages = pages.length;
  const showNav = totalPages > 1;

  useEffect(() => {
    setCurrentPage(0);
  }, [labelData?.description]);

  useEffect(() => {
    if (labelData && panelRef.current && typeof window !== "undefined") {
      panelRef.current.focus();
    }
  }, [labelData]);

  const handlePageChange = useCallback(
    (_: React.ChangeEvent<unknown>, page: number) => {
      setCurrentPage(page - 1);
    },
    [],
  );

  const renderItem = useCallback(
    (item: PaginationRenderItemParams) => {
      const { type, ...itemProps } = item;

      if (type === "previous") {
        return (
          <button
            type="button"
            disabled={itemProps.disabled}
            aria-label="Página anterior"
            onClick={() => {
              if (!itemProps.disabled)
                setCurrentPage((p) => Math.max(0, p - 1));
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: itemProps.disabled ? "default" : "pointer",
              opacity: itemProps.disabled ? 0.3 : 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft />
          </button>
        );
      }

      if (type === "next") {
        return (
          <button
            type="button"
            disabled={itemProps.disabled}
            aria-label="Próxima página"
            onClick={() => {
              if (!itemProps.disabled)
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: itemProps.disabled ? "default" : "pointer",
              opacity: itemProps.disabled ? 0.3 : 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowRight />
          </button>
        );
      }

      return (
        <PaginationItem
          {...itemProps}
          aria-label={`Página ${itemProps.page}`}
          sx={DOT_SX}
        />
      );
    },
    [totalPages],
  );

  useEffect(() => {
    if (!labelData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        e.stopPropagation();
        setCurrentPage((p) => Math.max(0, p - 1));
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        e.stopPropagation();
        setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [labelData, totalPages]);

  if (!labelData?.title) return null;

  const subtitle = [labelData.author, labelData.year]
    .filter(Boolean)
    .join(" | ");

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: UI_LAYERS.IN_WORLD,
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
          width: { xs: "95vw", md: CARD_MAX_WIDTH },
          maxHeight: "80vh",
          bgcolor: CARD_BG,
          borderRadius: `${CARD_BORDER_RADIUS}px`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            m: "12px",
            p: "24px 36px",
            bgcolor: HEADER_BG,
            borderRadius: `${CARD_BORDER_RADIUS}px`,
            minHeight: HEADER_HEIGHT,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 1,
            position: "relative",
          }}
        >
          {/* Close affordance — top-right */}
          <Box
            component="button"
            type="button"
            aria-label="Fechar"
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 12,
              right: 16,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              background: "none",
              border: "none",
              p: 0,
              cursor: "pointer",
              color: TEXT_COLOR,
              "&:hover": { opacity: 0.7 },
              "&:focus-visible": {
                outline: "2px solid #3088B9",
                outlineOffset: 2,
                borderRadius: 1,
              },
            }}
          >
            <Typography
              sx={{
                fontFamily: CLOSE_HINT_FONT,
                fontSize: CLOSE_HINT_SIZE,
                fontWeight: 400,
                color: TEXT_COLOR,
                lineHeight: 1,
                userSelect: "none",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                animation: hintVisible
                  ? "none"
                  : `${CLOSE_HINT_FADE_DURATION_MS}ms ease forwards closeHintFade`,
                "@keyframes closeHintFade": closeHintFadeKeyframe,
              }}
            >
              Aperte ESC para fechar
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                p: 0.25,
                lineHeight: 0,
                width: { xs: CLOSE_X_SIZE.xs, md: CLOSE_X_SIZE.md },
                height: { xs: CLOSE_X_SIZE.xs, md: CLOSE_X_SIZE.md },
                flexShrink: 0,
              }}
            >
              <CloseXIcon />
            </Box>
          </Box>

          <Typography
            sx={{
              fontFamily: FONT_TITLE,
              fontSize: { xs: "2rem", md: "2.4rem" },
              fontWeight: 400,
              color: TEXT_COLOR,
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}
          >
            {labelData.title}
          </Typography>

          {subtitle && (
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                fontSize: { xs: "1.2rem", md: "1.7rem" },
                fontWeight: 400,
                color: TEXT_COLOR,
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Body */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Description area */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "flex-start",
              px: "32px",
              pt: "32px",
              pb: "48px",
              overflowY: "auto",
              gap: "32px",
            }}
          >
            {/*<Box
              component="img"
              src="/images/etiqueta/icon-text-to-speech.svg"
              alt="Ouvir descrição"
              sx={{
                width: TTS_ICON_SIZE,
                height: TTS_ICON_SIZE,
                flexShrink: 0,
                mt: "4px",
                color: TTS_ICON_COLOR,
              }}
            />*/}

            <Typography
              sx={{
                fontFamily: FONT_BODY,
                fontSize: { xs: "1.25rem", md: "2rem" },
                fontWeight: 400,
                color: TEXT_COLOR,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {pages[currentPage] || ""}
            </Typography>
          </Box>

          {/* Navigation stepper */}
          {showNav && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                pb: "32px",
                pt: "48px",
              }}
            >
              <Pagination
                count={totalPages}
                page={currentPage + 1}
                onChange={handlePageChange}
                renderItem={renderItem}
                sx={{
                  "& .MuiPagination-ul": {
                    gap: "8px",
                    justifyContent: "center",
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
