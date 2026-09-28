"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";

export const DASHBOARD_ERROR_LOGO = "/images/auth/logo-jogo.png";
/** Watermark strength for the background logo — low enough to keep text readable. */
export const DASHBOARD_ERROR_LOGO_OPACITY = 0.1;
const LOGO_SIZE = { xs: 220, sm: 320, md: 420 };
const HEADING_FONT = "'Jockey One', sans-serif";

export interface DashboardErrorAction {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

export interface DashboardErrorLayoutProps {
  title: string;
  description: ReactNode;
  /** Short code shown above the title, e.g. "404". */
  code?: string;
  primaryAction?: DashboardErrorAction;
  secondaryAction?: DashboardErrorAction;
  /** Support reference (e.g. Next.js error digest). Never pass raw messages. */
  reference?: string;
  /**
   * Render DashboardFooter below the message. Off when a layout that
   * already renders the footer wraps this screen (institution/layout.tsx),
   * so the footer never shows twice.
   */
  withFooter?: boolean;
  children?: ReactNode;
}

/**
 * Full-page error shell for the dashboards: dashboard theme, faded game
 * logo behind the message, optional footer. Stays free of API calls and
 * auth state so it renders even when the rest of the dashboard is broken.
 */
export function DashboardErrorLayout({
  title,
  description,
  code,
  primaryAction,
  secondaryAction,
  reference,
  withFooter = true,
  children,
}: DashboardErrorLayoutProps) {
  const primaryRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        // The root layout locks body scroll for the game, so a standalone
        // screen scrolls itself; dvh keeps mobile browser bars from
        // hiding the bottom.
        ...(withFooter
          ? { height: "100dvh", overflowY: "auto" }
          : { minHeight: "100%" }),
        flexGrow: 1,
        bgcolor: "background.default",
      }}
    >
      <Box
        component={withFooter ? "main" : "section"}
        sx={{
          position: "relative",
          // Grow, never shrink: with overflow hidden a shrinking box would
          // clip the message instead of letting the page scroll.
          flex: "1 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          px: 3,
          py: { xs: 5, sm: 8 },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            opacity: DASHBOARD_ERROR_LOGO_OPACITY,
            pointerEvents: "none",
          }}
        >
          <Image
            src={DASHBOARD_ERROR_LOGO}
            alt=""
            fill
            sizes={`${LOGO_SIZE.md}px`}
            style={{ objectFit: "contain" }}
          />
        </Box>

        <Box
          role="alert"
          aria-labelledby="dashboard-error-title"
          sx={{
            position: "relative",
            maxWidth: 520,
            textAlign: "center",
          }}
        >
          {code && (
            <Typography
              component="p"
              sx={{
                fontFamily: HEADING_FONT,
                fontSize: { xs: 56, sm: 72 },
                lineHeight: 1,
                color: "custom.highlight",
                mb: 1,
              }}
            >
              {code}
            </Typography>
          )}

          <Typography
            id="dashboard-error-title"
            component="h1"
            variant="h4"
            sx={{
              fontFamily: HEADING_FONT,
              fontWeight: 700,
              fontSize: { xs: "1.75rem", sm: "2.125rem" },
              color: "text.primary",
              mb: 2,
            }}
          >
            {title}
          </Typography>

          <Typography
            component="div"
            variant="body1"
            sx={{ color: "text.secondary" }}
          >
            {description}
          </Typography>

          {children}

          {(primaryAction || secondaryAction) && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mt: 4, justifyContent: "center" }}
            >
              {primaryAction && (
                <Button
                  ref={primaryRef}
                  variant="contained"
                  disableElevation
                  href={primaryAction.href}
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  sx={{ textTransform: "none", px: 3 }}
                >
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button
                  variant="outlined"
                  href={secondaryAction.href}
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                  sx={{
                    textTransform: "none",
                    px: 3,
                    color: "text.primary",
                    borderColor: "divider",
                    "&:hover": { borderColor: "text.secondary" },
                  }}
                >
                  {secondaryAction.label}
                </Button>
              )}
            </Stack>
          )}

          {reference && (
            <Typography
              component="p"
              variant="caption"
              sx={{ display: "block", mt: 3, color: "text.secondary" }}
            >
              Código de referência: {reference}
            </Typography>
          )}
        </Box>
      </Box>
      {withFooter && <DashboardFooter />}
    </Box>
  );
}
