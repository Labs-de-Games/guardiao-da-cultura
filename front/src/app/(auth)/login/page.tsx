"use client";

import { useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import { useToast } from "@/components/ToastProvider";
import { useRedirectIfAuth } from "@/lib/auth/useRedirectIfAuth";

const TOAST_STORAGE_KEY = "app.toast.next";

function consumeForceLogoutToastFromSessionStorage(): {
  message?: string;
  severity?: "success" | "error" | "warning" | "info";
} | null {
  try {
    const raw = sessionStorage.getItem(TOAST_STORAGE_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(TOAST_STORAGE_KEY);

    return JSON.parse(raw) as {
      message?: string;
      severity?: "success" | "error" | "warning" | "info";
    };
  } catch {
    return null;
  }
}

export default function LoginPage() {
  useRedirectIfAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const parsed = consumeForceLogoutToastFromSessionStorage();
    if (parsed?.message) showToast(parsed.message, parsed.severity ?? "info");
  }, [showToast]);

  return <LoginForm />;
}
