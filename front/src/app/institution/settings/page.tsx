"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "@/lib/auth/useAuth";

export default function InstitutionSettingsPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Configurações
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Gerencie os dados da sua instituição e preferências da conta.
      </Typography>

      <Card sx={{ maxWidth: 640 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Dados da Instituição
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <TextField
              label="Nome da Instituição"
              defaultValue={user?.firstName ?? ""}
              fullWidth
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            <TextField
              label="E-mail"
              defaultValue={user?.email ?? ""}
              fullWidth
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            <TextField
              label="Nickname"
              defaultValue={user?.nickname ?? ""}
              fullWidth
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                disabled
                sx={{ textTransform: "none" }}
              >
                Salvar alterações
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
