"use client";

import {
  AlternateEmail,
  EmailOutlined,
  LockOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

const fieldSx = {
  "& .MuiInputLabel-root": { color: "#1a1a1a" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#1a1a1a" },
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    background: "#faf6ef",
    "& fieldset": { borderColor: "#c4c0b8" },
    "&:hover fieldset": { borderColor: "#1a1a1a" },
    "&.Mui-focused fieldset": { borderColor: "#1a1a1a" },
  },
  "& .MuiInputBase-input": { color: "#1a1a1a" },
  "& .MuiFormHelperText-root": { color: "#666" },
} as const;

const iconSx = { color: "#1a1a1a", mr: 1, fontSize: 20 } as const;

/**
 * Institution registration page — redesigned to match the Figma design
 * system (Login component style). Moved out of (auth) group to have its
 * own full-viewport split layout without affecting login/reset-password.
 *
 * Backend fields: email, password, institutionSlug, nickname.
 */
export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionSlug, setInstitutionSlug] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/password/register", {
        email,
        password,
        institutionSlug,
        nickname,
      });
      setDone(true);
    } catch {
      setError(
        "Falha ao completar cadastro. Verifique os dados e tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f0e8",
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: "center" }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Cadastro realizado. Verifique seu e-mail.
          </Alert>
          <Button component={Link} href="/login" variant="contained">
            Ir para o login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Main content: split layout */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "safe center",
          justifyContent: "center",
          gap: { xs: 4, md: 10 },
          px: { xs: 3, md: 8 },
          py: { xs: 4, md: 6 },
          background: "#f5f0e8",
        }}
      >
        {/* Left side — mascot illustration */}
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
          {/* Brazil map background */}
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
          {/* Mascot */}
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

        {/* Right side — form card */}
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 480,
            background: "#faf6ef",
            border: "4px solid #1a1a1a",
            borderRadius: "16px",
            p: { xs: 3, sm: 5 },
            flexShrink: 0,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 1,
              fontWeight: 700,
              fontFamily: "'Jockey One', sans-serif",
              textAlign: "center",
              color: "#1a1a1a",
            }}
          >
            Cadastre-se
          </Typography>
          <Typography
            variant="body1"
            sx={{ mb: 2, textAlign: "center", color: "#4a4a4a" }}
          >
            Preencha os campos abaixo para começar a jogar.
          </Typography>

          {/* Divider with diamond */}
          <Divider
            sx={{
              mb: 3,
              "&::before, &::after": {
                borderColor: "#1a1a1a",
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#1a1a1a", fontSize: "0.7rem", px: 1 }}
            >
              ◆
            </Typography>
          </Divider>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <TextField
              size="small"
              label="Nome da instituição"
              placeholder="Escreva o nome da instituição"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              slotProps={{
                input: {
                  startAdornment: <PersonOutlined sx={iconSx} />,
                },
              }}
              sx={fieldSx}
            />

            <TextField
              size="small"
              type="email"
              label="E-mail"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              slotProps={{
                input: {
                  startAdornment: <EmailOutlined sx={iconSx} />,
                },
              }}
              sx={fieldSx}
            />

            <TextField
              size="small"
              label="Slug da instituição"
              placeholder="escola-municipal-centro"
              value={institutionSlug}
              onChange={(e) => setInstitutionSlug(e.target.value)}
              helperText="Apenas letras minúsculas, números e hífens."
              required
              slotProps={{
                input: {
                  startAdornment: <AlternateEmail sx={iconSx} />,
                },
              }}
              sx={fieldSx}
            />

            <TextField
              size="small"
              type="password"
              label="Senha"
              placeholder="Mínimo de 12 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Mínimo de 12 caracteres."
              required
              slotProps={{
                htmlInput: { minLength: 12 },
                input: {
                  startAdornment: <LockOutlined sx={iconSx} />,
                },
              }}
              sx={fieldSx}
            />

            {error ? (
              <Alert severity="error" sx={{ borderRadius: "8px" }}>
                {error}
              </Alert>
            ) : null}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              sx={{
                mt: 1,
                py: 1.5,
                borderRadius: "8px",
                fontWeight: 600,
                textTransform: "none",
                fontSize: "1rem",
                background: "#1a1a1a",
                "&:hover": { background: "#333" },
                "&.Mui-disabled": { background: "#9e9e9e", color: "#fff" },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Cadastrar"
              )}
            </Button>
          </Box>

          <Typography
            variant="body2"
            sx={{ mt: 3, textAlign: "center", color: "#666" }}
          >
            Já tem uma conta?{" "}
            <Link
              href="/login"
              style={{ color: "#6366f1", textDecoration: "none" }}
            >
              Entrar
            </Link>
          </Typography>
        </Paper>
      </Box>

      {/* Footer */}
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
    </Box>
  );
}
