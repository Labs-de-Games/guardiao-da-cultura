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
import { type RegisterFormData, registerSchema } from "@/lib/auth/validation";

export default function RegisterForm() {
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      setIsSubmitted(true);
      showToast("Registration successful. Check your email!", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      showToast(message, "error");
    }
  };

  if (isSubmitted) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Check your email
        </Typography>
        <Typography variant="body1" color="text.secondary">
          We sent a verification link to your email. Click it to verify your
          account and start playing.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        fullWidth
        label="First Name"
        margin="normal"
        error={!!errors.firstName}
        helperText={errors.firstName?.message}
        {...register("firstName")}
      />

      <TextField
        fullWidth
        label="Last Name"
        margin="normal"
        error={!!errors.lastName}
        helperText={errors.lastName?.message}
        {...register("lastName")}
      />

      <TextField
        fullWidth
        label="Date of Birth"
        type="date"
        margin="normal"
        slotProps={{ inputLabel: { shrink: true } }}
        error={!!errors.dateOfBirth}
        helperText={errors.dateOfBirth?.message}
        {...register("dateOfBirth")}
      />

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

      <TextField
        fullWidth
        label="Nickname"
        autoComplete="username"
        margin="normal"
        error={!!errors.nickname}
        helperText={errors.nickname?.message}
        {...register("nickname")}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting}
        sx={{ mt: 2, mb: 2 }}
      >
        {isSubmitting ? <CircularProgress size={24} /> : "Create Account"}
      </Button>

      <Box sx={{ textAlign: "center" }}>
        <Link href="/login" variant="body2">
          Already have an account? Log in
        </Link>
      </Box>
    </Box>
  );
}
