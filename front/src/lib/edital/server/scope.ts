import "server-only";
import type { Session } from "next-auth";

/**
 * Opaque, branded institution scope. Producible only by `resolveScope`
 * (implemented in #744, once NextAuth sessions exist) — every query
 * builder in this directory takes a `Scope` as its first parameter, so a
 * handler that tries to pass `searchParams.get("slug")` fails to compile
 * instead of merely failing review. Strictly stronger than "required
 * non-optional param". See
 * docs/specs/discovery-738-dashboard-edital.md §5.4.
 *
 * The brand is a private, module-unexported symbol: no other module can
 * construct a value of this type by object-shape alone, TypeScript's
 * structural typing notwithstanding.
 */
declare const scopeBrand: unique symbol;
export interface Scope {
  readonly slug: string;
  readonly [scopeBrand]: true;
}

/**
 * The one real way to obtain a `Scope`. Only this function ever sees the
 * `scopeBrand` symbol, so a `Scope` cannot be forged from a plain object
 * literal anywhere else in the codebase.
 *
 * Returns `null` — not a thrown error — for every case where a route
 * handler must render the "not linked" empty state instead of querying
 * PostHog at all: no session, a non-institution role, or an institution
 * account with `institutionSlug: null` (not yet linked by the admin
 * seed/update script). This is the short-circuit issue #744's acceptance
 * criteria require: "conta com institutionSlug = null curto-circuita
 * antes de qualquer chamada ao PostHog" — a null Scope makes it
 * impossible for a caller to reach a query builder without checking
 * first, the same compile-time discipline the type itself is for.
 */
export function resolveScope(session: Session | null): Scope | null {
  if (!session?.user) return null;
  if (session.user.role !== "institution") return null;
  if (!session.user.institutionSlug) return null;
  return { slug: session.user.institutionSlug } as Scope;
}

/**
 * Test-only: builds a `Scope` directly from a slug, bypassing
 * `resolveScope`'s session checks. For #742a's query-builder tests, which
 * need a `Scope` value but shouldn't have to construct a fake NextAuth
 * session to get one. Never import this from a route handler.
 */
export function __createScopeForTests(slug: string): Scope {
  return { slug } as Scope;
}
