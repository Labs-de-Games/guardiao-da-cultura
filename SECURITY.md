<a id="portugues"></a>

# Política de segurança · Security Policy

🌐 Português (Brasil) | [English](#english)

## Como relatar uma vulnerabilidade

**Não abra uma issue pública para um problema de segurança.**

Relate pelo reporte privado de vulnerabilidades do GitHub:

1. Vá até a [aba Security](https://github.com/Labs-de-Games/guardiao-da-cultura/security)
   deste repositório.
2. Escolha **Report a vulnerability**.
3. Descreva o que você encontrou, como reproduzir e o que um atacante poderia
   fazer com isso.

O relato fica privado entre você e as pessoas mantenedoras até que uma correção
seja publicada. [@anacarla-42](https://github.com/anacarla-42) é a responsável e
acompanha as notificações dos advisories.

Não há endereço de e-mail de segurança. O advisory privado é o canal.

## O que esperar

| Etapa | Prazo |
|---|---|
| Confirmação de que o relato foi recebido | até 5 dias úteis |
| Avaliação inicial — é uma vulnerabilidade, e qual a gravidade | até 10 dias úteis |
| Uma correção ou um plano declarado, para uma vulnerabilidade confirmada | combinado com você na conversa do advisory |

Este é um projeto educacional com financiamento público, mantido por uma equipe
pequena, e não um produto com plantão 24/7. Vamos dizer com franqueza em que pé
está cada relato, em vez de deixá-lo sem resposta.

Se quiser crédito no advisory publicado, diga isso no relato.

## Escopo

Dentro do escopo:

- O código da aplicação neste repositório — o frontend Next.js, a API NestJS e
  a configuração de Docker e nginx que ele traz.
- Autenticação e sessões das contas institucionais: login com e-mail e senha,
  login com Google pelo NextAuth, verificação de e-mail e redefinição de senha.
- Qualquer coisa que permita a um jogador ou a uma instituição ler ou alterar
  os dados de outra pessoa.
- Segredos ou credenciais expostos pelo próprio repositório.

Fora do escopo:

- Instâncias publicadas por terceiros. Relate a quem as mantém.
- Vulnerabilidades em dependências de terceiros sem caminho explorável neste
  código — relate ao projeto de origem. Se o caminho *for* explorável aqui, está
  no escopo; explique como.
- Resultados de scanners automáticos sem impacto demonstrado.
- Ausência de headers de hardening ou recomendações de boas práticas sem um
  ataque concreto. Essas são bem-vindas como issues comuns.
- Engenharia social, acesso físico e negação de serviço por volume de tráfego.

## Versões com suporte

Só a release mais recente e a branch `develop` atual recebem correções de
segurança. Tags antigas são históricas.

## Tratamento de dados pessoais

Jogadores jogam sem conta: o jogo guarda um identificador anônimo de visitante,
o progresso e as medalhas. As contas institucionais guardam um e-mail, um nome ou
apelido, o nome da instituição, um hash da senha (nas contas com senha) e os
registros de aceite dos termos. Se o relato
envolver dados pessoais, mencione isso — muda a prioridade da correção e se a
divulgação precisa ser coordenada com as instituições por trás do projeto.

---

<a id="english"></a>

## English

🌐 [Português (Brasil)](#portugues) | English

### Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it through GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/Labs-de-Games/guardiao-da-cultura/security)
   of this repository.
2. Choose **Report a vulnerability**.
3. Describe what you found, how to reproduce it, and what an attacker could do
   with it.

The report stays private between you and the maintainers until a fix is
published. [@anacarla-42](https://github.com/anacarla-42) is the responder and
follows the advisory notifications.

There is no security email address. The private advisory is the channel.

### What to expect

| Step | Target |
|---|---|
| Acknowledgement that the report was received | within 5 working days |
| An initial assessment — is it a vulnerability, and how severe | within 10 working days |
| A fix or a stated plan, for a confirmed vulnerability | agreed with you in the advisory thread |

This is a publicly funded educational project maintained by a small team, not a
product with a 24/7 on-call rotation. We will tell you honestly where a report
sits rather than let it go quiet.

If you would like credit in the published advisory, say so in the report.

### Scope

In scope:

- The application code in this repository — the Next.js frontend, the NestJS
  API, and the Docker and nginx configuration it ships.
- Authentication and sessions for institution accounts: email and password
  sign-in, Google sign-in through NextAuth, email verification and password
  reset.
- Anything that lets one player or institution read or change someone else's
  data.
- Secrets or credentials exposed by the repository itself.

Out of scope:

- Deployed instances run by third parties. Report those to whoever runs them.
- Vulnerabilities in third-party dependencies with no exploitable path in this
  code — report those upstream. If the path *is* exploitable here, it is in
  scope; please say how.
- Findings from an automated scanner with no demonstrated impact.
- Missing hardening headers or best-practice recommendations with no concrete
  attack. These are welcome as ordinary issues.
- Social engineering, physical access, and denial of service by traffic volume.

### Supported versions

Only the latest release and the current `develop` branch receive security
fixes. Older tags are historical.

### Handling of personal data

Players play without an account: the game stores an anonymous guest identifier,
gameplay progress and badge state. Institution accounts store an email address,
a name or nickname, the institution's name, a password hash (for password
accounts) and terms-of-use consent records. If a
report involves personal data, mention it — it changes how we prioritise the
fix and whether disclosure needs to be coordinated with the institutions behind
the project.
