import "server-only";

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
 * `resolveScope(session)` itself is #744's job — it doesn't exist yet
 * because the NextAuth session type it takes doesn't exist yet. This
 * factory exists ONLY so #742a's query builders and tests can be written
 * and typechecked against a real `Scope` value now, instead of #745
 * blocking on #744 to even compile. It lives under server/ (server-only
 * boundary) precisely so it can never reach a client bundle or a route
 * handler that isn't already scope-gated.
 *
 * Every real call site must eventually be `resolveScope(session)`, not
 * this. Do not import this from a route handler.
 */
export function __createScopeForTests(slug: string): Scope {
  return { slug } as Scope;
}
