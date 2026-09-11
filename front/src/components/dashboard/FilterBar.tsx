import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";

interface FilterBarProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  /**
   * Custom-range support — all optional, backward-compatible (issue
   * #745: "Props novas todas opcionais, então nada mais quebra"). Only
   * rendered when `dateRange === "custom"` AND both change handlers are
   * provided; a caller that doesn't pass them keeps the exact old
   * 3-option behavior.
   */
  customFrom?: string;
  customTo?: string;
  onCustomFromChange?: (value: string) => void;
  onCustomToChange?: (value: string) => void;
}

export function FilterBar({
  dateRange,
  onDateRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: FilterBarProps) {
  const showCustomFields =
    dateRange === "custom" && onCustomFromChange && onCustomToChange;

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
      <FormControl sx={{ minWidth: 180 }} size="small">
        <InputLabel id="date-range-filter-label">Período</InputLabel>
        <Select
          labelId="date-range-filter-label"
          value={dateRange}
          label="Período"
          onChange={(e) => onDateRangeChange(e.target.value)}
        >
          <MenuItem value="last-7-days">Últimos 7 dias</MenuItem>
          <MenuItem value="last-30-days">Últimos 30 dias</MenuItem>
          <MenuItem value="all-time">Todo o período</MenuItem>
          {onCustomFromChange && onCustomToChange ? (
            <MenuItem value="custom">Personalizado</MenuItem>
          ) : null}
        </Select>
      </FormControl>
      {showCustomFields ? (
        <>
          {/* Plain type="date" inputs — no date library, no MUI
              x-date-pickers dependency in this repo (discovery §3.2). */}
          <TextField
            type="date"
            size="small"
            label="De"
            value={customFrom ?? ""}
            onChange={(e) => onCustomFromChange?.(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label="Até"
            value={customTo ?? ""}
            onChange={(e) => onCustomToChange?.(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </>
      ) : null}
    </Box>
  );
}
