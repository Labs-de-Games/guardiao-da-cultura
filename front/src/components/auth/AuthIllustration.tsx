import { Box } from "@mui/material";
import Image from "next/image";

/** Left-column mascot + Brazil-map illustration, identical on login/register/reset. */
export function AuthIllustration() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: { xs: "100%", md: "50%" },
        maxWidth: 520,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.8,
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/auth/mapa-br.png"
          alt=""
          width={480}
          height={480}
          style={{ objectFit: "contain" }}
        />
      </Box>
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Image
          src="/images/auth/logo-jogo.png"
          alt="Guardião das Culturas"
          width={400}
          height={400}
          style={{ objectFit: "contain" }}
          priority
        />
      </Box>
    </Box>
  );
}
