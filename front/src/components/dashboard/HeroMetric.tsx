import { Card, CardContent, Typography } from "@mui/material";

interface HeroMetricProps {
  /** Unique gameplay users for THIS institution — no 5,000 goal bar. */
  value: number;
  label?: string;
}

/**
 * The headline number: unique users in gameplay, for the caller's own
 * institution. Deliberately has NO progress bar toward the 5,000-user
 * goal — that goal is global across all institutions, and a per-
 * institution bar against a global target would misrepresent what a
 * single institution's number means (issue #745).
 */
export function HeroMetric({
  value,
  label = "Usuários únicos em gameplay",
}: HeroMetricProps) {
  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderColor: "custom.highlight",
        "&::before": {
          content: '""',
          position: "absolute",
          insetBlock: 0,
          insetInlineStart: 0,
          width: 5,
          backgroundColor: "custom.highlight",
        },
      }}
    >
      <CardContent sx={{ p: 4, textAlign: "center" }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}
        >
          {label}
        </Typography>
        <Typography
          variant="h2"
          component="p"
          sx={{ fontWeight: 800, lineHeight: 1, color: "text.primary" }}
        >
          {value.toLocaleString("pt-BR")}
        </Typography>
      </CardContent>
    </Card>
  );
}
