import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    custom: {
      sidebarBg: string;
      footerMutedText: string;
    };
  }
  interface PaletteOptions {
    custom: {
      sidebarBg: string;
      footerMutedText: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      // Matches the approved login/register CTA color (#1a1a1a), not the
      // indigo used there only for text links — keeps buttons/highlights
      // across the app consistent with the approved design.
      main: "#1a1a1a",
      light: "#333333",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#ec4899",
      light: "#f472b6",
      dark: "#db2777",
      contrastText: "#ffffff",
    },
    background: {
      default: "#fffdf6",
      paper: "#ffffff",
    },
    text: {
      primary: "#1a1a1a",
      secondary: "#7a756a",
    },
    divider: "#e0dcd0",
    error: {
      main: "#ef4444",
    },
    warning: {
      main: "#f59e0b",
    },
    success: {
      main: "#22c55e",
    },
    info: {
      main: "#3b82f6",
    },
    // One-off tones that don't fit a standard palette slot — named here
    // instead of left as unlabeled hex in components.
    custom: {
      sidebarBg: "#f5f0e8",
      footerMutedText: "rgba(255,255,255,0.6)",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: "-0.025em",
    },
    h2: {
      fontWeight: 700,
      letterSpacing: "-0.025em",
    },
    h3: {
      fontWeight: 600,
      letterSpacing: "-0.025em",
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 24px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          border: "1px solid #e0dcd0",
          borderRadius: 12,
          boxShadow: "none",
        },
      },
    },
  },
});
