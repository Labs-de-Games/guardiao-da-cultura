import Link from "next/link";
import {
  INSTITUTION_TERMS_VERSION,
  TERMS_RECONSENT_REQUIRED_FROM,
} from "@/lib/consent/institutionTerms";
import { formatNoticeVersion } from "@/lib/consent/privacyNotice";

const h2 = {
  fontFamily: '"Jockey One", sans-serif',
  fontSize: "1.5rem",
  marginTop: 36,
  marginBottom: 8,
} as const;

const linkStyle = { color: "#6366f1" } as const;

/**
 * The Terms of Use prose (issue #338) — one copy, two readers: the modal on
 * the registration form, and the public `/termos` page.
 *
 * Deliberately excludes the title. The page renders an `<h1>` and the dialog
 * renders a `DialogTitle`; duplicating a heading inside this component would
 * give the modal two, which a screen reader reads out as a nested document.
 * The version line stays here because it belongs to the text, not the frame.
 *
 * Colours are inherited from whatever renders it rather than set here, so the
 * same prose sits correctly on the cream page and inside a white dialog. Only
 * the accents that must not drift — the draft banner's border, the links — are
 * pinned, matching `authStyles.ts`'s own approved palette rather than
 * `theme.palette.*`.
 *
 * Every operational claim below was checked against the code. Keep it that
 * way: legal framing is what review is expected to change, described behaviour
 * is not allowed to drift.
 */
export function TermsContent() {
  return (
    <>
      <p
        style={{
          border: "2px solid #1a1a1a",
          borderRadius: 8,
          padding: "12px 16px",
          fontSize: "0.875rem",
          marginBottom: 32,
          backgroundColor: "#faf6ef",
        }}
      >
        <strong>Rascunho sujeito a revisão jurídica.</strong> A descrição do que
        o painel faz e de quais dados ele mostra já foi conferida com o código.
        Continuam pendentes de definição jurídica: as{" "}
        <strong>bases legais</strong> do tratamento feito pela instituição, os{" "}
        <strong>prazos de retenção</strong>, as{" "}
        <strong>responsabilidades em caso de incidente</strong> e as condições
        de <strong>encerramento da conta</strong>.
      </p>

      <p style={{ fontSize: "0.875rem", opacity: 0.7, marginTop: 0 }}>
        Painel institucional · Versão{" "}
        {formatNoticeVersion(INSTITUTION_TERMS_VERSION)}
      </p>

      <h2 style={h2}>Quem é responsável</h2>
      <p>
        O <strong>Guardião da Cultura</strong> é um jogo educativo sobre o
        patrimônio cultural brasileiro. O painel institucional é a área restrita
        onde uma instituição cadastrada acompanha, de forma agregada, o uso do
        jogo a partir dos seus próprios links de campanha.
      </p>
      <p>
        A identificação completa da controladora e o canal oficial de contato
        serão confirmados na revisão jurídica.
      </p>

      <h2 style={h2}>Quem pode se cadastrar</h2>
      <p>
        O cadastro destina-se a <strong>instituições</strong> — escolas,
        secretarias, organizações culturais — representadas por uma pessoa
        autorizada a aceitar estes termos em nome delas. Ao concluir o cadastro,
        você declara ter essa autorização.
      </p>
      <p>
        O painel não é destinado a jogadores. Jogar não exige cadastro, login ou
        qualquer dado pessoal.
      </p>

      <h2 style={h2}>O que a conta institucional armazena</h2>
      <p>Ao se cadastrar, o sistema guarda:</p>
      <ul>
        <li>
          <strong>e-mail</strong> da pessoa responsável, usado para entrar,
          confirmar a conta e recuperar a senha;
        </li>
        <li>
          <strong>nome da instituição</strong> e um{" "}
          <strong>identificador (slug)</strong> derivado dele, que separa os
          dados de cada instituição no painel;
        </li>
        <li>
          <strong>senha</strong>, guardada apenas como hash (argon2id) — nunca
          em texto legível, e nunca recuperável, só redefinível;
        </li>
        <li>
          <strong>registro deste aceite</strong>: a versão destes termos, a data
          e a hora, associados à sua conta.
        </li>
      </ul>
      <p>
        Contas criadas via login do Google guardam os mesmos dados; a senha não
        se aplica.
      </p>

      <h2 style={h2}>O que o painel mostra</h2>
      <p>
        O painel apresenta <strong>números agregados</strong> de uso do jogo
        atribuídos aos links de campanha da sua instituição: quantas pessoas
        abriram, quantas começaram a jogar, quantas concluíram fases, e medidas
        derivadas disso.
      </p>
      <p>
        O painel <strong>não</strong> identifica jogadores. Não há nome, e-mail,
        telefone, turma, matrícula ou qualquer dado individual de quem joga —
        nem para a instituição, nem para a equipe do projeto. Jogadores não têm
        conta.
      </p>

      <h2 style={h2}>Uso aceitável</h2>
      <p>Ao usar o painel, a instituição se compromete a:</p>
      <ul>
        <li>
          manter as credenciais em sigilo e não compartilhar o acesso com quem
          não esteja autorizado;
        </li>
        <li>
          usar os números apenas para fins educacionais, de avaliação e de
          prestação de contas do próprio uso do jogo;
        </li>
        <li>
          não tentar reidentificar jogadores, cruzar os agregados com outras
          bases para esse fim, nem burlar a separação entre instituições;
        </li>
        <li>
          não automatizar acessos de forma a prejudicar a disponibilidade do
          serviço.
        </li>
      </ul>
      <p>
        O descumprimento pode levar à suspensão do acesso. Os critérios e o
        procedimento serão definidos na revisão jurídica.
      </p>

      <h2 style={h2}>Disponibilidade</h2>
      <p>
        O serviço é oferecido no estado em que se encontra, sem garantia de
        disponibilidade ininterrupta. Ele pode passar por manutenções, mudanças
        de funcionalidade e correções sem aviso prévio.
      </p>

      <h2 style={h2}>Alterações destes termos</h2>
      <p>
        Estes termos podem ser revisados. Cada versão é identificada pela sua
        data de publicação — esta é a versão{" "}
        <strong>{formatNoticeVersion(INSTITUTION_TERMS_VERSION)}</strong>.
      </p>
      <p>
        Correções que não mudem obrigações apenas atualizam esse número. Quando
        a revisão alterar o que está sendo acordado, o aceite anterior deixa de
        valer e o painel pedirá um novo aceite no próximo acesso, antes de
        liberar as telas. A versão mais antiga ainda aceita hoje é a{" "}
        <strong>{formatNoticeVersion(TERMS_RECONSENT_REQUIRED_FROM)}</strong>.
      </p>

      <h2 style={h2}>Encerramento da conta</h2>
      <p>
        O procedimento para encerrar uma conta institucional e excluir os dados
        associados ainda será definido — inclusive o prazo e o que acontece com
        o histórico de aceites. Até lá, o pedido deve ser feito pelo canal de
        contato que a revisão jurídica confirmar.
      </p>
      <p style={{ opacity: 0.75, fontSize: "0.875rem" }}>
        Exclusão de conta e revogação de consentimento ainda não estão
        disponíveis como ação no painel.
      </p>

      <h2 style={h2}>Privacidade de quem joga</h2>
      <p>
        O tratamento de dados dos jogadores é descrito no{" "}
        <Link href="/privacidade" style={linkStyle}>
          Aviso de Privacidade
        </Link>
        , que trata de decisão diferente desta e é dirigido a outro público.
      </p>
    </>
  );
}
