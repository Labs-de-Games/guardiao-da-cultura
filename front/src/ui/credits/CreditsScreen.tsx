"use client";

import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import {
  CREDITS_BODY_FONT,
  CREDITS_BODY_SIZE,
  CREDITS_COLUMN_WIDTH,
  CREDITS_HEADING_SIZE,
  CREDITS_LICENSE_SIZE,
  CREDITS_TITLE_FONT,
  CREDITS_TITLE_SIZE,
  EASE_CRAWL,
  ENTRY_GAP,
  SCROLL_LEAD_IN_MS,
  SCROLL_SPEED_PX_PER_SEC,
  SECTION_GAP,
} from "./constants";
import { CREDITS_SECTIONS } from "./creditsData";

export type CreditsScreenProps = {
  onClose: () => void;
};

/**
 * Full-screen credits crawl: renders every credited person/asset in one
 * tall column and scrolls it continuously upward, like movie end credits,
 * until it clears the top of the screen. Click anywhere or press
 * Escape/Enter to close early.
 */
export function CreditsScreen({ onClose }: CreditsScreenProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [distance, setDistance] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [started, setStarted] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onClose();
  }, [onClose]);

  useEffect(() => {
    const measure = () => {
      const contentHeight = contentRef.current?.scrollHeight ?? 0;
      const viewportHeight = window.innerHeight;
      const total = viewportHeight + contentHeight;
      setDistance(total);
      setDurationMs((total / SCROLL_SPEED_PX_PER_SEC) * 1000);
    };
    requestAnimationFrame(() => requestAnimationFrame(measure));
  }, []);

  useEffect(() => {
    if (distance <= 0) return;
    const timer = window.setTimeout(() => setStarted(true), SCROLL_LEAD_IN_MS);
    return () => window.clearTimeout(timer);
  }, [distance]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish]);

  return (
    <Box
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter") {
          e.preventDefault();
          finish();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Aperte ESC para fechar os créditos"
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        cursor: "pointer",
        background:
          "linear-gradient(rgba(31, 20, 10, 0.55), rgba(31, 20, 10, 0.85)), #252726 url('/assets/misc/map.png') center / cover no-repeat",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "24px",
          left: "24px",
          bgcolor: "#000000",
          border: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
          borderRadius: "8px",
          px: "16px",
          py: "12px",
          fontFamily: CREDITS_BODY_FONT,
          fontSize: "10px",
          color: GAME_UI_TOKENS.colors.textPrimary,
          pointerEvents: "none",
        }}
      >
        Aperte ESC para fechar
      </Box>

      <Box
        ref={contentRef}
        onTransitionEnd={(e: React.TransitionEvent<HTMLDivElement>) => {
          if (e.propertyName === "transform") finish();
        }}
        sx={{
          position: "absolute",
          top: "100%",
          left: "50%",
          width: `min(${CREDITS_COLUMN_WIDTH}px, calc(100vw - 48px))`,
          transform: `translate(-50%, ${started ? -distance : 0}px)`,
          transition: started
            ? `transform ${durationMs}ms ${EASE_CRAWL}`
            : "none",
          willChange: "transform",
          textAlign: "center",
        }}
      >
        <Typography
          component="h1"
          sx={{
            m: 0,
            mb: "64px",
            fontFamily: CREDITS_TITLE_FONT,
            fontSize: CREDITS_TITLE_SIZE,
            color: GAME_UI_TOKENS.colors.accentGold,
            textShadow: "2px 2px 0 #2A1C10",
          }}
        >
          Créditos
        </Typography>

        {CREDITS_SECTIONS.map((section) => (
          <Box
            key={section.heading}
            component="section"
            sx={{ mb: `${SECTION_GAP}px` }}
          >
            <Typography
              component="h2"
              sx={{
                m: 0,
                mb: "20px",
                fontFamily: CREDITS_TITLE_FONT,
                fontWeight: 400,
                fontSize: CREDITS_HEADING_SIZE,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: GAME_UI_TOKENS.colors.accentGold,
              }}
            >
              {section.heading}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: `${ENTRY_GAP}px`,
              }}
            >
              {section.entries.map((entry, i) => (
                <Box key={`${section.heading}-${i}`}>
                  <Typography
                    sx={{
                      fontFamily: CREDITS_BODY_FONT,
                      fontSize: CREDITS_BODY_SIZE,
                      color: GAME_UI_TOKENS.colors.textPrimary,
                      lineHeight: 1.4,
                    }}
                  >
                    {entry.name}
                  </Typography>
                  {(entry.url || entry.license) && (
                    <Typography
                      sx={{
                        fontFamily: CREDITS_BODY_FONT,
                        fontSize: CREDITS_LICENSE_SIZE,
                        color: GAME_UI_TOKENS.colors.textSecondary,
                        lineHeight: 1.4,
                      }}
                    >
                      {[entry.url, entry.license].filter(Boolean).join(" — ")}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
