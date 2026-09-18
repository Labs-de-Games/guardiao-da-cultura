"use client";

import { Box, MenuItem, Select } from "@mui/material";
import { listCampaignLinks } from "@/lib/api/edital";
import { useAsyncData } from "@/lib/edital/useAsyncData";

interface TurmaSelectProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Shared turma filter control (issue #807) — every edital dashboard
 * screen renders this the same way, right under the page header. An
 * empty value means "institution-wide", which every route handler
 * already treats as the default (routeGuard.ts's `resolveTurmaSource`).
 */
export function TurmaSelect({ value, onChange }: TurmaSelectProps) {
  const { data } = useAsyncData(() => listCampaignLinks(), []);
  const links = data?.data ?? [];

  return (
    <Box sx={{ mb: 3, maxWidth: 320 }}>
      <Select
        fullWidth
        size="small"
        displayEmpty
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ color: "text.primary" }}
      >
        <MenuItem value="">
          <em>Toda a instituição</em>
        </MenuItem>
        {links.map((link) => (
          <MenuItem key={link.id} value={link.source}>
            {link.source}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
