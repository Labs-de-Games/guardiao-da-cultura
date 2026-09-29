"use client";

import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { TermsContent } from "./TermsContent";

const TITLE_ID = "terms-dialog-title";

interface TermsDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The Terms of Use in a scrollable modal, so reading them never costs a
 * half-filled registration form (issue #338).
 *
 * Read-only by design: there is no "Aceitar" here. Acceptance stays a single
 * deliberate act on the form's own checkbox, which is also the only thing that
 * decides what gets sent — one decision, one place it can be made.
 *
 * `scroll="paper"` keeps the title and the close button pinned while the prose
 * scrolls inside `DialogContent`, rather than scrolling the whole page behind
 * a dialog taller than the viewport.
 *
 * MUI `Dialog` already traps focus, restores it to the trigger on close, and
 * closes on Escape — unlike the game's `ConsentGate`, which swallows Escape
 * because it has no valid default answer. Escape is fine here: closing the
 * terms decides nothing.
 */
export function TermsDialog({ open, onClose }: TermsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll="paper"
      fullWidth
      maxWidth="md"
      aria-labelledby={TITLE_ID}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "#faf6ef",
            color: "#1a1a1a",
            // Tall enough that the prose is obviously scrollable rather than
            // looking like a short document that happens to be cut off.
            height: { xs: "100%", sm: "85vh" },
          },
        },
      }}
    >
      <DialogTitle
        id={TITLE_ID}
        sx={{
          fontFamily: '"Jockey One", sans-serif',
          fontSize: "1.75rem",
          pr: 7,
        }}
      >
        Termos de Uso
        <IconButton
          // Distinct from the "Fechar" button below so the two are not two
          // controls with the same accessible name doing the same thing.
          aria-label="Fechar os Termos de Uso"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: "#1a1a1a" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ fontFamily: '"Inter", sans-serif' }}>
        <Box sx={{ lineHeight: 1.7 }}>
          <TermsContent />
        </Box>
      </DialogContent>

      <DialogActions>
        <Box
          component="button"
          type="button"
          onClick={onClose}
          sx={{
            border: "none",
            borderRadius: "8px",
            background: "#1a1a1a",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.9375rem",
            fontWeight: 600,
            px: 3,
            py: 1,
            "&:hover": { background: "#333" },
          }}
        >
          Fechar
        </Box>
      </DialogActions>
    </Dialog>
  );
}
