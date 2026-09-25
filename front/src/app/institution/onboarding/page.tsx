"use client";

import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type FormEvent, useState } from "react";

/**
 * One-time step for a freshly-created institution account
 * (`institutionSlug === null`) — self-serve replacement for #744's
 * admin seed-script step (no admin role/workflow exists in this
 * project). middleware.ts redirects here whenever an institution session
 * has no slug yet, for any /institution/* route except this one.
 */
export default function InstitutionOnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [institutionName, setInstitutionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/institution/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionName }),
      });
      if (!response.ok) {
        setError("Não foi possível concluir o cadastro. Tente novamente.");
        return;
      }
      const data = (await response.json()) as { institutionSlug: string };
      await update({ institutionSlug: data.institutionSlug });
      router.push("/institution");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Complete o cadastro da instituição
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        Informe o nome da instituição para acessar o painel.
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <TextField
          size="small"
          label="Nome da instituição"
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          required
        />
        {error ? (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : null}
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          Continuar
        </Button>
      </Box>
    </Box>
  );
}
