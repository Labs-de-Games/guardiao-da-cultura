"use client";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { Footer } from "@/components/Footer";

export default function PlayLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enteredAtRef = useRef<number>(Date.now());

  useEffect(() => {
    // referrer: issue #741's dual-emit table asks for it specifically on
    // this event (the funnel's first step). Empty string for direct
    // visits/new tabs is a legitimate value, not omitted.
    posthog.capture("landing_page_viewed", {
      referrer: document.referrer,
    });
    const enteredAt = enteredAtRef.current;

    // The effect-cleanup capture below only fires on unmount, which is
    // unreliable on real navigations (tab close, back/forward cache, a
    // hard reload) — the browser can tear the page down without React
    // ever running cleanup. pagehide/visibilitychange fire in those cases
    // too, so the dwell-time capture is duplicated onto both, guarded by a
    // single-fire flag. See discovery §5.2.
    let sent = false;
    const sendDwellTime = () => {
      if (sent) return;
      sent = true;
      posthog.capture("landing_page_dwell_time", {
        dwell_ms: Date.now() - enteredAt,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendDwellTime();
    };

    window.addEventListener("pagehide", sendDwellTime);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", sendDwellTime);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sendDwellTime();
    };
  }, []);

  const handlePlay = () => {
    // Legacy — unchanged.
    posthog.capture("landing_page_play_clicked");
    // Canonical funnel step (step 2 of 7) — see the edital onepager
    // (#739). dwell_ms per issue #741's dual-emit
    // table ("+ dwell_ms").
    posthog.capture("play_clicked", {
      dwell_ms: Date.now() - enteredAtRef.current,
    });
    const query = searchParams.toString();
    router.push(query ? `/game?${query}` : "/game");
  };

  return (
    // body is height: 100vh + overflow: hidden (app/layout.tsx), so the hero
    // shrinks to leave room for the footer instead of pushing it off-screen.
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <Box
        component="main"
        sx={{
          position: "relative",
          flex: "1 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          bgcolor: "#252726",
          backgroundImage:
            "linear-gradient(rgba(31, 20, 10, 0.35), rgba(31, 20, 10, 0.72)), url('/assets/misc/map.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 28%, rgba(42, 28, 16, 0.58) 100%)",
          }}
        />

        <Stack
          spacing={2}
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 900,
            px: 3,
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: '"Jockey One", sans-serif',
              fontSize: { xs: "3rem", sm: "4.5rem", lg: "5.5rem" },
              lineHeight: 0.98,
              color: "#FFFFFF",
              textShadow:
                "2px 2px 0 #2A1C10, 4px 4px 18px rgba(0,0,0,0.55), 0 0 30px rgba(212,165,87,0.25)",
            }}
          >
            Guardião da Cultura
          </Typography>

          <Typography
            sx={{
              maxWidth: 420,
              fontFamily: '"Inter", sans-serif',
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              fontWeight: 500,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#FFFFFF",
            }}
          >
            Uma missão pelo patrimônio brasileiro
          </Typography>

          <Button
            type="button"
            onClick={handlePlay}
            startIcon={<PlayArrowRoundedIcon sx={{ fontSize: 28 }} />}
            sx={{
              mt: 3,
              px: 5,
              py: 2,
              borderRadius: "16px",
              bgcolor: "#AF7E2F",
              color: "#FFFFFF",
              fontFamily: '"Jockey One", sans-serif',
              fontSize: { xs: "1.5rem", sm: "1.875rem" },
              letterSpacing: "0.06em",
              textTransform: "none",
              boxShadow:
                "0 0 0 2px #D9AD56, 6px 6px 0 0 #2A1C10, 0 0 30px rgba(212,165,87,0.45)",
              "&:hover": {
                bgcolor: "#D9AD56",
                transform: "translateY(-2px)",
              },
            }}
          >
            Jogar
          </Button>
        </Stack>
      </Box>
      <Footer />
    </Box>
  );
}
