"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/lib/auth/useAuth";
import { type LoginFormData, loginSchema } from "@/lib/auth/validation";

export default function LoginForm() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      setSubmittedEmail(data.email);
      setIsEmailSent(true);
      startCountdown();
      showToast("Link de acesso enviado!", "success");
    } catch {
      showToast("Não foi possível enviar o link de acesso.", "error");
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    try {
      await login({ email: submittedEmail });
      startCountdown();
      showToast("Link de acesso enviado!", "success");
    } catch {
      showToast("Não foi possível reenviar o link de acesso.", "error");
    } finally {
      setIsResending(false);
    }
  };

  if (isEmailSent) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Veja seu e-mail!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Enviamos um link de acesso para o seu e-mail. Clique no link para
          jogar.
        </Typography>
        <Button
          variant="outlined"
          onClick={handleResend}
          disabled={countdown > 0 || isResending}
          fullWidth
        >
          {isResending ? (
            <CircularProgress size={20} />
          ) : countdown > 0 ? (
            `Tente reenviar em ${countdown} s.`
          ) : (
            "Reenviar link por e-mail"
          )}
        </Button>
        <Box sx={{ mt: 2 }}>
          <Link href="/register" variant="body2">
            Ainda não tem conta? Crie uma agora mesmo!
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        fullWidth
        label="Digite o seu e-mail"
        type="email"
        autoComplete="email"
        margin="normal"
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register("email")}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting}
        sx={{ mt: 2, mb: 2 }}
      >
        {isSubmitting ? (
          <CircularProgress size={24} />
        ) : (
          "Receber link de acesso por e-mail"
        )}
      </Button>

      <Box sx={{ textAlign: "center" }}>
        <Link href="/register" variant="body2">
          Ainda não tem conta? Crie uma agora mesmo!
        </Link>
      </Box>
    </Box>
  );
}
