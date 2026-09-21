"use client";

import {
  Dashboard as DashboardIcon,
  FilterAlt as FunnelIcon,
  Link as LinksIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Assessment as ReportIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import InstitutionGuard from "@/components/auth/InstitutionGuard";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";

const DRAWER_WIDTH = 280;

// #settings/page.tsx (69-line inoperative placeholder) was removed in
// #745 — that issue owns the deletion, not #748 (discovery §2.7). #745
// said "4 entradas" ahead of #746 landing; now all 4 exist.
const NAV_ITEMS = [
  { label: "Resumo Executivo", href: "/institution", icon: DashboardIcon },
  { label: "Funil", href: "/institution/funnel", icon: FunnelIcon },
  { label: "Relatório", href: "/institution/report", icon: ReportIcon },
  { label: "Links de Campanha", href: "/institution/links", icon: LinksIcon },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <>
      <Toolbar
        sx={{
          px: 3,
          py: 2,
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Image
          src="/images/auth/logo-jogo.png"
          alt="Guardião da Cultura"
          width={48}
          height={48}
          style={{ objectFit: "contain" }}
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.025em",
            textAlign: "center",
            color: "text.primary",
            fontFamily: "'Jockey One', sans-serif",
          }}
        >
          Guardião da Cultura
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: "divider" }} />
      <List sx={{ px: 2, py: 2, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={onNavigate}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive
                    ? "custom.sidebarAccent"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: isActive
                      ? "custom.sidebarAccent"
                      : "rgba(228,223,214,0.55)",
                  },
                  transition: "background-color 0.2s ease",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive
                      ? "custom.sidebarAccentText"
                      : "text.secondary",
                  }}
                >
                  <Icon fontSize="small" />
                </ListItemIcon>
                <Typography
                  sx={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.9375rem",
                    color: isActive
                      ? "custom.sidebarAccentText"
                      : "text.primary",
                  }}
                >
                  {item.label}
                </Typography>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ borderColor: "divider" }} />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: "rgba(0,0,0,0.04)",
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
                color: "text.primary",
              }}
            >
              {user?.name ?? user?.email ?? "Usuário"}
            </Typography>
            {/* Static institution chip — issue #745: no campaign selector,
                scope comes from the session, so the slug is always visible
                and the user knows exactly what they're looking at. */}
            <Typography
              variant="caption"
              sx={{ display: "block", color: "text.secondary" }}
            >
              {user?.institutionSlug ?? "Instituição não vinculada"}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<LogoutIcon fontSize="small" />}
          onClick={() => signOut({ callbackUrl: "/login" })}
          sx={{
            textTransform: "none",
            color: "text.primary",
            borderColor: "#c4c0b8",
            "&:hover": {
              borderColor: "text.primary",
              backgroundColor: "rgba(0,0,0,0.04)",
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerPaperSx = {
    width: DRAWER_WIDTH,
    boxSizing: "border-box" as const,
    backgroundColor: "custom.sidebarBg",
    borderRight: "1px solid",
    borderColor: "divider",
  };

  return (
    <SessionProvider>
      <InstitutionGuard>
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
          {isMobile ? (
            <>
              <AppBar
                position="fixed"
                color="inherit"
                elevation={0}
                sx={{ borderBottom: "1px solid", borderColor: "divider" }}
              >
                <Toolbar>
                  <IconButton
                    edge="start"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Abrir menu"
                  >
                    <MenuIcon />
                  </IconButton>
                  <Image
                    src="/images/auth/logo-jogo.png"
                    alt="Guardião da Cultura"
                    width={40}
                    height={40}
                    style={{ objectFit: "contain", marginLeft: 8 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{
                      ml: 1,
                      fontWeight: 700,
                      fontFamily: "'Jockey One', sans-serif",
                      color: "text.primary",
                    }}
                  >
                    Guardião da Cultura
                  </Typography>
                </Toolbar>
              </AppBar>
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{ "& .MuiDrawer-paper": drawerPaperSx }}
              >
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </Drawer>
            </>
          ) : (
            <Drawer
              variant="permanent"
              sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": drawerPaperSx,
              }}
            >
              <SidebarContent />
            </Drawer>
          )}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              backgroundColor: "background.default",
              height: "100vh",
              overflowY: "auto",
              overflowX: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {isMobile ? <Toolbar /> : null}
            <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>{children}</Box>
            <DashboardFooter />
          </Box>
        </Box>
      </InstitutionGuard>
    </SessionProvider>
  );
}
