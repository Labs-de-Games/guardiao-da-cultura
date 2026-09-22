"use client";

import {
  AlternateEmail,
  EmailOutlined,
  LockOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import { Alert, Box, TextField, Typography } from "@mui/material";
import { type FormEvent, useEffect, useState } from "react";
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

const NICKNAME_MAX_LENGTH = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mirrors back's INSTITUTION_SLUG_PATTERN / front's ORIGIN_SLUG_PATTERN — duplicated on purpose (no shared package). */
const INSTITUTION_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const INSTITUTION_SLUG_MAX_LENGTH = 64;

/**
 * Institution registration page — split layout (mascot + form card + footer).
 * Backend fields: email, password, institutionSlug, nickname.
 */
export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [institutionSlug, setInstitutionSlug] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const nicknameValid =
    nickname.length > 0 && nickname.length <= NICKNAME_MAX_LENGTH;
  const emailInvalid = email.length > 0 && !EMAIL_PATTERN.test(email);
  const emailValid = EMAIL_PATTERN.test(email);
  const institutionSlugInvalid =
    institutionSlug.length > 0 &&
    (!INSTITUTION_SLUG_PATTERN.test(institutionSlug) ||
      institutionSlug.length > INSTITUTION_SLUG_MAX_LENGTH);
  const institutionSlugValid =
    INSTITUTION_SLUG_PATTERN.test(institutionSlug) &&
    institutionSlug.length <= INSTITUTION_SLUG_MAX_LENGTH;
  const passwordTooShort =
    password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const passwordValid =
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH;
  const confirmMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const confirmValid =
    confirmPassword.length > 0 && !confirmMismatch && passwordValid;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
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
      <AuthPageShell fillHeight>
        <AuthTitle>Cadastro realizado</AuthTitle>
        <Alert severity="success" sx={{ borderRadius: "8px", mb: 3 }}>
          Cadastro realizado. Verifique seu e-mail para confirmar sua conta.
        </Alert>
        <Typography variant="body2" sx={{ textAlign: "center", color: "#666" }}>
          <AuthLink href="/login">Ir para o login</AuthLink>
        </Typography>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell fillHeight>
      <AuthTitle>Cadastre-se</AuthTitle>
      <AuthSubtitle>
        Preencha os campos abaixo para começar a jogar.
      </AuthSubtitle>

      <AuthDivider />

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
            htmlInput: { maxLength: NICKNAME_MAX_LENGTH },
            input: { startAdornment: <PersonOutlined sx={iconSx} /> },
          }}
          sx={[fieldSx, nicknameValid && fieldValidSx]}
        />
        <TextField
          size="small"
          type="email"
          label="E-mail"
          placeholder="exemplo@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={emailInvalid}
          helperText={emailInvalid ? "E-mail inválido." : " "}
          slotProps={{
            input: { startAdornment: <EmailOutlined sx={iconSx} /> },
          }}
          sx={[
            fieldSx,
            emailInvalid && fieldErrorSx,
            emailValid && fieldValidSx,
          ]}
        />
        <TextField
          size="small"
          label="Slug da instituição"
          placeholder="escola-municipal-centro"
          value={institutionSlug}
          onChange={(e) => setInstitutionSlug(e.target.value)}
          error={institutionSlugInvalid}
          helperText={
            institutionSlugInvalid
              ? "Apenas letras minúsculas, números e hífens (máx. 64 caracteres)."
              : "Apenas letras minúsculas, números e hífens."
          }
          required
          slotProps={{
            htmlInput: { maxLength: INSTITUTION_SLUG_MAX_LENGTH },
            input: { startAdornment: <AlternateEmail sx={iconSx} /> },
          }}
          sx={[
            fieldSx,
            institutionSlugInvalid && fieldErrorSx,
            institutionSlugValid && fieldValidSx,
          ]}
        />
        <TextField
          size="small"
          type="password"
          label="Senha"
          placeholder="Mínimo de 12 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordTooShort}
          helperText={
            passwordTooShort
              ? "A senha deve ter ao menos 12 caracteres."
              : "Use entre 12 e 128 caracteres."
          }
          required
          slotProps={{
            htmlInput: { minLength: 12, maxLength: 128 },
            input: { startAdornment: <LockOutlined sx={iconSx} /> },
          }}
          sx={[
            fieldSx,
            passwordTooShort && fieldErrorSx,
            passwordValid && fieldValidSx,
          ]}
        />
        <TextField
          size="small"
          type="password"
          label="Confirmar senha"
          placeholder="Repita a senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmMismatch}
          helperText={
            confirmMismatch
              ? "As senhas não coincidem."
              : "Repita a senha digitada acima."
          }
          required
          slotProps={{
            htmlInput: { minLength: 12, maxLength: 128 },
            input: { startAdornment: <LockOutlined sx={iconSx} /> },
          }}
          sx={[
            fieldSx,
            confirmMismatch && fieldErrorSx,
            confirmValid && fieldValidSx,
          ]}
        />
        {error ? (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : null}
        <AuthSubmitButton loading={isSubmitting}>Cadastrar</AuthSubmitButton>
      </Box>

      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: "center", color: "#666" }}
      >
        Já tem uma conta? <AuthLink href="/login">Entrar</AuthLink>
      </Typography>
    </AuthPageShell>
  );
}
