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
      showToast("Magic link sent to your email", "success");
    } catch {
      showToast("Failed to send magic link. Please try again.", "error");
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    try {
      await login({ email: submittedEmail });
      startCountdown();
      showToast("Magic link resent", "success");
    } catch {
      showToast("Failed to resend magic link.", "error");
    } finally {
      setIsResending(false);
    }
  };

  if (isEmailSent) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Check your email
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We sent a magic link to your email. Click the link to log in.
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
            `Resend in ${countdown}s`
          ) : (
            "Resend magic link"
          )}
        </Button>
        <Box sx={{ mt: 2 }}>
          <Link href="/register" variant="body2">
            Need an account? Register
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        fullWidth
        label="Email"
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
        {isSubmitting ? <CircularProgress size={24} /> : "Send Magic Link"}
      </Button>

      <Box sx={{ textAlign: "center" }}>
        <Link href="/register" variant="body2">
          Need an account? Register
        </Link>
      </Box>
    </Box>
  );
}
