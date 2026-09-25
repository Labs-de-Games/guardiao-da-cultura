import { Button, CircularProgress } from "@mui/material";
import type { ReactNode } from "react";
import { submitButtonSx } from "./authStyles";

interface AuthSubmitButtonProps {
  loading: boolean;
  children: ReactNode;
}

/** The black `type="submit"` CTA shared by every auth form, swapping its label for a spinner while submitting. */
export function AuthSubmitButton({ loading, children }: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="contained"
      fullWidth
      disabled={loading}
      sx={submitButtonSx}
    >
      {loading ? <CircularProgress size={24} color="inherit" /> : children}
    </Button>
  );
}
