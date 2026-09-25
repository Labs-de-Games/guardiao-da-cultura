import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";

/**
 * Edge-safe half of the NextAuth v5 split (discovery §5.5): middleware
 * runs on the Edge runtime, which can't load the Node-only pieces a full
 * provider config sometimes pulls in. This file has no `providers` array
 * at all, so importing it from middleware.ts never risks dragging one in.
 *
 * `auth.ts` spreads this and adds the real providers + callbacks that
 * need Node (the signIn callback calls the backend upsert endpoint over
 * plain fetch, which IS Edge-safe, but keeping the split clean means a
 * future provider that isn't Edge-safe can't silently break middleware).
 */
export const authConfig = {
  // Deliberately empty: providers live only in auth.ts (the Node-side,
  // full config) — see the module comment above.
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    // JWT strategy, no database adapter — the User table stays owned by
    // the NestJS/Postgres side; NextAuth only issues/reads a signed
    // session cookie. See discovery §5.5 / issue #744.
    strategy: "jwt",
  },
  callbacks: {
    // Mirror the jwt/session callbacks from auth.ts so the Edge-side
    // middleware can read `role` and `institutionSlug` from the session.
    // auth.ts has the full version that also sets these on first sign-in;
    // here we only need to pass them through from the already-signed JWT.
    jwt({ token, user }) {
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
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      if (token.role) session.user.role = token.role;
      session.user.institutionSlug = token.institutionSlug ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;

/**
 * A lightweight NextAuth instance built from the Edge-safe config only —
 * this is what middleware.ts imports to read the session (`auth()`),
 * never the full `auth.ts` instance (which has providers).
 */
export const { auth } = NextAuth(authConfig);
