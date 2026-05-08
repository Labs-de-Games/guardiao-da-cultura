"use client";

import LoginForm from "@/components/auth/LoginForm";
import { useRedirectIfAuth } from "@/lib/auth/useRedirectIfAuth";

export default function LoginPage() {
  useRedirectIfAuth();
  return <LoginForm />;
}
