"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
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
import { useState } from "react";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { Section } from "@/components/dashboard/Section";
import {
  createCampaignLink,
  deleteCampaignLink,
  getCampaigns,
  listCampaignLinks,
} from "@/lib/api/edital";
import { isValidOriginSlug, resolveOriginLabel } from "@/lib/edital/origins";
import type { CampaignLink, EditalCampaignsResponse } from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";

/**
 * The institution's own slug is never chosen here — it comes from the
 * session server-side (front/src/lib/edital/server/scope.ts). This page
 * only lets the institution create/delete per-class group labels
 * (utm_source) under that fixed slug.
 */
function InstitutionLinksContent() {
  const [groupLabel, setGroupLabel] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CampaignLink | null>(null);

  const labelIsValid = isValidOriginSlug(groupLabel);

  const {
    data: linksData,
    loading: linksLoading,
    error: linksError,
    retry: retryLinks,
  } = useAsyncData(() => listCampaignLinks(), []);

  const links = linksData?.data ?? [];

  async function handleCreate() {
    if (!labelIsValid) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createCampaignLink(groupLabel);
      setGroupLabel("");
      retryLinks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar link");
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await deleteCampaignLink(pendingDelete.id);
    setPendingDelete(null);
    retryLinks();
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
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

      <Section title="Criar link">
        <Card>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              size="small"
              label="Nome da turma/grupo"
              value={groupLabel}
              onChange={(e) => setGroupLabel(e.target.value)}
              error={groupLabel.length > 0 && !labelIsValid}
              helperText={
                groupLabel.length > 0 && !labelIsValid
                  ? "Apenas letras minúsculas, números e hífens."
                  : " "
              }
              sx={{
                "& .MuiInputBase-input": { color: "text.primary" },
                "& .MuiInputLabel-root": { color: "text.secondary" },
              }}
            />

            {createError ? <Alert severity="error">{createError}</Alert> : null}

            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={!labelIsValid || creating}
              sx={{ alignSelf: "flex-start" }}
            >
              Criar link
            </Button>
          </CardContent>
        </Card>
      </Section>

      <Section title="Meus links">
        <DashboardState
          loading={linksLoading}
          error={linksError}
          onRetry={retryLinks}
          linked={linksData?.linked ?? true}
        >
          {links.length === 0 ? (
            <Typography sx={{ color: "text.secondary" }}>
              Nenhum link criado ainda.
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "text.primary", fontWeight: 600 }}>
                      Grupo/turma
                    </TableCell>
                    <TableCell sx={{ color: "text.primary", fontWeight: 600 }}>
                      Link
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: "text.primary", fontWeight: 600 }}
                    >
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {links.map((link: CampaignLink) => (
                    <TableRow key={link.id}>
                      <TableCell sx={{ color: "text.primary" }}>
                        {link.source}
                      </TableCell>
                      <TableCell sx={{ color: "text.primary" }}>
                        {link.url}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label={`Copiar link de ${link.source}`}
                          onClick={() => handleCopy(link.url)}
                          size="small"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label={`Excluir link de ${link.source}`}
                          onClick={() => setPendingDelete(link)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DashboardState>
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

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
      >
        <DialogTitle>Excluir link?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            O link do grupo/turma <strong>{pendingDelete?.source}</strong> será
            removido. Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancelar</Button>
          <Button color="error" onClick={handleConfirmDelete} autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function InstitutionLinksPage() {
  return <InstitutionLinksContent />;
}
