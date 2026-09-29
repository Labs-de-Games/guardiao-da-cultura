"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const { colors, fonts, radius } = GAME_UI_TOKENS;

export const DEFAULT_ERROR_ILLUSTRATION = "/assets/misc/exclamation.png";
const ILLUSTRATION_SIZE = 96;

export interface ErrorPageAction {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

export interface ErrorPageLayoutProps {
  title: string;
  description: ReactNode;
  /** Short code shown above the title, e.g. "404". */
  code?: string;
  illustrationSrc?: string;
  primaryAction?: ErrorPageAction;
  secondaryAction?: ErrorPageAction;
  /** Support reference (e.g. Next.js error digest). Never pass raw messages. */
  reference?: string;
  children?: ReactNode;
}

function ActionButton({
  action,
  variant,
  autoFocusRef,
}: {
  action: ErrorPageAction;
  variant: "primary" | "secondary";
  autoFocusRef?: React.Ref<HTMLButtonElement & HTMLAnchorElement>;
}) {
  const isPrimary = variant === "primary";
  return (
    <Button
      ref={autoFocusRef}
      href={action.href}
      onClick={action.onClick}
      disabled={action.disabled}
      variant={isPrimary ? "contained" : "outlined"}
      disableElevation
      sx={{
        fontFamily: `${fonts.display}, sans-serif`,
        fontSize: 20,
        textTransform: "none",
        borderRadius: `${radius.small}px`,
        px: 3,
        color: isPrimary ? colors.bgPrimary : colors.accentGold,
        backgroundColor: isPrimary ? colors.accentGold : "transparent",
        borderColor: colors.accentGold,
        "&:hover": {
          backgroundColor: isPrimary
            ? colors.accentGoldHover
            : "rgba(217, 173, 86, 0.08)",
          borderColor: colors.accentGoldHover,
        },
        "&:focus-visible": {
          outline: `2px solid ${colors.textPrimary}`,
          outlineOffset: 2,
        },
        "&.Mui-disabled": {
          color: colors.textSecondary,
          borderColor: colors.accentGoldMuted,
          backgroundColor: isPrimary ? colors.accentGoldMuted : "transparent",
        },
      }}
    >
      {action.label}
    </Button>
  );
}

/**
 * Presentational shell shared by every error/fallback screen. Must stay free
 * of API calls, auth state and heavy assets so it renders even when the rest
 * of the app is broken.
 */
export function ErrorPageLayout({
  title,
  description,
  code,
  illustrationSrc = DEFAULT_ERROR_ILLUSTRATION,
  primaryAction,
  secondaryAction,
  reference,
  children,
}: ErrorPageLayoutProps) {
  const primaryRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const [illustrationFailed, setIllustrationFailed] = useState(false);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        backgroundColor: colors.bgPrimary,
      }}
    >
      <Box
        component="main"
        sx={{
          // Grow, never shrink, so a tall message scrolls instead of
          // being squeezed by the footer.
          flex: "1 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          color: colors.textPrimary,
          fontFamily: `${fonts.body}, sans-serif`,
        }}
      >
        <Box
          role="alert"
          aria-labelledby="error-page-title"
          sx={{
            width: "100%",
            maxWidth: 520,
            textAlign: "center",
            p: { xs: 3, sm: 5 },
            backgroundColor: colors.bgSecondary,
            border: `2px solid ${colors.accentGold}`,
            borderRadius: `${radius.panel}px`,
            boxShadow: `0 0 0 4px ${colors.bgTertiary}`,
          }}
        >
          {!illustrationFailed && (
            <Box
              component="img"
              src={illustrationSrc}
              alt=""
              aria-hidden="true"
              width={ILLUSTRATION_SIZE}
              height={ILLUSTRATION_SIZE}
              onError={() => setIllustrationFailed(true)}
              sx={{
                display: "block",
                mx: "auto",
                mb: 2,
                imageRendering: "pixelated",
              }}
            />
          )}

          {code && (
            <Typography
              component="p"
              sx={{
                fontFamily: `${fonts.display}, sans-serif`,
                fontSize: 56,
                lineHeight: 1,
                color: colors.accentGold,
                mb: 1,
              }}
            >
              {code}
            </Typography>
          )}

          <Typography
            id="error-page-title"
            component="h1"
            sx={{
              fontFamily: `${fonts.display}, sans-serif`,
              fontSize: 32,
              color: colors.accentGold,
              mb: 2,
            }}
          >
            {title}
          </Typography>

          <Typography
            component="div"
            sx={{ fontSize: 16, lineHeight: 1.6, color: colors.textPrimary }}
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
                <ActionButton
                  action={primaryAction}
                  variant="primary"
                  autoFocusRef={primaryRef}
                />
              )}
              {secondaryAction && (
                <ActionButton action={secondaryAction} variant="secondary" />
              )}
            </Stack>
          )}

          {reference && (
            <Typography
              component="p"
              sx={{ mt: 3, fontSize: 12, color: colors.textSecondary }}
            >
              Código de referência: {reference}
            </Typography>
          )}
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}
