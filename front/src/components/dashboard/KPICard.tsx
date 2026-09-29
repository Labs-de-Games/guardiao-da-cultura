import { Card, CardContent, Chip, Typography } from "@mui/material";

interface KPICardProps {
  title: string;
  value: string;
  target?: string;
  status?: "good" | "bad" | "neutral";
  subtitle?: string;
}

const STATUS_COLORS: Record<NonNullable<KPICardProps["status"]>, string> = {
  good: "success.main",
  bad: "error.main",
  neutral: "text.secondary",
};

export function KPICard({
  title,
  value,
  target,
  status = "neutral",
  subtitle,
}: KPICardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3, textAlign: "center" }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "text.secondary" }}
        >
          {title}
        </Typography>
        <Typography
          variant="h4"
          sx={{ mt: 1, fontWeight: 700, color: "text.primary" }}
        >
          {value}
        </Typography>
        {target ? (
          <Chip
            label={`Meta ${target}`}
            size="small"
            sx={{
              mt: 1,
              fontWeight: 600,
              borderColor: STATUS_COLORS[status],
              color: STATUS_COLORS[status],
            }}
            variant="outlined"
          />
        ) : null}
        {subtitle ? (
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            {subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
