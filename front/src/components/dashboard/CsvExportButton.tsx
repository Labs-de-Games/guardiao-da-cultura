"use client";

import DownloadIcon from "@mui/icons-material/Download";
import { Button } from "@mui/material";
import { useState } from "react";
import { downloadReportCsv } from "@/lib/api/edital";
import type { DateRange } from "@/lib/edital/types";

interface CsvExportButtonProps {
  dateRange: DateRange;
  onError?: (message: string) => void;
  /** Disable when the current dateRange isn't safe to send (e.g. invalid custom range). */
  disabled?: boolean;
}

export function CsvExportButton({
  dateRange,
  onError,
  disabled,
}: CsvExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    setDownloading(true);
    try {
      await downloadReportCsv(dateRange);
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
