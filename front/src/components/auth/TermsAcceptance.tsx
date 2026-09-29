"use client";

import { Box, Checkbox, Typography } from "@mui/material";
import { useId, useState } from "react";
import { TermsDialog } from "@/components/terms/TermsDialog";
import { authLinkStyle } from "./authStyles";

interface TermsAcceptanceProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Disabled while a submit is in flight, like the fields around it. */
  disabled?: boolean;
}

/**
 * The mandatory Terms of Use checkbox (issue #338).
 *
 * Shared by all three surfaces that can record an acceptance — password
 * registration, Google onboarding, and the re-consent page existing accounts
 * are redirected to — so the wording, the trigger and the required-field
 * semantics cannot drift apart between them. What the user ticked has to match
 * what the stored version says they ticked.
 *
 * "Termos de Uso" opens a modal rather than navigating: leaving a half-filled
 * registration form to read the terms, and losing the form, is exactly the
 * pressure that makes people tick without reading.
 *
 * Deliberately not `FormControlLabel`: that wraps its whole label in a
 * `<label>`, and a click anywhere inside a label activates the control it
 * names — so the trigger would open the modal *and* silently toggle
 * acceptance. Here the label element covers only the plain text, and the
 * trigger is its sibling.
 */
export function TermsAcceptance({
  checked,
  onChange,
  disabled = false,
}: TermsAcceptanceProps) {
  const checkboxId = useId();
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Checkbox
          id={checkboxId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required
          // The visible text is split across a label and a button, so the
          // input carries its own name rather than inheriting a fragment.
          slotProps={{
            input: { "aria-label": "Li e aceito os Termos de Uso" },
          }}
          sx={{ color: "#1a1a1a", "&.Mui-checked": { color: "#1a1a1a" } }}
        />
        <Typography variant="body2" sx={{ color: "#1a1a1a" }}>
          <Box
            component="label"
            htmlFor={checkboxId}
            sx={{ cursor: disabled ? "default" : "pointer" }}
          >
            Li e aceito os{" "}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setTermsOpen(true)}
            sx={{
              ...authLinkStyle,
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "inherit",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Termos de Uso
          </Box>
        </Typography>
      </Box>

      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}
