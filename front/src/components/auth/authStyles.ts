/**
 * Shared sx literals for the login/register/reset-password pages — these
 * were byte-identical copies in all three files before being centralized
 * here. Colors are the pages' own approved palette, not the MUI theme.
 */
export const fieldSx = {
  "& .MuiInputLabel-root": { color: "#1a1a1a" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#1a1a1a" },
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    background: "#faf6ef",
    "& fieldset": { borderColor: "#c4c0b8" },
    "&:hover fieldset": { borderColor: "#1a1a1a" },
    "&.Mui-focused fieldset": { borderColor: "#1a1a1a" },
  },
  "& .MuiInputBase-input": { color: "#1a1a1a" },
  "& .MuiFormHelperText-root": { color: "#666" },
} as const;

export const iconSx = { color: "#1a1a1a", mr: 1, fontSize: 20 } as const;

/**
 * Merge onto `fieldSx` (via sx array, after it) to recolor the whole field —
 * label, border, and helper text together, not just the border — once it
 * passes/fails live validation.
 */
export const fieldValidSx = {
  "& .MuiInputLabel-root": { color: "#22c55e" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#22c55e" },
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#22c55e" },
    "&:hover fieldset": { borderColor: "#22c55e" },
    "&.Mui-focused fieldset": { borderColor: "#22c55e" },
  },
  "& .MuiFormHelperText-root": { color: "#22c55e" },
} as const;

export const fieldErrorSx = {
  "& .MuiInputLabel-root": { color: "#ef4444" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#ef4444" },
  "& .MuiOutlinedInput-root": {
    "& fieldset": { borderColor: "#ef4444" },
    "&:hover fieldset": { borderColor: "#ef4444" },
    "&.Mui-focused fieldset": { borderColor: "#ef4444" },
  },
  "& .MuiFormHelperText-root": { color: "#ef4444" },
} as const;

export const submitButtonSx = {
  mt: 1,
  py: 1.5,
  borderRadius: "8px",
  fontWeight: 600,
  textTransform: "none",
  fontSize: "1rem",
  background: "#1a1a1a",
  "&:hover": { background: "#333" },
  "&.Mui-disabled": { background: "#9e9e9e", color: "#fff" },
} as const;

export const authLinkStyle = {
  color: "#6366f1",
  textDecoration: "none",
} as const;
