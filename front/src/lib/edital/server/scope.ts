import "server-only";
import type { Session } from "next-auth";
import { isValidOriginSlug } from "../origins";

/**
 * Opaque, branded institution scope. Producible only by `resolveScope`
 * (implemented in #744, once NextAuth sessions exist) — every query
 * builder in this directory takes a `Scope` as its first parameter, so a
 * handler that tries to pass `searchParams.get("slug")` fails to compile
 * instead of merely failing review. Strictly stronger than "required
 * non-optional param".
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
 * PostHog at all: no session, a non-institution role, an institution
 * account with `institutionSlug: null` (not yet linked by the admin
 * seed/update script), or — this last check previously did not exist,
 * even though comments elsewhere claimed it did — an `institutionSlug`
 * that fails `ORIGIN_SLUG_PATTERN`. The column has no DB-level format
 * constraint (migration 1780000000008 is a plain nullable varchar), so a
 * malformed value from a future admin tool bug would otherwise reach
 * `queries.ts` as an unchecked HogQL-bound value. Bound parameters mean
 * it was never a query-injection risk, but treating a malformed slug as
 * "not linked" rather than trusting it is the honest version of the
 * defense-in-depth issue #746 asks for. This is the short-circuit issue
 * #744's acceptance criteria require: "conta com institutionSlug = null
 * curto-circuita antes de qualquer chamada ao PostHog" — a null Scope
 * makes it impossible for a caller to reach a query builder without
 * checking first, the same compile-time discipline the type itself is for.
 */
export function resolveScope(session: Session | null): Scope | null {
  if (!session?.user) return null;
  if (session.user.role !== "institution") return null;
  const slug = session.user.institutionSlug;
  if (!slug || !isValidOriginSlug(slug)) return null;
  return { slug } as Scope;
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

/**
 * Optional turma (class) filter — issue #807, folded into every existing
 * dashboard screen rather than a standalone page. `source` is a data
 * dimension, not a tenancy boundary: it only ever narrows an already
 * `resolveScope`'d institution's own event set, so a wrong/unknown value
 * just yields fewer rows — never another institution's data. That's why,
 * unlike `institutionSlug`, it's allowed to come from a request query
 * parameter. Returns `undefined` (not `null`) for a missing/malformed
 * `?turma=` — the honest "no filter" default, not an error — so a typo'd
 * turma silently falls back to institution-wide instead of a 400.
 */
export function resolveTurmaSource(raw: string | null): string | undefined {
  if (!raw || !isValidOriginSlug(raw)) return undefined;
  return raw;
}
