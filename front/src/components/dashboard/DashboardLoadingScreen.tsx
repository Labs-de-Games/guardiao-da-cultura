import { Box, CircularProgress } from "@mui/material";

/** Full-page loading state for the institution dashboard shell — distinct from the game's LoadingScreen. */
export function DashboardLoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <CircularProgress />
    </Box>
  );
}
