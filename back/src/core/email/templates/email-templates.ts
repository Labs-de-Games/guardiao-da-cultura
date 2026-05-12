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

export const emailTemplates = {
  magicLink(email: string, magicLinkUrl: string): EmailTemplate {
    return {
      subject: "Seu link de acesso - 42 Rio",
      html: baseTemplate(
        "Link de Acesso",
        `<p>Olá,</p>
        <p>Recebemos uma solicitação de acesso para o email <strong>${escapeHtml(email)}</strong>.</p>
        <p>Clique no botão abaixo para acessar sua conta:</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(magicLinkUrl)}" class="button">Acessar Conta</a>
        </p>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="word-break: break-all; color: #00babc;">${escapeHtml(magicLinkUrl)}</p>
        <hr class="divider">
        <p style="font-size: 14px; color: #666;">Este link expira em 15 minutos. Se você não solicitou este acesso, ignore este email.</p>`,
      ),
    };
  },

  verification(email: string, verificationUrl: string): EmailTemplate {
    return {
      subject: "Verifique seu email - 42 Rio",
      html: baseTemplate(
        "Verificação de Email",
        `<p>Olá,</p>
        <p>Obrigado por se cadastrar na 42 Rio!</p>
        <p>Para confirmar seu email <strong>${escapeHtml(email)}</strong>, clique no botão abaixo:</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(verificationUrl)}" class="button">Verificar Email</a>
        </p>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="word-break: break-all; color: #00babc;">${escapeHtml(verificationUrl)}</p>
        <hr class="divider">
        <p style="font-size: 14px; color: #666;">Se você não criou uma conta, ignore este email.</p>`,
      ),
    };
  },

  welcome(email: string, nickname: string): EmailTemplate {
    return {
      subject: "Bem-vindo à 42 Rio!",
      html: baseTemplate(
        "Bem-vindo!",
        `<p>Olá <strong>${escapeHtml(nickname)}</strong>,</p>
        <p>Seja muito bem-vindo à <strong>42 Rio</strong>!</p>
        <p>Sua conta <strong>${escapeHtml(email)}</strong> foi criada com sucesso e você já pode começar sua jornada de aprendizado.</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(process.env.FRONTEND_URL || "http://localhost:3000")}" class="button">Começar Agora</a>
        </p>
        <hr class="divider">
        <p style="font-size: 14px; color: #666;">Estamos muito felizes em ter você com a gente!</p>`,
      ),
    };
  },

  loginNotification(email: string): EmailTemplate {
    return {
      subject: "Novo login detectado - 42 Rio",
      html: baseTemplate(
        "Novo Login Detectado",
        `<p>Olá,</p>
        <p>Detectamos um novo login na sua conta <strong>${escapeHtml(email)}</strong>.</p>
        <p>Se foi você, pode ignorar este email com segurança.</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(process.env.FRONTEND_URL || "http://localhost:3000")}" class="button">Acessar Conta</a>
        </p>
        <hr class="divider">
        <p style="font-size: 14px; color: #666;">Se não foi você, recomendamos que altere sua senha imediatamente e entre em contato com nosso suporte.</p>`,
      ),
    };
  },
};
