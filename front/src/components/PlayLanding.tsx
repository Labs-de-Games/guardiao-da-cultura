"use client";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";

export default function PlayLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePlay = () => {
    const query = searchParams.toString();
    router.push(query ? `/game?${query}` : "/game");
  };

  return (
    <Box
      component="main"
      sx={{
        position: "relative",
        minHeight: "100vh",
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
  );
}
