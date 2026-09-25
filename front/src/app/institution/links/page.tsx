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
  TextField,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import { useState } from "react";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { DataTable } from "@/components/dashboard/DataTable";
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
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CampaignLink | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCampaignLink(pendingDelete.id);
      setPendingDelete(null);
      retryLinks();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Erro ao excluir link",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setSnackbar({
        message: "Link copiado para a área de transferência!",
        severity: "success",
      });
    } catch {
      setSnackbar({
        message: "Não foi possível copiar o link.",
        severity: "error",
      });
    }
  }

  const { data, loading, error, retry } = useAsyncData<EditalCampaignsResponse>(
    () => getCampaigns({ type: "30d" }),
    [],
  );

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 1,
          fontWeight: 700,
          textTransform: "uppercase",
          color: "custom.highlight",
        }}
      >
        Painel institucional
      </Typography>
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

      <Section variant="split" eyebrow="Campanhas e turmas" title="Criar link">
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

      <Section variant="split" eyebrow="Gerenciamento" title="Meus links">
        <DashboardState
          loading={linksLoading}
          error={linksError}
          onRetry={retryLinks}
          linked={linksData?.linked ?? true}
        >
          <DataTable
            label="Meus links"
            emptyMessage="Nenhum link criado ainda."
            columns={[
              { header: "Grupo/turma" },
              { header: "Link" },
              { header: "Ações", align: "right" },
            ]}
            rows={links.map((link: CampaignLink) => [
              link.source,
              link.url,
              <Box
                key="actions"
                sx={{ display: "flex", justifyContent: "flex-end" }}
              >
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
              </Box>,
            ])}
          />
        </DashboardState>
      </Section>

      <Section
        variant="split"
        eyebrow="Distribuição de acessos"
        title="Origens (últimos 30 dias)"
      >
        <DashboardState
          loading={loading}
          error={error}
          onRetry={retry}
          linked={data?.linked ?? true}
        >
          {data?.data ? (
            <DataTable
              label="Origens dos acessos"
              emptyMessage="Nenhuma origem registrada nos últimos 30 dias."
              columns={[
                { header: "Origem" },
                { header: "Usuários únicos", align: "right" },
              ]}
              rows={data.data.map((row) => [
                resolveOriginLabel(row.source),
                row.uniquePlayers.toLocaleString("pt-BR"),
              ])}
            />
          ) : null}
        </DashboardState>
      </Section>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          setPendingDelete(null);
          setDeleteError(null);
        }}
      >
        <DialogTitle>Excluir link?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            O link do grupo/turma <strong>{pendingDelete?.source}</strong> será
            removido. Esta ação não pode ser desfeita.
          </DialogContentText>
          {deleteError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPendingDelete(null);
              setDeleteError(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
            autoFocus
          >
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
