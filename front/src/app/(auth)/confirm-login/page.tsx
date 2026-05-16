"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/lib/auth/useAuth";

function ConfirmLoginContent() {
  const searchParams = useSearchParams();
  const _router = useRouter();
  const { confirmLogin } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Passe inválido ou inexistente.");
    }
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      await confirmLogin({ token });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao confirmar acesso";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !token) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Confirmar acesso
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Clique no botão abaixo para acessar.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        onClick={handleConfirm}
        disabled={isLoading || !token}
        fullWidth
      >
        {isLoading ? <CircularProgress size={24} /> : "Confirmar acesso"}
      </Button>
    </Box>
  );
}

export default function ConfirmLoginPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <ConfirmLoginContent />
    </Suspense>
  );
}
