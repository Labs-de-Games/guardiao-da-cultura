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
      showToast("Cadastro realizado. Agora veja seu e-mail!", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao realizar cadastro.";
      showToast(message, "error");
    }
  };

  if (isSubmitted) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Veja seu e-mail!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Em instantes, você vai receber um e-mail para confirmar sua conta. Clique no link dentro dele para para começar a jogar.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        fullWidth
        label="Digite o seu nome"
        margin="normal"
        error={!!errors.firstName}
        helperText={errors.firstName?.message}
        {...register("firstName")}
      />

      <TextField
        fullWidth
        label="Digite o seu sobrenome"
        margin="normal"
        error={!!errors.lastName}
        helperText={errors.lastName?.message}
        {...register("lastName")}
      />

      <TextField
        fullWidth
        label="Digite a sua data de nascimento"
        type="date"
        margin="normal"
        slotProps={{ inputLabel: { shrink: true } }}
        error={!!errors.dateOfBirth}
        helperText={errors.dateOfBirth?.message}
        {...register("dateOfBirth")}
      />

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

      <TextField
        fullWidth
        label="Digite o seu apelido"
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
        {isSubmitting ? <CircularProgress size={24} /> : "Criar minha conta"}
      </Button>

      <Box sx={{ textAlign: "center" }}>
        <Link href="/login" variant="body2">
          Eu já tenho uma conta. Quero acessar.
        </Link>
      </Box>
    </Box>
  );
}
