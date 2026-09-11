import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { serverEnv } from "./lib/env-server";

interface OAuthUpsertResponse {
  id: string;
  role: "player" | "institution" | "admin";
  email: string;
  institutionSlug: string | null;
}

function backendUrl(path: string): string {
  const apiUrl = serverEnv.client.apiUrl || "";
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
  providers: [Google],
  callbacks: {
    /**
     * find-or-create against the backend, gated by the shared upsert
     * token. Refuses sign-in (rather than silently proceeding
     * unattributed) when the token isn't configured or the upsert call
     * fails — an institution session with no backing User row would be a
     * worse failure mode than a rejected login.
     */
    async signIn({ user }) {
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
