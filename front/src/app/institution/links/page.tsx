"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Alert,
  Box,
  Card,
  CardContent,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import { useMemo, useState } from "react";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { Section } from "@/components/dashboard/Section";
import { getCampaigns } from "@/lib/api/edital";
import {
  buildTrackingUrl,
  CAMPAIGN_ORIGINS,
  isValidOriginSlug,
  resolveOriginLabel,
} from "@/lib/edital/origins";
import type { EditalCampaignsResponse } from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";

const CUSTOM_SLUG_VALUE = "__custom__";

/**
 * No FilterBar / dateRange picker here (unlike the other three screens):
 * issue #746 doesn't ask for one, this is a link generator plus a
 * monitoring table, not a report. The origins table below uses a fixed
 * 30-day window.
 */
function InstitutionLinksContent() {
  const [selectedRegistrySlug, setSelectedRegistrySlug] =
    useState<string>(CUSTOM_SLUG_VALUE);
  const [customSlug, setCustomSlug] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const effectiveSlug =
    selectedRegistrySlug === CUSTOM_SLUG_VALUE
      ? customSlug
      : selectedRegistrySlug;
  const slugIsValid = isValidOriginSlug(effectiveSlug);

  function handleSelectOrigin(value: string) {
    setSelectedRegistrySlug(value);
  }

  const trackingUrl = useMemo(() => {
    if (!slugIsValid) return "";
    return buildTrackingUrl({
      slug: effectiveSlug,
    });
  }, [slugIsValid, effectiveSlug]);

  async function handleCopy() {
    if (!trackingUrl) return;
    await navigator.clipboard.writeText(trackingUrl);
    setSnackbarOpen(true);
  }

  const { data, loading, error, retry } = useAsyncData<EditalCampaignsResponse>(
    () => getCampaigns({ type: "30d" }),
    [],
  );

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          mb: 1,
          fontWeight: 700,
          color: "text.primary",
          fontFamily: "'Jockey One', sans-serif",
        }}
      >
        Links de Campanha
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
        Gere e copie links rastreados para sua instituição. Esta página não
        emite nenhum evento de analytics — atividade da equipe aqui não toca o
        dataset do edital.
      </Typography>

      <Section title="Gerar link">
        <Card>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Select
              value={selectedRegistrySlug}
              onChange={(e) => handleSelectOrigin(e.target.value)}
              size="small"
              displayEmpty
              sx={{ color: "text.primary" }}
            >
              {CAMPAIGN_ORIGINS.map((entry) => (
                <MenuItem key={entry.slug} value={entry.slug}>
                  {entry.label}
                </MenuItem>
              ))}
              <MenuItem value={CUSTOM_SLUG_VALUE}>
                Outro (digitar slug manualmente)
              </MenuItem>
            </Select>

            {selectedRegistrySlug === CUSTOM_SLUG_VALUE ? (
              <TextField
                size="small"
                label="Slug da instituição"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                error={customSlug.length > 0 && !slugIsValid}
                helperText={
                  customSlug.length > 0 && !slugIsValid
                    ? "Apenas letras minúsculas, números e hífens."
                    : " "
                }
                sx={{
                  "& .MuiInputBase-input": { color: "text.primary" },
                  "& .MuiInputLabel-root": { color: "text.secondary" },
                }}
              />
            ) : null}

            <TextField
              size="small"
              label="Link gerado"
              value={trackingUrl}
              slotProps={{ input: { readOnly: true } }}
              placeholder="Selecione ou digite um slug válido"
              sx={{
                "& .MuiInputBase-input": { color: "text.primary" },
                "& .MuiInputLabel-root": { color: "text.secondary" },
              }}
            />

            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              disabled={!trackingUrl}
              sx={{ alignSelf: "flex-start" }}
            >
              Copiar link
            </Button>
          </CardContent>
        </Card>
      </Section>

      <Section title="Origens (últimos 30 dias)">
        <DashboardState
          loading={loading}
          error={error}
          onRetry={retry}
          linked={data?.linked ?? true}
        >
          {data?.data ? (
            data.data.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>
                Nenhuma origem registrada nos últimos 30 dias.
              </Typography>
            ) : (
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ color: "text.primary", fontWeight: 600 }}
                      >
                        Origem
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "text.primary", fontWeight: 600 }}
                      >
                        Usuários únicos
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.data.map((row) => (
                      <TableRow key={row.source}>
                        <TableCell sx={{ color: "text.primary" }}>
                          {resolveOriginLabel(row.source)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.primary" }}>
                          {row.uniquePlayers.toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : null}
        </DashboardState>
      </Section>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          Link copiado para a área de transferência!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function InstitutionLinksPage() {
  return <InstitutionLinksContent />;
}
