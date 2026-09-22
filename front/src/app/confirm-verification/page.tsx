"use client";

import { Alert, CircularProgress, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthLink } from "@/components/auth/AuthLink";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthTitle } from "@/components/auth/AuthTitle";

function InvalidTokenView() {
  return (
    <>
      <AuthTitle>Link inválido</AuthTitle>
      <Alert severity="error" sx={{ borderRadius: "8px" }}>
        Link inválido ou inexistente.
      </Alert>
      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: "center", color: "#666" }}
      >
        <AuthLink href="/login">Voltar ao login</AuthLink>
      </Typography>
    </>
  );
}

function ConfirmingView() {
  return (
    <>
      <AuthTitle>Confirmando e-mail</AuthTitle>
      <Typography
        variant="body1"
        sx={{ mb: 3, textAlign: "center", color: "#4a4a4a" }}
      >
        Só um instante, estamos confirmando seu cadastro.
      </Typography>
      <Typography sx={{ textAlign: "center" }}>
        <CircularProgress size={28} />
      </Typography>
    </>
  );
}

function ExpiredTokenView() {
  return (
    <>
      <AuthTitle>Link expirado</AuthTitle>
      <Alert severity="error" sx={{ borderRadius: "8px" }}>
        Link inválido ou expirado. Cadastre-se novamente para receber um novo
        e-mail de confirmação.
      </Alert>
      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: "center", color: "#666" }}
      >
        <AuthLink href="/register">Voltar ao cadastro</AuthLink>
      </Typography>
    </>
  );
}

function ConfirmVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [failed, setFailed] = useState(false);
  // A verification token is single-use server-side: the backend consumes
  // it on the first successful call. React's Strict Mode deliberately
  // double-invokes this effect in dev (mount → cleanup → mount again), so
  // a plain "cancelled on cleanup" guard isn't enough on its own — that
  // would only stop the *first* call's result from being applied, while
  // still letting the *second* invocation resend the already-consumed
  // token and get a false "expired" error. This ref instead makes the
  // second invocation a no-op outright: at most one signIn call per token,
  // ever, regardless of how many times the effect re-runs. Deliberately no
  // unmount cleanup — a stray setState/navigation after a genuine unmount
  // here is harmless (React 18+ no longer warns on it either).
  const attemptedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || attemptedTokenRef.current === token) return;
    attemptedTokenRef.current = token;

    async function confirm() {
      const result = await signIn("email-verification", {
        token,
        redirect: false,
      });
      if (result?.error) {
        setFailed(true);
        return;
      }
      router.push("/institution");
    }
    confirm();
  }, [token, router]);

  if (!token) {
    return <InvalidTokenView />;
  }
  if (failed) {
    return <ExpiredTokenView />;
  }
  return <ConfirmingView />;
}

/**
 * Registration email confirmation — arrives via the link in
 * `sendVerificationEmail`. Verifies the account and logs it straight into
 * `/institution` in one request (auth.ts's "email-verification" NextAuth
 * Credentials provider); no session required to land here.
 */
export default function ConfirmVerificationPage() {
  return (
    <AuthPageShell fillHeight>
      <Suspense fallback={<CircularProgress />}>
        <ConfirmVerificationContent />
      </Suspense>
    </AuthPageShell>
  );
}
