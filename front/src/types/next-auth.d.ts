import type { DefaultSession } from "next-auth";

/**
 * Augments NextAuth's session/JWT with the fields #744's signIn/jwt/session
 * callbacks (auth.ts) actually populate: userId, role, institutionSlug, and
 * #338's termsAccepted. JWT strategy, no database adapter — see auth.config.ts.
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
      /**
       * Whether this account holds a live acceptance of the current Terms of
       * Use (issue #338). Carried in the JWT so middleware can gate every
       * /institution/* route without a backend call per request.
       *
       * Non-optional on the session, and the session callback always assigns
       * it: a token minted before this field existed reads as `undefined`,
       * which must become `false` rather than leaving the gate open.
       */
      termsAccepted: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "player" | "institution" | "admin";
    institutionSlug?: string | null;
    termsAccepted?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: "player" | "institution" | "admin";
    institutionSlug?: string | null;
    termsAccepted?: boolean;
  }
}
