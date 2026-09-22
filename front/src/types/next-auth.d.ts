import type { DefaultSession } from "next-auth";

/**
 * Augments NextAuth's session/JWT with the fields #744's signIn/jwt/session
 * callbacks (auth.ts) actually populate: userId, role, institutionSlug.
 * JWT strategy, no database adapter — see auth.config.ts.
 */
declare module "next-auth" {
  interface Session {
    user: {
      /**
       * Optional, not `string`: the session callback (auth.ts) only sets
       * this `if (token.userId)` — a token missing it is a real runtime
       * state, not just a type-level formality.
       */
      id?: string;
      role?: "player" | "institution" | "admin";
      institutionSlug: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "player" | "institution" | "admin";
    institutionSlug?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: "player" | "institution" | "admin";
    institutionSlug?: string | null;
  }
}
