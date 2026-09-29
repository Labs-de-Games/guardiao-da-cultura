import type { Metadata } from "next";
import Link from "next/link";
import { TermsContent } from "@/components/terms/TermsContent";

export const metadata: Metadata = {
  title: "Termos de Uso — Guardião da Cultura",
  description:
    "Condições de uso do painel institucional do Guardião da Cultura, aceitas no cadastro.",
};

/**
 * Public Terms of Use for the institutional dashboard (issue #338).
 *
 * The registration form shows this same text in a modal, so nobody has to
 * leave a half-filled form to read it. This page exists anyway because the
 * modal has no URL: a document an account is required to accept needs an
 * address that can be linked from an email, a footer, or a legal enquiry.
 * Both render `TermsContent`, so there is one copy of the prose.
 *
 * The counterpart `/privacidade` explicitly scoped this material out of itself
 * — "pertence a uma página de Termos de Uso, não a esta decisão" — and this is
 * that page. The two are versioned independently because they address
 * different subjects: an anonymous player deciding about analytics, and an
 * institution agreeing to operate an account.
 *
 * Light palette, not the game's dark/gold: every surface an institution sees
 * (`AuthPageShell`, the dashboard) is cream with a black border. Hardcoded
 * rather than read from the MUI theme for the reason `authStyles.ts` gives —
 * those pages use their own approved palette, not `theme.palette.*`.
 *
 * Outside the `(game)` route group and outside the middleware matcher, so
 * reading the terms neither mints the player identity cookie nor requires a
 * session.
 */
export default function TermsOfUsePage() {
  return (
    <main
      style={{
        // Same reasoning as /privacidade: the root layout pins `body` to
        // `height: 100vh; overflow: hidden` for the Phaser canvas, so this
        // page has to own its own scroll container.
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        backgroundColor: "#f5f0e8",
        color: "#1a1a1a",
        fontFamily: '"Inter", sans-serif',
        padding: "48px 24px 96px",
        boxSizing: "border-box",
      }}
    >
      <article style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.7 }}>
        <h1
          style={{
            fontFamily: '"Jockey One", sans-serif',
            fontSize: "2.5rem",
            marginBottom: 8,
          }}
        >
          Termos de Uso
        </h1>

        <TermsContent />

        <p style={{ marginTop: 48 }}>
          <Link href="/" style={{ color: "#6366f1" }}>
            ← Voltar ao início
          </Link>
        </p>
      </article>
    </main>
  );
}
