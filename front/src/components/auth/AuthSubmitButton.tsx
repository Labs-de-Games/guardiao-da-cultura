import { Button, CircularProgress } from "@mui/material";
import type { ReactNode } from "react";
import { submitButtonSx } from "./authStyles";

interface AuthSubmitButtonProps {
  loading: boolean;
  /**
   * Blocks submission for a reason other than being mid-flight — the terms
   * checkbox on the registration form (issue #338). Additive: `loading` still
   * disables on its own, so existing callers are unaffected.
   */
  disabled?: boolean;
  children: ReactNode;
}

/** The black `type="submit"` CTA shared by every auth form, swapping its label for a spinner while submitting. */
export function AuthSubmitButton({
  loading,
  disabled = false,
  children,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="contained"
      fullWidth
      disabled={loading || disabled}
      sx={submitButtonSx}
    >
      {loading ? <CircularProgress size={24} color="inherit" /> : children}
    </Button>
  );
}
