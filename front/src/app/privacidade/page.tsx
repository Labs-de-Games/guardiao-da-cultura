import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_NOTICE_VERSION } from "@/lib/consent/privacyNotice";

export const metadata: Metadata = {
  title: "Aviso de Privacidade — Guardião da Cultura",
  description:
    "Como o Guardião da Cultura coleta e usa dados durante o jogo, e como alterar sua escolha.",
};

/**
 * Deliberately outside the `(game)` route group, and outside the middleware
 * matcher — reading the privacy notice must not itself mint the identity
 * cookie.
 *
 * The text below is a PLACEHOLDER pending legal review (issue #864). It is
 * written to be factually accurate about what the code does today, which is
 * the part that must not drift; the wording and the legal framing are what
 * review is expected to change.
 */
export default function PrivacyNoticePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        overflowY: "auto",
        backgroundColor: "#161717",
        color: "#f4eede",
        fontFamily: '"Inter", sans-serif',
        padding: "48px 24px 96px",
      }}
    >
      <article style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.7 }}>
        <p
          style={{
            border: "2px solid #af7e2f",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: "0.875rem",
            marginBottom: 32,
          }}
        >
          <strong>Rascunho sujeito a revisão jurídica.</strong> O conteúdo desta
          página descreve com precisão o que o sistema coleta hoje, mas ainda
          não foi validado por responsável jurídico ou de compliance.
        </p>

        <h1
          style={{
            fontFamily: '"Jockey One", sans-serif',
            fontSize: "2.5rem",
            marginBottom: 8,
          }}
        >
          Aviso de Privacidade
        </h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.75, marginTop: 0 }}>
          Versão {PRIVACY_NOTICE_VERSION}
        </p>

        <h2>Quem somos</h2>
        <p>
          O <strong>Guardião da Cultura</strong> é um jogo educativo sobre o
          patrimônio cultural brasileiro. Não é necessário criar conta, informar
          nome ou e-mail para jogar.
        </p>

        <h2>Dados de uso do jogo (depende da sua autorização)</h2>
        <p>
          Com a sua autorização, registramos eventos de jogo no{" "}
          <strong>PostHog</strong>: fases iniciadas e concluídas, respostas de
          quiz, pontuação, tempo de jogo, interações com personagens e erros da
          aplicação. Esses eventos ficam associados a um identificador aleatório
          do navegador, não ao seu nome ou e-mail.
        </p>
        <p>
          Enquanto você não autorizar, o PostHog <strong>não é iniciado</strong>
          , nenhum evento é enviado e nenhum cookie ou registro dele é criado no
          seu navegador. Eventos ocorridos antes da autorização{" "}
          <strong>não</strong> são enviados depois.
        </p>
        <p>
          Não fazemos gravação de sessão, <em>session replay</em> nem captura da
          tela do jogo.
        </p>

        <h2>Dados coletados independentemente da sua escolha</h2>
        <p>
          Para que o jogo funcione e para medir o alcance do projeto, os itens
          abaixo continuam ativos mesmo se você recusar os dados de uso. Estamos
          registrando isso aqui por transparência:
        </p>
        <ul>
          <li>
            <strong>Progresso do jogo</strong> — pontuação, fases concluídas e
            eventos de partida são gravados nos nossos próprios servidores para
            que o jogo funcione e para relatórios agregados do projeto.
          </li>
          <li>
            <strong>Contentsquare</strong> — serviço de terceiros que analisa a
            navegação nas páginas.
          </li>
          <li>
            <strong>Google Ads</strong> — medição de conversão de anúncios.
          </li>
        </ul>

        <h2>Cookies que usamos</h2>
        <ul>
          <li>
            <code>gp_distinct_id</code> — identificador aleatório do navegador,
            necessário para manter seu progresso como visitante. Validade de
            aproximadamente 400 dias.
          </li>
          <li>
            <code>gp_analytics_consent</code> — guarda se você autorizou ou
            recusou os dados de uso.
          </li>
          <li>
            <code>gp_guest_play</code> — controle interno de disponibilidade do
            jogo.
          </li>
        </ul>
        <p>
          Sua escolha também é guardada no armazenamento local do navegador,
          junto da data em que foi feita e da versão deste aviso.
        </p>

        <h2>Como alterar sua escolha</h2>
        <p>
          Abra <strong>Privacidade</strong> na tela do mapa, dentro do jogo.
          Você pode autorizar depois de ter recusado, ou revogar uma autorização
          já concedida. Ao revogar, o envio de novos eventos é interrompido na
          hora e os identificadores do PostHog são apagados do seu navegador.
        </p>

        <h2>Finalidade e não uso</h2>
        <p>
          Os dados de uso servem para avaliar e melhorar o jogo e para
          relatórios do projeto. Não usamos esses dados para publicidade
          direcionada nem para criação de perfil comercial, e não coletamos
          nome, e-mail, CPF ou outros dados cadastrais de jogadores.
        </p>

        <h2>Contato</h2>
        <p>
          Dúvidas sobre este aviso ou sobre seus dados podem ser encaminhadas
          aos mantenedores do projeto pelo repositório oficial.
        </p>

        <p style={{ marginTop: 40 }}>
          <Link href="/" style={{ color: "#d9ad56" }}>
            ← Voltar ao início
          </Link>
        </p>
      </article>
    </main>
  );
}
