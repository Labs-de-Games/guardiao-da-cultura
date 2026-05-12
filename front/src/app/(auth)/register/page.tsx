"use client";

import RegisterForm from "@/components/auth/RegisterForm";
import { useRedirectIfAuth } from "@/lib/auth/useRedirectIfAuth";

export default function RegisterPage() {
  useRedirectIfAuth();
  return <RegisterForm />;
}
