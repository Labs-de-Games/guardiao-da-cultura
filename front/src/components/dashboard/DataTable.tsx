import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

interface DataTableColumn {
  header: string;
  align?: "left" | "right";
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: ReactNode[][];
  /** Accessible label for the table (screen-reader caption). */
  label: string;
  emptyMessage?: string;
}

/**
 * Bordered container + shaded header row, mirroring the Lovable
 * reference's DataTable (dashboard-ui.tsx). Rows are ReactNode[][]
 * rather than string[][] so callers can render actions (icon buttons)
 * in a cell, not just text.
 */
export function DataTable({
  columns,
  rows,
  label,
  emptyMessage,
}: DataTableProps) {
  if (rows.length === 0 && emptyMessage) {
    return (
      <Typography sx={{ color: "text.secondary" }}>{emptyMessage}</Typography>
    );
  }

  return (
    <TableContainer
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        overflowX: "auto",
      }}
    >
      <Table size="small">
        <caption
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
          }}
        >
          {label}
        </caption>
        <TableHead>
          <TableRow sx={{ backgroundColor: "custom.sidebarBg" }}>
            {columns.map((column) => (
              <TableCell
                key={column.header}
                align={column.align ?? "left"}
                sx={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  fontSize: "0.7rem",
                }}
              >
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            // eslint-disable-next-line react/no-array-index-key -- rows are plain ReactNode tuples, no stable id available here
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell
                  key={columns[cellIndex]?.header ?? cellIndex}
                  align={columns[cellIndex]?.align ?? "left"}
                  sx={{ color: "text.primary" }}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
