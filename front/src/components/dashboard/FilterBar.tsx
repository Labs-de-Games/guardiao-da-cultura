import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";

interface FilterBarProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}

export function FilterBar({ dateRange, onDateRangeChange }: FilterBarProps) {
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
        </Select>
      </FormControl>
    </Box>
  );
}
