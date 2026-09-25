import { Box, Typography } from "@mui/material";
import Image from "next/image";

/** Sponsor-logo footer, identical on login/register/reset. */
export function AuthFooter() {
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
      <Image
        src="/images/auth/logo-lei-rouanet.png"
        alt="Lei Rouanet"
        width={260}
        height={65}
        style={{ objectFit: "contain" }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Typography
          variant="body1"
          sx={{ color: "rgba(255,255,255,0.6)", mb: 0.5, ml: 3.5 }}
        >
          Parceiro
        </Typography>
        <Image
          src="/images/auth/logo-galp.png"
          alt="Galp"
          width={180}
          height={60}
          style={{ objectFit: "contain", display: "block" }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Typography
          variant="body1"
          sx={{ color: "rgba(255,255,255,0.6)", mb: 0.5, ml: 4 }}
        >
          Realização
        </Typography>
        <Image
          src="/images/auth/logo-minc.png"
          alt="Ministério da Cultura / Governo do Brasil"
          width={300}
          height={75}
          style={{ objectFit: "contain", display: "block" }}
        />
      </Box>
    </Box>
  );
}
