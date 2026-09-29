import { Divider, Typography } from "@mui/material";

/** The "◆"-in-the-middle divider used above the social-login/form split. */
export function AuthDivider() {
  return (
    <Divider sx={{ mb: 3, "&::before, &::after": { borderColor: "#1a1a1a" } }}>
      <Typography
        variant="body2"
        sx={{ color: "#1a1a1a", fontSize: "0.7rem", px: 1 }}
      >
        ◆
      </Typography>
    </Divider>
  );
}
