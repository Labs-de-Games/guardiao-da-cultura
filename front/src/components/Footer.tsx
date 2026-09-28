import { Box, Typography } from "@mui/material";
import Image from "next/image";

interface FooterLogoGroupProps {
  label: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  maxWidth: { xs: number; sm: number; md: number };
}

function FooterLogoGroup({
  label,
  src,
  alt,
  width,
  height,
  maxWidth,
}: FooterLogoGroupProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <Typography
        variant="body1"
        sx={{ color: "custom.footerMutedText", mb: 0.5 }}
      >
        {label}
      </Typography>
      <Box sx={{ width: maxWidth }}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          style={{ width: "100%", height: "auto", objectFit: "contain" }}
        />
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
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ width: { xs: 140, sm: 180, md: 260 } }}>
        <Image
          src="/images/auth/logo-lei-rouanet.png"
          alt="Lei Rouanet"
          width={260}
          height={65}
          style={{ width: "100%", height: "auto", objectFit: "contain" }}
        />
      </Box>
      <FooterLogoGroup
        label="Parceiro"
        src="/images/auth/logo-galp.png"
        alt="Galp"
        width={180}
        height={60}
        maxWidth={{ xs: 100, sm: 130, md: 180 }}
      />
      <FooterLogoGroup
        label="Patrocínio"
        src="/images/auth/logo-bemobi.png"
        alt="Bemobi"
        width={1020}
        height={183}
        maxWidth={{ xs: 120, sm: 160, md: 240 }}
      />
      <FooterLogoGroup
        label="Realização"
        src="/images/auth/logo-minc.png"
        alt="Ministério da Cultura / Governo do Brasil"
        width={300}
        height={75}
        maxWidth={{ xs: 160, sm: 210, md: 300 }}
      />
    </Box>
  );
}
