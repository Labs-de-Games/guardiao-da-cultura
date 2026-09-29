"use client";

import { EmailOutlined, LockOutlined } from "@mui/icons-material";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionProvider, signIn } from "next-auth/react";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthLink } from "@/components/auth/AuthLink";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthSubtitle, AuthTitle } from "@/components/auth/AuthTitle";
import { fieldSx, iconSx } from "@/components/auth/authStyles";
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

type View = "login" | "forgot" | "forgot-sent";

interface LoginViewProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onForgotClick: () => void;
  callbackUrl: string;
}

function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  error,
  isSubmitting,
  onSubmit,
  onForgotClick,
  callbackUrl,
}: LoginViewProps) {
  return (
    <>
      <AuthTitle>Entrar</AuthTitle>
      <AuthSubtitle>Acesse sua conta para continuar.</AuthSubtitle>

      <AuthDivider />

      <Button
        fullWidth
        variant="outlined"
        onClick={() => signIn("google", { callbackUrl })}
        sx={{
          mb: 2,
          py: 1.5,
          borderRadius: "8px",
          borderColor: "#1a1a1a",
          color: "#1a1a1a",
          textTransform: "none",
          fontWeight: 600,
          "&:hover": { borderColor: "#333", background: "rgba(0,0,0,0.04)" },
        }}
      >
        Entrar com Google
      </Button>

      <Box
        component="form"
        onSubmit={onSubmit}
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
            input: { startAdornment: <EmailOutlined sx={iconSx} /> },
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
            input: { startAdornment: <LockOutlined sx={iconSx} /> },
          }}
          sx={fieldSx}
        />
        {error ? (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : null}
        <AuthSubmitButton loading={isSubmitting}>Entrar</AuthSubmitButton>
      </Box>

      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: "center", color: "#666" }}
      >
        Não tem uma conta? <AuthLink href="/register">Cadastre-se</AuthLink>
      </Typography>

      <Box sx={{ textAlign: "center" }}>
        <AuthLink
          href="#"
          fontSize="0.875rem"
          onClick={(e) => {
            e.preventDefault();
            onForgotClick();
          }}
        >
          Esqueci minha senha
        </AuthLink>
      </Box>
    </>
  );
}

interface ForgotViewProps {
  email: string;
  setEmail: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onBackClick: () => void;
}

function ForgotView({
  email,
  setEmail,
  error,
  isSubmitting,
  onSubmit,
  onBackClick,
}: ForgotViewProps) {
  return (
    <>
      <AuthTitle>Esqueci minha senha</AuthTitle>
      <AuthSubtitle mb={3}>
        Informe seu e-mail para receber um link de redefinição.
      </AuthSubtitle>

      <Box
        component="form"
        onSubmit={onSubmit}
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
            input: { startAdornment: <EmailOutlined sx={iconSx} /> },
          }}
          sx={fieldSx}
        />
        {error ? (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : null}
        <AuthSubmitButton loading={isSubmitting}>Enviar link</AuthSubmitButton>
      </Box>

      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: "center", color: "#666" }}
      >
        Lembrou sua senha?{" "}
        <AuthLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBackClick();
          }}
        >
          Voltar ao login
        </AuthLink>
      </Typography>
    </>
  );
}

function ForgotSentView({ onBackClick }: { onBackClick: () => void }) {
  return (
    <>
      <AuthTitle>E-mail enviado</AuthTitle>
      <Alert severity="success" sx={{ borderRadius: "8px", mb: 3 }}>
        Verifique seu e-mail para redefinir sua senha.
      </Alert>
      <Typography
        variant="body2"
        sx={{ mt: 2, textAlign: "center", color: "#666" }}
      >
        <AuthLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBackClick();
          }}
        >
          Voltar ao login
        </AuthLink>
      </Typography>
    </>
  );
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  EmailConflict:
    "Este e-mail já está cadastrado como conta de jogador. Use outro e-mail para entrar como instituição.",
};

/**
 * middleware.ts sets `?redirect=` to the institution route it bounced the
 * user from. Only accept it back as a same-origin path under
 * `/institution` — the one thing this app gates — never an absolute URL
 * or protocol-relative `//host` value, which would turn this into an
 * open redirect.
 */
function safeRedirectTarget(raw: string | null): string {
  if (!raw?.startsWith("/institution") || raw.startsWith("//")) {
    return "/institution";
  }
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [view, setView] = useState<View>("login");
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

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(
        OAUTH_ERROR_MESSAGES[oauthError] ??
          "Não foi possível entrar com o Google.",
      );
      router.replace("/login");
    }
  }, [searchParams, router]);

  function goToView(next: View) {
    setView(next);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
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
      router.push(safeRedirectTarget(searchParams.get("redirect")));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
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
    <AuthPageShell fillHeight>
      {view === "login" ? (
        <LoginView
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onForgotClick={() => goToView("forgot")}
          callbackUrl={safeRedirectTarget(searchParams.get("redirect"))}
        />
      ) : view === "forgot" ? (
        <ForgotView
          email={email}
          setEmail={setEmail}
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={handleForgotSubmit}
          onBackClick={() => goToView("login")}
        />
      ) : (
        <ForgotSentView onBackClick={() => goToView("login")} />
      )}
    </AuthPageShell>
  );
}

/**
 * Institution sign-in page — split layout (mascot + form card + footer).
 * Auth logic: next-auth signIn (credentials + Google).
 */
export default function LoginPage() {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </SessionProvider>
  );
}
