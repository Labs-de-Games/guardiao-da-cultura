"use client";

import { LockOutlined } from "@mui/icons-material";
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
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
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
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/password/reset/confirm", {
        token,
        newPassword,
      });
      setDone(true);
    } catch {
      setError("Link inválido ou expirado. Solicite um novo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
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
          {!token ? (
            <>
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
                Link inválido
              </Typography>
              <Alert severity="error" sx={{ borderRadius: "8px" }}>
                Link inválido ou inexistente.
              </Alert>
              <Typography
                variant="body2"
                sx={{ mt: 3, textAlign: "center", color: "#666" }}
              >
                <Link
                  href="/login"
                  style={{ color: "#6366f1", textDecoration: "none" }}
                >
                  Voltar ao login
                </Link>
              </Typography>
            </>
          ) : done ? (
            <>
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
                Senha atualizada
              </Typography>
              <Alert severity="success" sx={{ borderRadius: "8px", mb: 3 }}>
                Você já pode entrar com sua nova senha.
              </Alert>
              <Typography
                variant="body2"
                sx={{ mt: 2, textAlign: "center", color: "#666" }}
              >
                <Link
                  href="/login"
                  style={{ color: "#6366f1", textDecoration: "none" }}
                >
                  Ir para o login
                </Link>
              </Typography>
            </>
          ) : (
            <>
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
                Redefinir senha
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 2, textAlign: "center", color: "#4a4a4a" }}
              >
                Informe sua nova senha abaixo.
              </Typography>

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
                  type="password"
                  label="Nova senha"
                  placeholder="Mínimo de 12 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                    "Atualizar senha"
                  )}
                </Button>
              </Box>

              <Typography
                variant="body2"
                sx={{ mt: 3, textAlign: "center", color: "#666" }}
              >
                <Link
                  href="/login"
                  style={{ color: "#6366f1", textDecoration: "none" }}
                >
                  Voltar ao login
                </Link>
              </Typography>
            </>
          )}
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

/**
 * Password reset page — redesigned to match the Figma design
 * system (split layout with mascot + form card + footer). Moved out
 * of (auth) group to have its own full-viewport layout.
 *
 * No session required — user arrives via email link with a token.
 */
export default function ResetInstitutionPasswordPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
