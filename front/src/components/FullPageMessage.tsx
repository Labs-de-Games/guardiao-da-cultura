import { Box, Typography } from "@mui/material";
import Image from "next/image";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";

interface FullPageMessageProps {
  imageSrc: string;
  title: string;
  children: ReactNode;
}

/** Bare full-viewport illustration + message + footer, no nav — shared by app/error.tsx and OfflineGate. */
export function FullPageMessage({
  imageSrc,
  title,
  children,
}: FullPageMessageProps) {
  return (
    // Scrolls itself: the root layout locks body scroll for the game.
    <Box
      sx={{
        height: "100dvh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 3,
          py: 6,
          textAlign: "center",
          bgcolor: "background.default",
        }}
      >
        <Image
          src={imageSrc}
          alt=""
          width={210}
          height={115}
          style={{ objectFit: "contain" }}
        />
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "text.primary" }}
        >
          {title}
        </Typography>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
