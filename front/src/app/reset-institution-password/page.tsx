"use client";

import { LockOutlined } from "@mui/icons-material";
import {
  Alert,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthLink } from "@/components/auth/AuthLink";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { AuthSubtitle, AuthTitle } from "@/components/auth/AuthTitle";
import {
  fieldErrorSx,
  fieldSx,
  fieldValidSx,
  iconSx,
} from "@/components/auth/authStyles";
import { apiClient } from "@/lib/api/client";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/passwordPolicy";

function InvalidTokenView() {
  return (
    <>
      <AuthTitle>Link inválido</AuthTitle>
      <Alert severity="error" sx={{ borderRadius: "8px" }}>
        Link inválido ou inexistente.
      </Alert>
      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: "center", color: "#666" }}
      >
        <AuthLink href="/login">Voltar ao login</AuthLink>
      </Typography>
    </>
  );
}

function ResetDoneView() {
  return (
    <>
      <AuthTitle>Senha atualizada</AuthTitle>
      <Alert severity="success" sx={{ borderRadius: "8px", mb: 3 }}>
        Você já pode entrar com sua nova senha.
      </Alert>
      <Typography
        variant="body2"
        sx={{ mt: 2, textAlign: "center", color: "#666" }}
      >
        <AuthLink href="/login">Ir para o login</AuthLink>
      </Typography>
    </>
  );
}

interface ResetFormViewProps {
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
}

function ResetFormView({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  isSubmitting,
  onSubmit,
}: ResetFormViewProps) {
  const newPasswordTooShort =
    newPassword.length > 0 && newPassword.length < PASSWORD_MIN_LENGTH;
  const newPasswordValid =
    newPassword.length >= PASSWORD_MIN_LENGTH &&
    newPassword.length <= PASSWORD_MAX_LENGTH;
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const confirmValid =
    confirmPassword.length > 0 && !mismatch && newPasswordValid;

  return (
    <>
      <AuthTitle>Redefinir senha</AuthTitle>
      <AuthSubtitle>Informe sua nova senha abaixo.</AuthSubtitle>

      <AuthDivider />

      <Box
        component="form"
        onSubmit={onSubmit}
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
          error={newPasswordTooShort}
          helperText={
            newPasswordTooShort
              ? "A senha deve ter ao menos 12 caracteres."
              : "Use entre 12 e 128 caracteres."
          }
          slotProps={{
            htmlInput: { minLength: 12, maxLength: 128 },
            input: { startAdornment: <LockOutlined sx={iconSx} /> },
          }}
          sx={[
            fieldSx,
            newPasswordTooShort && fieldErrorSx,
            newPasswordValid && fieldValidSx,
          ]}
        />
        <TextField
          size="small"
          type="password"
          label="Confirmar nova senha"
          placeholder="Repita a senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          error={mismatch}
          helperText={
            mismatch
              ? "As senhas não coincidem."
              : "Repita a senha digitada acima."
          }
          slotProps={{
            htmlInput: { minLength: 12, maxLength: 128 },
            input: { startAdornment: <LockOutlined sx={iconSx} /> },
          }}
          sx={[fieldSx, mismatch && fieldErrorSx, confirmValid && fieldValidSx]}
        />
        {error ? (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : null}
        <AuthSubmitButton loading={isSubmitting}>
          Atualizar senha
        </AuthSubmitButton>
      </Box>

      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: "center", color: "#666" }}
      >
        <AuthLink href="/login">Voltar ao login</AuthLink>
      </Typography>
    </>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
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
    <AuthPageShell fillHeight>
      {!token ? (
        <InvalidTokenView />
      ) : done ? (
        <ResetDoneView />
      ) : (
        <ResetFormView
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      )}
    </AuthPageShell>
  );
}

/**
 * Password reset page — split layout (mascot + form card + footer).
 * No session required — user arrives via email link with a token.
 */
export default function ResetInstitutionPasswordPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
