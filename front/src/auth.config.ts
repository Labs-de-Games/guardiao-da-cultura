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
} satisfies NextAuthConfig;

/**
 * A lightweight NextAuth instance built from the Edge-safe config only —
 * this is what middleware.ts imports to read the session (`auth()`),
 * never the full `auth.ts` instance (which has providers).
 */
export const { auth } = NextAuth(authConfig);
