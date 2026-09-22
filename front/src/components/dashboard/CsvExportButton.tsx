"use client";

import DownloadIcon from "@mui/icons-material/Download";
import { Button } from "@mui/material";
import { useState } from "react";
import { downloadReportCsv } from "@/lib/api/edital";
import type { DateRange } from "@/lib/edital/types";

interface CsvExportButtonProps {
  dateRange: DateRange;
  onError?: (message: string | null) => void;
  /** Disable when the current dateRange isn't safe to send (e.g. invalid custom range). */
  disabled?: boolean;
  /** Issue #807 — omit for an institution-wide export. */
  turma?: string;
}

export function CsvExportButton({
  dateRange,
  onError,
  disabled,
  turma,
}: CsvExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    setDownloading(true);
    onError?.(null);
    try {
      await downloadReportCsv(dateRange, turma);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Falha ao exportar CSV");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      variant="contained"
      startIcon={<DownloadIcon />}
      onClick={handleClick}
      disabled={downloading || disabled}
    >
      {downloading ? "Exportando..." : "Exportar CSV"}
    </Button>
  );
}
