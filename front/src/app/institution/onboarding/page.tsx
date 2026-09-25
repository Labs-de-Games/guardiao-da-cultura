"use client";

import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { type FormEvent, useState } from "react";
import { hardNavigate } from "@/lib/hardNavigate";

const DASHBOARD_PATH = "/institution";
const SUBMIT_ERROR_MESSAGE =
  "Não foi possível concluir o cadastro. Tente novamente.";

/**
 * One-time step for a freshly-created institution account
 * (`institutionSlug === null`) — self-serve replacement for #744's
 * admin seed-script step (no admin role/workflow exists in this
 * project). middleware.ts redirects here whenever an institution session
 * has no slug yet, for any /institution/* route except this one.
 */
export default function InstitutionOnboardingPage() {
  const { update } = useSession();
  const [institutionName, setInstitutionName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let response: Response;
    try {
      response = await fetch("/api/institution/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionName }),
      });
    } catch {
      setError(SUBMIT_ERROR_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      setError(SUBMIT_ERROR_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    // Onboarding is idempotent: an already-onboarded account gets its
    // existing slug back too, so this update() also repairs a session
    // cookie that missed an earlier update.
    const data = (await response.json()) as { institutionSlug: string };
    try {
      await update({ institutionSlug: data.institutionSlug });
    } catch {
      // The name is saved server-side; a resubmit returns the same slug and
      // retries this update, so navigating on is still the right call.
    }
    // Full navigation, not router.push: a soft navigation can replay the
    // client router's cached "/institution → onboarding" redirect and keep
    // the stale SessionProvider session, leaving the user stuck here.
    hardNavigate(DASHBOARD_PATH);
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
