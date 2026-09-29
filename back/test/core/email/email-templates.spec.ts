import { emailTemplates } from "../../../src/core/email/templates/email-templates";

describe("emailTemplates.welcome", () => {
  const frontendUrl = "https://staging.example.com";

  it("uses the Guardião da Cultura branding and links to the dashboard", () => {
    const { subject, html } = emailTemplates.welcome(
      "escola@example.com",
      "Escola Teste",
      frontendUrl,
    );

    expect(subject).toBe("Boas-vindas ao Guardião da Cultura!");
    expect(html).toContain(`${frontendUrl}/images/auth/logo-jogo.png`);
    expect(html).toContain(`href="${frontendUrl}/institution"`);
    expect(html).toContain("Escola Teste");
    expect(html).toContain("escola@example.com");
  });

  it("escapes the user-supplied display name", () => {
    const { html } = emailTemplates.welcome(
      "escola@example.com",
      "<script>alert(1)</script>",
      frontendUrl,
    );

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
