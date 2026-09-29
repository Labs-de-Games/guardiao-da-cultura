import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_NOTICE_VERSION } from "@/lib/consent/privacyNotice";

export const metadata: Metadata = {
  title: "Aviso de Privacidade — Guardião da Cultura",
  description:
    "Como o Guardião da Cultura coleta e usa dados durante o jogo, e como alterar sua escolha.",
};

const h2 = {
  fontFamily: '"Jockey One", sans-serif',
  fontSize: "1.5rem",
  marginTop: 36,
  marginBottom: 8,
} as const;

const dt = { color: "#d9ad56" } as const;

/**
 * Deliberately outside the `(game)` route group, and outside the middleware
 * matcher — reading the privacy notice must not itself mint the identity
 * cookie.
 *
 * Content derived from the Instituto 42 Rio legal draft (minuta v1.0), reduced
 * to what a *player* deciding on the consent gate needs. The institutional side
 * of that document (Termos de Uso, cadastro e dashboard institucional, licença
 * open source, resposta a incidentes) is deliberately not reproduced here — it
 * belongs to a Terms of Use page, not to this decision.
 *
 * Every factual claim below was checked against the code, and where the draft
 * and the code disagree the code wins (see the Google Ads note in §"Coletas que
 * não dependem da sua escolha"). Keep it that way: the legal framing is what
 * review is expected to change, the behaviour described is not allowed to
 * drift.
 *
 * The draft's "Hotjar" and the Contentsquare tag this page used to disclose
 * were one and the same vendor — Hotjar is a Contentsquare product, and the
 * commit that added `t.contentsquare.net/uxa/` called it "hotjar". Both are
 * gone: the tag was removed from the root layout, so neither name belongs here.
 */
export default function PrivacyNoticePage() {
  return (
    <main
      style={{
        // The root layout pins `body` to `height: 100vh; overflow: hidden` so
        // the Phaser canvas never scrolls, which means a plain `minHeight`
        // block just gets clipped — this page has to own its own scroll
        // container. `position: fixed` + `inset: 0` bounds it to the viewport
        // regardless of what the provider wrappers above it do, and sidesteps
        // the mobile `100vh` toolbar quirk.
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        backgroundColor: "#161717",
        color: "#f4eede",
        fontFamily: '"Inter", sans-serif',
        padding: "48px 24px 96px",
        boxSizing: "border-box",
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
          <strong>Rascunho sujeito a revisão jurídica.</strong> A identificação
          da responsável e a descrição do que o sistema coleta já foram
          conferidas com o produto. Continuam pendentes de definição jurídica:
          as <strong>bases legais</strong> de cada finalidade, os{" "}
          <strong>prazos de retenção</strong> e as regras aplicáveis a{" "}
          <strong>crianças e adolescentes</strong>.
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
          Guardião da Cultura · Versão {PRIVACY_NOTICE_VERSION}
        </p>

        <h2 style={h2}>Quem é responsável</h2>
        <p>
          O <strong>Guardião da Cultura</strong> é um jogo educativo sobre o
          patrimônio cultural brasileiro, mantido pelo{" "}
          <strong>Instituto 42 Rio</strong>. Não é necessário criar conta,
          informar nome ou e-mail para jogar.
        </p>
        <ul>
          <li>
            <span style={dt}>Instituto 42 Rio</span> — Associação Privada, CNPJ
            36.233.390/0001-97
          </li>
          <li>
            <span style={dt}>Endereço</span> — Avenida Oscar Niemeyer, nº 2000,
            Bloco 1, Sala 301, Santo Cristo, Rio de Janeiro/RJ, CEP 20220-297
          </li>
          <li>
            <span style={dt}>Privacidade e direitos do titular</span> —{" "}
            <a href="mailto:contato@42.rio" style={{ color: "#d9ad56" }}>
              contato@42.rio
            </a>
          </li>
          <li>
            <span style={dt}>Suporte</span> —{" "}
            <a href="mailto:ana.carla@42.rio" style={{ color: "#d9ad56" }}>
              ana.carla@42.rio
            </a>
          </li>
          <li>
            <span style={dt}>Encarregado (DPO)</span> — não aplicável
          </li>
        </ul>

        <h2 style={h2}>Dados de uso do jogo (depende da sua autorização)</h2>
        <p>Com a sua autorização, registramos:</p>
        <ul>
          <li>
            <strong>Eventos de jogo</strong> — início de partida, fases
            iniciadas, abandonadas e concluídas, respostas de quiz, pontuação,
            medalhas conquistadas, tempo de jogo e abertura de configurações.
          </li>
          <li>
            <strong>Desempenho e interação</strong> — métricas técnicas de
            carregamento da página (Web Vitals) e cliques que não geram ação.
          </li>
          <li>
            <strong>Origem do acesso</strong> — parâmetros de campanha (UTM),
            incluindo o parâmetro próprio que identifica a instituição de
            origem.
          </li>
          <li>
            <strong>Erros da aplicação</strong> — falhas técnicas, para
            diagnóstico.
          </li>
        </ul>
        <p>
          Esses eventos ficam associados a um identificador aleatório do
          navegador, não ao seu nome ou e-mail, e vão para dois destinos: o{" "}
          <strong>PostHog</strong> e os{" "}
          <strong>nossos próprios servidores</strong>.
        </p>
        <p>
          Enquanto você não autorizar, o PostHog <strong>não é iniciado</strong>
          , nenhum evento é enviado a nenhum dos dois destinos, e nenhum cookie
          ou registro do PostHog é criado no seu navegador. Eventos ocorridos
          antes da autorização <strong>não</strong> são enviados depois, nem
          ficam guardados esperando por ela.
        </p>
        <p>
          <strong>Não fazemos gravação de sessão</strong> (
          <em>session replay</em>
          ), nem captura da tela do jogo. O recurso está desativado na
          configuração do PostHog, e não apenas amostrado em zero.
        </p>

        <h2 style={h2}>Para que usamos esses dados</h2>
        <ul>
          <li>Viabilizar as funcionalidades do jogo;</li>
          <li>
            Produzir indicadores de uso agregados, associados à instituição de
            origem, para relatórios do projeto;
          </li>
          <li>
            Compreender a navegação, a dificuldade de uso e o desempenho do
            produto;
          </li>
          <li>Diagnosticar falhas técnicas e prestar suporte;</li>
          <li>
            Atender solicitações de titulares e cumprir obrigações legais ou
            regulatórias.
          </li>
        </ul>
        <p>
          Não usamos esses dados para publicidade direcionada nem para criação
          de perfil comercial, e não coletamos nome, e-mail, CPF ou outros dados
          cadastrais de jogadores. As instituições enxergam apenas indicadores
          agregados — sessões, jogadores distintos, duração, aprovação em
          quizzes e progressão por fase. Não existe relatório individual por
          jogador.
        </p>
        <p style={{ opacity: 0.75, fontSize: "0.875rem" }}>
          Base legal de cada finalidade: a definir em revisão jurídica.
        </p>

        <h2 style={h2}>Para onde os dados vão</h2>
        <p>
          Usamos o <strong>PostHog Cloud</strong>, cujo endpoint de ingestão
          fica nos <strong>Estados Unidos</strong> (
          <code>us.i.posthog.com</code>
          ). Ao autorizar os dados de uso, você está autorizando também essa{" "}
          <strong>transferência internacional</strong>. Os eventos enviados aos
          nossos próprios servidores ficam em banco de dados da aplicação, sem
          porta exposta à internet.
        </p>

        <h2 style={h2}>Coletas que não dependem da sua escolha</h2>
        <p>
          Os itens abaixo continuam ativos mesmo se você recusar os dados de
          uso. Estamos registrando isso aqui por transparência:
        </p>
        <ul>
          <li>
            <strong>Seu progresso no jogo</strong> — pontuação, fases concluídas
            e itens coletados. Como jogador convidado, isso fica gravado{" "}
            <strong>apenas no seu próprio navegador</strong>, não nos nossos
            servidores. É o seu jogo salvo, não uma medição sobre você, e limpar
            os dados do navegador apaga esse progresso.
          </li>
          <li>
            <strong>Google Ads</strong> — medição de conversão de anúncios.
          </li>
          <li>
            <strong>Infraestrutura</strong> — Cloudflare (entrada do tráfego e
            HTTPS), Google Fonts (fontes) e ResponsiveVoice (síntese de voz para
            acessibilidade) recebem requisições do seu navegador para funcionar.
          </li>
        </ul>

        <h2 style={h2}>Cookies e armazenamento local</h2>
        <ul>
          <li>
            <code>gp_distinct_id</code> — identificador aleatório do navegador,
            necessário para manter seu progresso como visitante. Validade de
            aproximadamente 400 dias.
          </li>
          <li>
            <code>gp_distinct_id_seeded</code> — marcador técnico que indica que
            o identificador acabou de ser criado. Validade de 60 segundos.
          </li>
          <li>
            <code>gp_analytics_consent</code> — guarda se você autorizou ou
            recusou os dados de uso.
          </li>
          <li>
            <code>gp_guest_play</code> — controle interno de disponibilidade do
            jogo.
          </li>
          <li>
            <code>ph_…_posthog</code> — identidade e dados do PostHog.{" "}
            <strong>Só é criado depois da sua autorização</strong>, e é apagado
            se você revogar.
          </li>
        </ul>
        <p>
          Além disso, o jogo usa o armazenamento local do navegador para o seu
          progresso, medalhas, preferências de áudio e para a sua escolha de
          privacidade — junto da data em que foi feita e da versão deste aviso.
        </p>

        <h2 style={h2}>Por quanto tempo guardamos</h2>
        <p>
          O identificador <code>gp_distinct_id</code> tem validade de
          aproximadamente 400 dias. A retenção dos eventos no PostHog segue a
          configuração do painel. Os <strong>prazos definitivos</strong> de
          retenção, exclusão e anonimização ainda serão definidos em revisão
          jurídica — hoje não existe rotina automática de expurgo nas tabelas da
          aplicação.
        </p>

        <h2 style={h2}>Como alterar sua escolha</h2>
        <p>
          Abra <strong>Privacidade</strong> na tela do mapa, dentro do jogo.
          Você pode autorizar depois de ter recusado, ou revogar uma autorização
          já concedida. Ao revogar, o envio de novos eventos é interrompido na
          hora e os identificadores do PostHog são apagados do seu navegador.
        </p>
        <p>
          Recusar <strong>não bloqueia o jogo</strong>: todas as fases,
          atividades e recursos de acessibilidade continuam disponíveis.
        </p>

        <h2 style={h2}>Seus direitos</h2>
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção e,
          quando cabível, eliminação, anonimização, bloqueio, portabilidade,
          oposição e revogação do consentimento. O canal para essas solicitações
          é{" "}
          <a href="mailto:contato@42.rio" style={{ color: "#d9ad56" }}>
            contato@42.rio
          </a>
          .
        </p>

        <h2 style={h2}>Crianças e adolescentes</h2>
        <p>
          O jogo não pede idade, nome ou data de nascimento, e não possui
          verificação etária nem fluxo específico para responsáveis legais. As
          regras aplicáveis a crianças e adolescentes serão definidas em revisão
          jurídica. Se você é responsável por uma criança que usa o jogo e tem
          dúvidas, escreva para{" "}
          <a href="mailto:contato@42.rio" style={{ color: "#d9ad56" }}>
            contato@42.rio
          </a>
          .
        </p>

        <h2 style={h2}>Alterações deste aviso</h2>
        <p>
          Mudanças relevantes indicarão nova versão e data de vigência e, quando
          necessário, pedirão uma nova escolha. A continuidade do uso não é
          tratada como autorização para novas finalidades.
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
