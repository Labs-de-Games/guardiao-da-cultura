"use client";

import { Box, Button, Divider, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

/**
 * Institution sign-in section (#747). Lives on the shared /login page
 * alongside the legacy player magic-link flow (LoginForm) — before this,
 * an institution user landing here (via middleware or auth.config.ts's
 * pages.signIn: "/login") had no way to authenticate at all.
 */
export default function InstitutionSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
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

  return (
    <Box sx={{ mt: 4, width: "100%", maxWidth: 400 }}>
      <Divider sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Área da instituição
        </Typography>
      </Divider>

      <Button
        fullWidth
        variant="outlined"
        onClick={() => signIn("google", { callbackUrl: "/institution" })}
        sx={{ mb: 2 }}
      >
        Entrar com Google
      </Button>

      <Box
        component="form"
        onSubmit={handlePasswordSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          size="small"
          type="email"
          label="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          size="small"
          type="password"
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          Entrar
        </Button>
      </Box>
    </Box>
  );
}
