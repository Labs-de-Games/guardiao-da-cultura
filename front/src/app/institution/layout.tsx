"use client";

import {
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import InstitutionGuard from "@/components/auth/InstitutionGuard";
import { useAuth } from "@/lib/auth/useAuth";

const DRAWER_WIDTH = 280;

const NAV_ITEMS = [
  { label: "Visão Geral", href: "/institution", icon: DashboardIcon },
  { label: "Configurações", href: "/institution/settings", icon: SettingsIcon },
];

function SidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <Toolbar sx={{ px: 3, py: 2 }}>
        <Typography
          variant="h6"
          component="div"
          sx={{ fontWeight: 700, letterSpacing: "-0.025em" }}
        >
          Gameplate
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(148,163,184,0.12)" }} />
      <List sx={{ px: 2, py: 2, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive
                    ? "rgba(99,102,241,0.15)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(99,102,241,0.08)",
                  },
                  transition: "background-color 0.2s ease",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? "primary.light" : "text.secondary",
                  }}
                >
                  <Icon fontSize="small" />
                </ListItemIcon>
                <Typography
                  sx={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.9375rem",
                    color: isActive ? "primary.light" : "text.primary",
                  }}
                >
                  {item.label}
                </Typography>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ borderColor: "rgba(148,163,184,0.12)" }} />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: "rgba(148,163,184,0.06)",
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: "primary.main",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            {user?.firstName?.charAt(0) ?? user?.nickname?.charAt(0) ?? "U"}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.firstName ?? user?.nickname ?? "Usuário"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role === "institution"
                ? "Instituição"
                : user?.role === "admin"
                  ? "Administrador"
                  : "Usuário"}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<LogoutIcon fontSize="small" />}
          onClick={logout}
          sx={{
            textTransform: "none",
            borderColor: "rgba(148,163,184,0.24)",
            "&:hover": {
              borderColor: "rgba(148,163,184,0.4)",
              backgroundColor: "rgba(148,163,184,0.06)",
            },
          }}
        >
          Sair
        </Button>
      </Box>
    </>
  );
}

export default function InstitutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InstitutionGuard>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              backgroundColor: "#0f172a",
              borderRight: "1px solid rgba(148,163,184,0.12)",
            },
          }}
        >
          <SidebarContent />
        </Drawer>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 4,
            backgroundColor: "background.default",
            minHeight: "100vh",
            overflow: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </InstitutionGuard>
  );
}
