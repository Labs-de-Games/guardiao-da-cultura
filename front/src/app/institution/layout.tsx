"use client";

import {
  Dashboard as DashboardIcon,
  FilterAlt as FunnelIcon,
  Logout as LogoutIcon,
  Assessment as ReportIcon,
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
import { SessionProvider, signOut, useSession } from "next-auth/react";
import InstitutionGuard from "@/components/auth/InstitutionGuard";

const DRAWER_WIDTH = 280;

// #settings/page.tsx (69-line inoperative placeholder) is removed per
// issue #745 — this issue owns that deletion, not #748 (discovery §2.7).
// Issue text says "4 entradas"; only 3 real screens exist as of this
// step (#746's campaign-links screen is the likely 4th, not built yet)
// — 3 entries here, not a fabricated 4th destination.
const NAV_ITEMS = [
  { label: "Resumo Executivo", href: "/institution", icon: DashboardIcon },
  { label: "Funil", href: "/institution/funnel", icon: FunnelIcon },
  { label: "Relatório", href: "/institution/report", icon: ReportIcon },
];

function SidebarContent() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

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
            {user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? "U"}
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
              {user?.name ?? user?.email ?? "Usuário"}
            </Typography>
            {/* Static institution chip — issue #745: no campaign selector,
                scope comes from the session, so the slug is always visible
                and the user knows exactly what they're looking at. */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {user?.institutionSlug ?? "Instituição não vinculada"}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<LogoutIcon fontSize="small" />}
          onClick={() => signOut({ callbackUrl: "/login" })}
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
    <SessionProvider>
      <InstitutionGuard>
        <Box sx={{ display: "flex", minHeight: "100vh", height: "100vh" }}>
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
              height: "100vh",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {children}
          </Box>
        </Box>
      </InstitutionGuard>
    </SessionProvider>
  );
}
