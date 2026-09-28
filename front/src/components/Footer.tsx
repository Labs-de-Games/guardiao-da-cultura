import { Box, Typography } from "@mui/material";
import Image from "next/image";
import type { ReactNode } from "react";

interface FooterLogoProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  maxWidth: { xs: number; sm: number; lg: number };
}

function FooterLogo({ src, alt, width, height, maxWidth }: FooterLogoProps) {
  return (
    <Box sx={{ width: maxWidth }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ width: "100%", height: "auto", objectFit: "contain" }}
      />
    </Box>
  );
}

interface FooterLogoGroupProps {
  label: string;
  /** Label alignment over the row of logos. */
  align?: "flex-start" | "center";
  /** Grid placement: always centered when stacked, per column otherwise. */
  justifySelf: { xs: "center"; sm: "start" | "center" | "end" };
  children: ReactNode;
}

function FooterLogoGroup({
  label,
  align = "flex-start",
  justifySelf,
  children,
}: FooterLogoGroupProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        justifySelf,
      }}
    >
      <Typography
        variant="body1"
        sx={{ color: "custom.footerMutedText", mb: 0.5 }}
      >
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {children}
      </Box>
    </Box>
  );
}

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        background: "#1a1a1a",
        py: 2,
        px: { xs: 3, md: 8 },
        // Equal side columns keep the partner group centered even though
        // the side logos differ in width.
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr auto 1fr" },
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box sx={{ justifySelf: { xs: "center", sm: "start" } }}>
        <FooterLogo
          src="/images/auth/logo-lei-rouanet.png"
          alt="Lei Rouanet"
          width={260}
          height={65}
          maxWidth={{ xs: 140, sm: 180, lg: 260 }}
        />
      </Box>
      <FooterLogoGroup
        label="Parceiro"
        align="center"
        justifySelf={{ xs: "center", sm: "center" }}
      >
        <FooterLogo
          src="/images/auth/logo-galp.png"
          alt="Galp"
          width={180}
          height={60}
          maxWidth={{ xs: 100, sm: 130, lg: 180 }}
        />
        <FooterLogo
          src="/images/auth/logo-bemobi.png"
          alt="Bemobi"
          width={1020}
          height={183}
          maxWidth={{ xs: 120, sm: 160, lg: 240 }}
        />
      </FooterLogoGroup>
      <FooterLogoGroup
        label="Realização"
        justifySelf={{ xs: "center", sm: "end" }}
      >
        <FooterLogo
          src="/images/auth/logo-minc.png"
          alt="Ministério da Cultura / Governo do Brasil"
          width={300}
          height={75}
          maxWidth={{ xs: 160, sm: 210, lg: 300 }}
        />
      </FooterLogoGroup>
    </Box>
  );
}
