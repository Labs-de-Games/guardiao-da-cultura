import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { serverEnv } from "./lib/env-server";

interface OAuthUpsertResponse {
  id: string;
  role: "player" | "institution" | "admin";
  email: string;
  institutionSlug: string | null;
}

interface PasswordLoginResponse {
  redirectTo: string;
  user: {
    id: string;
    email: string;
    role: "player" | "institution" | "admin";
    institutionSlug: string | null;
  };
}

/**
 * Server-to-server backend URL for calls made from this file's own
 * signIn/authorize callbacks — which run in Next.js server code, not the
 * browser. Deliberately NOT the same as the client-facing NEXT_PUBLIC_API_URL
 * (used everywhere else in the codebase for browser-side calls): in Docker
 * Compose, this code runs inside the front container, where "localhost"
 * resolves to the front container itself, not the back one. See
 * BACKEND_INTERNAL_URL's own doc comment in lib/env-server.ts.
 */
function backendUrl(path: string): string {
  const apiUrl =
    serverEnv.server.backendInternalUrl || serverEnv.client.apiUrl || "";
  return apiUrl ? `${apiUrl}${path}` : path;
}

/**
 * Full NextAuth config: spreads the Edge-safe authConfig and adds the
 * Google provider + callbacks that talk to the backend — per issue #744:
 * "NextAuth({ session: { strategy: "jwt" }, providers: [Google],
 * callbacks })". JWT strategy, no database adapter: the User row stays
 * owned by the NestJS/Postgres side.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google,
    /**
     * Institution password login (#747). authorize() has no access to the
     * backend's Set-Cookie response (this is a server-to-server fetch, not
     * a browser request) — identity travels back in the JSON body instead
     * and is carried forward through jwt/session exactly like the Google
     * path above. Any non-institution or unverified credential is
     * rejected by the backend itself (generic 401), so authorize just
     * forwards that failure as `null`.
     */
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        try {
          const response = await fetch(
            backendUrl("/api/v1/auth/password/login"),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            },
          );
          if (!response.ok) return null;

          const data = (await response.json()) as PasswordLoginResponse;
          return {
            id: data.user.id,
            email: data.user.email,
            backendId: data.user.id,
            backendRole: data.user.role,
            institutionSlug: data.user.institutionSlug,
          };
        } catch (err) {
          console.error("[auth] password login request failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * find-or-create against the backend, gated by the shared upsert
     * token. Refuses sign-in (rather than silently proceeding
     * unattributed) when the token isn't configured or the upsert call
     * fails — an institution session with no backing User row would be a
     * worse failure mode than a rejected login.
     */
    async signIn({ user, account }) {
      // Credentials already fully authenticated the user against the
      // backend inside authorize() above — the OAuth upsert dance below is
      // Google-only, would send garbage (no real Google identity) for a
      // credentials sign-in, and must not run for it.
      if (account?.provider === "credentials") {
        return true;
      }

      const token = serverEnv.server.authOauthUpsertToken;
      if (!token) {
        console.error(
          "[auth] AUTH_OAUTH_UPSERT_TOKEN not configured — refusing sign-in",
        );
        return false;
      }
      if (!user.email) {
        return false;
      }

      try {
        const response = await fetch(backendUrl("/api/v1/auth/oauth/upsert"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-oauth-upsert-token": token,
          },
          body: JSON.stringify({
            email: user.email,
            firstName: user.name?.split(" ").at(0),
            lastName: user.name?.split(" ").slice(1).join(" ") || undefined,
          }),
        });

        if (!response.ok) {
          console.error(`[auth] oauth upsert failed: ${response.status}`);
          return false;
        }

        const upserted = (await response.json()) as OAuthUpsertResponse;
        // Stashed on the user object so the jwt callback (which runs
        // right after, same sign-in flow) can read it without a second
        // upsert call.
        Object.assign(user, {
          backendId: upserted.id,
          backendRole: upserted.role,
          institutionSlug: upserted.institutionSlug,
        });
        return true;
      } catch (err) {
        console.error("[auth] oauth upsert request failed:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        const enriched = user as typeof user & {
          backendId?: string;
          backendRole?: "player" | "institution" | "admin";
          institutionSlug?: string | null;
        };
        token.userId = enriched.backendId;
        token.role = enriched.backendRole;
        token.institutionSlug = enriched.institutionSlug ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      if (token.role) session.user.role = token.role;
      session.user.institutionSlug = token.institutionSlug ?? null;
      return session;
    },
  },
});
