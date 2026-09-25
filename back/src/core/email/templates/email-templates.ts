export interface EmailTemplate {
  subject: string;
  html: string;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const brandStyles = `
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background-color: #1a1a1a; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .header .logo { color: #00babc; font-weight: 700; font-size: 28px; }
    .content { padding: 32px 24px; color: #333333; line-height: 1.6; }
    .content p { margin: 0 0 16px; font-size: 16px; }
    .button { display: inline-block; padding: 14px 32px; background-color: #00babc; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .footer { background-color: #f5f5f5; padding: 24px; text-align: center; color: #888888; font-size: 12px; }
    .footer a { color: #00babc; text-decoration: none; }
    .divider { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
  </style>
`;

/**
 * Styles for the Guardião da Cultura-branded templates (registration
 * confirmation, password reset) — a distinct header/footer/button look
 * from `brandStyles` above, matching the product's own Figma template
 * rather than the generic "42 Rio" one `welcome`/`loginNotification`
 * still use. Kept as its own block instead of editing `brandStyles` so
 * those two templates are untouched.
 */
const brandedStyles = `
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e8; }
    .branded-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .branded-header { background-color: #1a1a1a; padding: 28px 24px; }
    .branded-logo { width: 64px; height: 64px; display: block; }
    .branded-title { color: #d9a25c; font-size: 26px; font-weight: 700; margin: 0 0 4px; }
    .branded-subtitle { color: #f5ead9; font-size: 18px; font-weight: 400; margin: 0; }
    .branded-content { padding: 32px 24px; color: #1a1a1a; line-height: 1.6; }
    .branded-content p { margin: 0 0 16px; font-size: 16px; }
    .gold-button { display: inline-block; padding: 14px 32px; background-color: #d9a25c; color: #1a1a1a; text-decoration: none; border-radius: 28px; font-weight: 700; font-size: 16px; margin: 16px 0; }
    .branded-divider { border: none; border-top: 1px solid #e0e0e0; margin: 8px 0 20px; }
    .footer-logo { width: 40px; height: 40px; display: block; }
    .footer-title { color: #1a1a1a; font-size: 15px; font-weight: 700; margin: 0 0 4px; }
    .footer-subtitle { color: #666666; font-size: 13px; margin: 0; }
  </style>
`;

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${brandStyles}
</head>
<body>
  <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="header">
        <span class="logo">42 Rio</span>
        <h1>${escapeHtml(title)}</h1>
      </td>
    </tr>
    <tr>
      <td class="content">
        ${body}
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>42 Rio - Programa de Formação em Tecnologia</p>
        <p>Se precisar de ajuda, entre em contato com nossa equipe.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Guardião da Cultura-branded layout (registration confirmation,
 * password reset) — logo + title + subtitle in the dark header, gold
 * pill button, and a compact logo+text footer with the Lei Rouanet
 * incentive line, matching the product's own Figma template. `logoUrl`
 * is built from `frontendUrl` since email clients fetch images over the
 * network — they can't resolve a relative Next.js public-folder path the
 * way a browser tab on the same origin can.
 */
function brandedTemplate(
  subtitle: string,
  body: string,
  frontendUrl: string,
): string {
  const logoUrl = `${frontendUrl}/images/auth/logo-jogo.png`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guardião da Cultura</title>
  ${brandedStyles}
</head>
<body>
  <table class="branded-container" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="branded-header">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="80" style="vertical-align: middle;">
              <img src="${logoUrl}" alt="Guardião da Cultura" class="branded-logo">
            </td>
            <td style="vertical-align: middle; padding-left: 16px;">
              <p class="branded-title">Guardião da Cultura</p>
              <p class="branded-subtitle">${escapeHtml(subtitle)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="branded-content">
        ${body}
        <hr class="branded-divider">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="56" style="vertical-align: middle;">
              <img src="${logoUrl}" alt="Guardião da Cultura" class="footer-logo">
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
              <p class="footer-title">Guardião da Cultura</p>
              <p class="footer-subtitle">Projeto realizado com apoio da Lei Federal de Incentivo à Cultura — Lei Rouanet.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const emailTemplates = {
  /**
   * Institution password reset — kept named `passwordReset` (not
   * `magicLink`) since that's its only caller today
   * (PasswordAuthService.requestPasswordReset via
   * IEmailService.sendMagicLinkEmail); the interface method name stays
   * generic for now, only this template's own name and content changed.
   */
  passwordReset(
    email: string,
    resetUrl: string,
    frontendUrl: string,
  ): EmailTemplate {
    return {
      subject: "Redefinição de senha - Guardião da Cultura",
      html: brandedTemplate(
        "Redefinição de senha",
        `<p>Olá!</p>
        <p>Recebemos uma solicitação para redefinir a senha da conta <strong>${escapeHtml(email)}</strong> no <strong>Guardião da Cultura</strong>.</p>
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(resetUrl)}" class="gold-button">Redefinir Senha</a>
        </p>
        <p>Se você não solicitou esta redefinição, pode ignorar esta mensagem.</p>
        <p style="font-size: 13px; color: #666;">Este link expira em 15 minutos.</p>`,
        frontendUrl,
      ),
    };
  },

  verification(
    email: string,
    verificationUrl: string,
    frontendUrl: string,
  ): EmailTemplate {
    return {
      subject: "Confirmação de cadastro - Guardião da Cultura",
      html: brandedTemplate(
        "Confirmação de cadastro",
        `<p>Olá!</p>
        <p>Recebemos seu cadastro no <strong>Guardião da Cultura</strong>.</p>
        <p>Para ativar sua conta e começar a jogar, confirme seu e-mail <strong>${escapeHtml(email)}</strong> clicando no botão abaixo:</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(verificationUrl)}" class="gold-button">Confirmar E-mail</a>
        </p>
        <p>Se você não fez este cadastro, pode ignorar esta mensagem.</p>
        <p style="font-size: 13px; color: #666;">Este link expira em 15 minutos.</p>`,
        frontendUrl,
      ),
    };
  },

  welcome(email: string, nickname: string, frontendUrl: string): EmailTemplate {
    return {
      subject: "Boas-vindas ao ambiente de testes da 42 Rio!",
      html: baseTemplate(
        "Boas-vindas!",
        `<p>Olá, <strong>${escapeHtml(nickname)}</strong>,</p>
        <p>ficamos felizes em ter você aqui no <strong>ambiente de testes da 42 Rio</strong>!</p>
        <p>Sua conta <strong>${escapeHtml(email)}</strong> foi criada com sucesso e você já pode começar sua jornada de aprendizado.</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(frontendUrl)}" class="button">Começar agora</a>
        </p>
        <hr class="divider">
        <p style="font-size: 14px; color: #666;">Esperamos que seja divertido! Lembre-se de dar sua opinião ao final, queremos saber como foi sua experiência!</p>`,
      ),
    };
  },

  loginNotification(email: string, frontendUrl: string): EmailTemplate {
    return {
      subject: "Novo acesso detectado - 42 Rio",
      html: baseTemplate(
        "Novo acesso detectado",
        `<p>Olá, </p>
        <p>detectamos um novo acesso à sua conta <strong>${escapeHtml(email)}</strong>.</p>
        <p>Se foi você, pode ignorar este e-mail com segurança.</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(frontendUrl)}" class="button">Acessar conta</a>
        </p>
        <hr class="divider">
        <p style="font-size: 14px; color: #666;">Se não foi você, recomendamos que entre em contato com nosso suporte..</p>`,
      ),
    };
  },
};
