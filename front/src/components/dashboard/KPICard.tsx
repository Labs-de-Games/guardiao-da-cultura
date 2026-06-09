import { Box, Card, CardContent, Chip, Typography } from "@mui/material";

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
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              {title}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
              {value}
            </Typography>
          </Box>
          {target ? (
            <Chip
              label={`Meta ${target}`}
              size="small"
              sx={{
                fontWeight: 600,
                borderColor: STATUS_COLORS[status],
                color: STATUS_COLORS[status],
              }}
              variant="outlined"
            />
          ) : null}
        </Box>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
