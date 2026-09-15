"use client";

import { EmailOutlined, LockOutlined } from "@mui/icons-material";
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
import { useRouter } from "next/navigation";
import { SessionProvider, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiClient } from "@/lib/api/client";

const TOAST_STORAGE_KEY = "app.toast.next";

function consumeForceLogoutToastFromSessionStorage(): {
  message?: string;
  severity?: "success" | "error" | "warning" | "info";
} | null {
  try {
    const raw = sessionStorage.getItem(TOAST_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(TOAST_STORAGE_KEY);
    return JSON.parse(raw) as {
      message?: string;
      severity?: "success" | "error" | "warning" | "info";
    };
  } catch {
    return null;
  }
}

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

function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";
    const parsed = consumeForceLogoutToastFromSessionStorage();
    if (parsed?.message) showToast(parsed.message, parsed.severity ?? "info");
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showToast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("E-mail ou senha inválidos.");
        return;
      }
      router.push("/institution");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/password/reset/request", { email });
      setView("forgot-sent");
    } catch {
      setError("Não foi possível enviar o link. Tente novamente.");
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
      {/* Main content: split layout */}
      <Box
        sx={{
          ...(view !== "login" ? { flex: 1 } : {}),
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
          {view === "login" ? (
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
                Entrar
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 2, textAlign: "center", color: "#4a4a4a" }}
              >
                Acesse sua conta para continuar.
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

              <Button
                fullWidth
                variant="outlined"
                onClick={() =>
                  signIn("google", { callbackUrl: "/institution" })
                }
                sx={{
                  mb: 2,
                  py: 1.5,
                  borderRadius: "8px",
                  borderColor: "#1a1a1a",
                  color: "#1a1a1a",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    borderColor: "#333",
                    background: "rgba(0,0,0,0.04)",
                  },
                }}
              >
                Entrar com Google
              </Button>

              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
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
                  type="password"
                  label="Senha"
                  placeholder="Mínimo de 12 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  slotProps={{
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
                    "Entrar"
                  )}
                </Button>
              </Box>

              <Typography
                variant="body2"
                sx={{ mt: 3, textAlign: "center", color: "#666" }}
              >
                Não tem uma conta?{" "}
                <Link
                  href="/register"
                  style={{ color: "#6366f1", textDecoration: "none" }}
                >
                  Cadastre-se
                </Link>
              </Typography>

              <Box sx={{ textAlign: "center" }}>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setView("forgot");
                    setError(null);
                  }}
                  style={{
                    color: "#6366f1",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                  }}
                >
                  Esqueci minha senha
                </Link>
              </Box>
            </>
          ) : view === "forgot" ? (
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
                Esqueci minha senha
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 3, textAlign: "center", color: "#4a4a4a" }}
              >
                Informe seu e-mail para receber um link de redefinição.
              </Typography>

              <Box
                component="form"
                onSubmit={handleForgotSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
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
                    "Enviar link"
                  )}
                </Button>
              </Box>

              <Typography
                variant="body2"
                sx={{ mt: 3, textAlign: "center", color: "#666" }}
              >
                Lembrou sua senha?{" "}
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setView("login");
                    setError(null);
                  }}
                  style={{ color: "#6366f1", textDecoration: "none" }}
                >
                  Voltar ao login
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
                E-mail enviado
              </Typography>
              <Alert severity="success" sx={{ borderRadius: "8px", mb: 3 }}>
                Verifique seu e-mail para redefinir sua senha.
              </Alert>
              <Typography
                variant="body2"
                sx={{ mt: 2, textAlign: "center", color: "#666" }}
              >
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setView("login");
                    setError(null);
                  }}
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
 * Institution sign-in page — redesigned to match the Figma design
 * system (split layout with mascot + form card + footer). Moved out
 * of (auth) group to have its own full-viewport layout.
 *
 * Auth logic: next-auth signIn (credentials + Google).
 */
export default function LoginPage() {
  return (
    <SessionProvider>
      <LoginForm />
    </SessionProvider>
  );
}
