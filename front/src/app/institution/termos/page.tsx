"use client";

import { Alert, Box, Button, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { type FormEvent, useState } from "react";
import { TermsAcceptance } from "@/components/auth/TermsAcceptance";
import { INSTITUTION_TERMS_VERSION } from "@/lib/consent/institutionTerms";
import { hardNavigate } from "@/lib/hardNavigate";

const DASHBOARD_PATH = "/institution";
const SUBMIT_ERROR_MESSAGE =
  "Não foi possível registrar o aceite. Tente novamente.";
const STALE_VERSION_MESSAGE =
  "Os termos foram atualizados enquanto esta página estava aberta. Recarregue para ver a versão atual.";

/**
 * Blocking acceptance step for an institution account that predates the terms
 * gate, or whose acceptance was retired by a material revision (issue #338).
 *
 * middleware.ts redirects here for any /institution/* route once the account
 * has a slug but no current consent — the same shape the onboarding step
 * already uses for a missing slug, and the reason this page must be reachable
 * while the gate is closed.
 *
 * A brand-new account never lands here: it has no slug, so onboarding (which
 * collects the acceptance itself) comes first.
 */
export default function InstitutionTermsPage() {
  const { update } = useSession();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setError("É necessário aceitar os Termos de Uso para continuar.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    let response: Response;
    try {
      response = await fetch("/api/institution/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termsAccepted: true,
          termsVersion: INSTITUTION_TERMS_VERSION,
        }),
      });
    } catch {
      setError(SUBMIT_ERROR_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      // 400 means this tab is rendering a version the server has replaced.
      // Retrying cannot help; only a reload can.
      setError(
        response.status === 400 ? STALE_VERSION_MESSAGE : SUBMIT_ERROR_MESSAGE,
      );
      setIsSubmitting(false);
      return;
    }

    try {
      await update({ termsAccepted: true });
    } catch {
      // Recorded server-side already; a resubmit is idempotent and repeats
      // this update, so navigating on is still the right call.
    }
    // Full navigation, not router.push: a soft navigation can replay the
    // client router's cached "/institution → terms" redirect and keep the
    // stale SessionProvider session, leaving the user stuck here.
    hardNavigate(DASHBOARD_PATH);
  }

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", mt: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Aceite os Termos de Uso
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        Para continuar usando o painel institucional, é necessário aceitar a
        versão atual dos Termos de Uso.
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <TermsAcceptance
          checked={termsAccepted}
          onChange={setTermsAccepted}
          disabled={isSubmitting}
        />
        {error ? (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : null}
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || !termsAccepted}
        >
          Continuar
        </Button>
      </Box>
    </Box>
  );
}
