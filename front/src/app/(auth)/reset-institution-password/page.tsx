"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiClient } from "@/lib/api/client";

/**
 * Deliberately outside /institution/* (#747): that layout's
 * InstitutionGuard requires an authenticated session, but whoever clicks
 * a password-reset email link is, by definition, not signed in yet.
 */
function ResetInstitutionPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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

  if (!token) {
    return <Alert severity="error">Link inválido ou inexistente.</Alert>;
  }

  if (done) {
    return (
      <Alert severity="success">
        Senha atualizada. Você já pode entrar em /login.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Redefinir senha
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          type="password"
          label="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          slotProps={{ htmlInput: { minLength: 12 } }}
          required
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : "Atualizar senha"}
        </Button>
      </Box>
    </Box>
  );
}

export default function ResetInstitutionPasswordPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ResetInstitutionPasswordContent />
    </Suspense>
  );
}
