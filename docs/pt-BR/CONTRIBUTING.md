🌐 [English](../en/CONTRIBUTING.md) | Português (Brasil)

# Como contribuir com Guardião da Cultura

Contribuições são bem-vindas — relatos de bugs, correções, conteúdo novo para
fases, traduções, melhorias de acessibilidade.

Este guia é para qualquer pessoa que trabalhe no projeto, faça ela parte do time
principal ou não. [@anacarla-42](https://github.com/anacarla-42) mantém o
repositório, revisa e faz o merge dos pull requests.

Para as diretrizes de colaboração com agentes de IA, veja [AGENTS.md](../../AGENTS.md).

## Sumário

- [Antes de começar](#antes-de-começar)
- [Como reportar um problema](#como-reportar-um-problema)
- [Colocando o projeto para rodar](#colocando-o-projeto-para-rodar)
- [Comandos](#comandos)
- [Limitações conhecidas](#limitações-conhecidas)
- [Estrutura do projeto](#estrutura-do-projeto)
- [O fluxo de contribuição](#o-fluxo-de-contribuição)
  - [1. Fork e branch](#1-fork-e-branch)
  - [2. Faça suas alterações](#2-faça-suas-alterações)
  - [3. Mensagens de commit](#3-mensagens-de-commit)
  - [4. Abra um pull request](#4-abra-um-pull-request)
  - [5. Revisão](#5-revisão)
- [O que o CI executa](#o-que-o-ci-executa)
- [Git hooks](#git-hooks)
- [Padrões de código](#padrões-de-código)
- [Alterando assets ou créditos](#alterando-assets-ou-créditos)
- [Solução de problemas](#solução-de-problemas)
- [Recursos](#recursos)

## Antes de começar

Vale a pena saber duas coisas logo de cara.

**As regras dos assets não são as regras do código.** O código-fonte é MIT. Tudo
o que está em `front/public/assets/` não é — veja
[`ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md). Se a sua contribuição adiciona,
remove ou altera um asset, leia [Alterando assets ou créditos](#alterando-assets-ou-créditos)
antes de abrir o pull request.

**A branch padrão de trabalho é a `develop`.** Crie sua branch a partir dela e
abra o pull request contra ela. A `master` recebe apenas pull requests de release.

## Como reportar um problema

Abra uma issue e inclua o suficiente para que outra pessoa veja o que você viu:

- O que você fez, o que esperava e o que aconteceu.
- Qual fase e qual parte dela, se for um bug de gameplay.
- Navegador e sistema operacional.
- Saída do console ou um screenshot, se houver.

Para um problema de **segurança**, não abra uma issue — siga o
[`SECURITY.md`](../../SECURITY.md).

Se você pretende trabalhar em algo grande, abra uma issue antes para que ninguém
duplique o esforço.

## Colocando o projeto para rodar

Você precisa de Node.js 24+, Docker com Docker Compose e Git. Nenhuma API key,
conta de email ou serviço pago é necessário.

```bash
git clone https://github.com/<your-username>/gameplate.git
cd gameplate

cp .env.example .env    # the defaults are a working local configuration
make setup              # dependencies and pre-commit hooks
make development-up     # start the stack
make db-migrate         # create the schema and seed the badges
```

Abra <http://localhost:3000>. Para fazer login, digite qualquer endereço de
email — com `EMAIL_PROVIDER=mock`, o magic link é impresso no log do backend em
vez de ser enviado por email:

```bash
make development-logs
```

Para rodar sem Docker: `make local-all`.

Se alguma coisa aqui não funcionar em uma máquina limpa, isso é um bug que vale
a pena reportar.

Serviços:

- **Frontend** (Next.js): <http://localhost:3000>
- **Backend** (NestJS): <http://localhost:3001>
- **PostgreSQL**: localhost:5432
- **nginx** (reverse proxy): <http://localhost:80>

O conteúdo das fases fica em JSON estático, então `make db-migrate` é toda a
configuração de banco de que uma instalação jogável precisa. Veja
[`CONTENT-REUSE.md`](./CONTENT-REUSE.md).

As integrações opcionais (narração com ResponsiveVoice, analytics com PostHog)
vêm desativadas no `.env.example`, e o jogo roda completo sem elas. Veja
[`ARCHITECTURE.md`](./ARCHITECTURE.md#integrações-opcionais).

## Comandos

### Desenvolvimento

| Comando | Descrição |
|---------|-------------|
| `make setup` | Instala as dependências e o ferramental de desenvolvimento |
| `make development-up` (alias `make up`) | Sobe a stack de desenvolvimento com hot reload (Docker) |
| `make local-all` | Sobe o front e o back localmente via Turbo (sem Docker) |
| `make down` | Para os containers de desenvolvimento |
| `make clean` | Para os containers e remove os volumes |
| `make deep-clean` | Limpeza completa, incluindo as imagens |

### Qualidade de código

| Comando | Descrição |
|---------|-------------|
| `make lint` | Roda as verificações de lint e formatação do Biome |
| `make test` | Roda as suítes de teste |
| `make check` | Lint e testes de uma vez só |
| `npm run lint:fix` | Corrige os problemas de lint que podem ser corrigidos automaticamente |

### Banco de dados

| Comando | Descrição |
|---------|-------------|
| `make db-migrate` | Roda as migrations pendentes do TypeORM |
| `make db-migrate-generate` | Gera uma nova migration (`NAME=MigrationName`) |

### Debug

| Comando | Descrição |
|---------|-------------|
| `make development-logs` | Acompanha os logs dos containers de desenvolvimento |
| `make development-ps` | Lista os containers de desenvolvimento |
| `make development-shell-front` | Abre um shell no container do front |
| `make development-shell-back` | Abre um shell no container do back |

## Limitações conhecidas

- **Apenas em português.** Toda a narrativa, os quizzes e os textos da UI estão
  em `pt-BR`. Ainda não existe uma camada de localização.
- **Pensado primeiro para desktop.** O jogo foi feito para teclado e uma
  viewport razoavelmente larga; controles de toque não estão implementados.
- **Quatro fases.** As fases 1–3 são fases de mapa no `LEVEL_REGISTRY`
  (`front/src/game/data/LevelConfig.ts`). A fase 4 é a tela final de
  investigação, deliberadamente mantida fora do registry (veja
  `front/src/game/constants/Investigation.ts`). Quais fases os jogadores podem
  acessar é definido por `LEVEL_ENABLED` em `front/src/game/constants/FeatureFlags.ts`.
- **Alguns assets de som e imagem incluídos não são livres para reuso comercial.**
  Eles estão listados um a um no [`ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md) §5.
- **A qualidade da fala do navegador varia.** Sem uma key do ResponsiveVoice, a
  narração usa a voz `pt-BR` que o navegador e o sistema operacional do
  visitante oferecerem. Veja [Sem narração](#solução-de-problemas).

## Estrutura do projeto

```
.
├── front/                      # Next.js application
│   ├── src/
│   │   ├── app/                # App Router pages, layouts and API routes
│   │   ├── game/               # Phaser game domain (scenes, objects, systems)
│   │   ├── ui/                 # React HUD and panels layered over the canvas
│   │   └── lib/                # Utilities, env parsing, audio services
│   └── public/assets/          # Game assets — SEPARATE LICENCE, see ASSETS-LICENSE.md
│       └── data/levels/        # Level content: quizzes, NPCs, works, collectibles
├── back/                       # NestJS API
│   └── src/
│       ├── core/               # Config, database, health checks
│       └── modules/            # Feature modules (auth, game, progression, ...)
├── .github/workflows/          # CI/CD pipelines
├── compose.*.yaml              # Docker Compose stacks per environment
├── nginx/                      # Reverse proxy configuration
├── Makefile                    # Common development commands
└── docs/                       # Documentation
    ├── en/                     # English docs and notes
    └── pt-BR/                  # Brazilian Portuguese docs and notes
```

## O fluxo de contribuição

### 1. Fork e branch

Contribuidores externos trabalham a partir de um fork. Membros do time criam
branches diretamente.

Crie a branch a partir da `develop`:

```bash
git checkout develop
git pull
git checkout -b feat/42-user-authentication
```

Nomenclatura:

- `feat/<id>-<description>` — novas funcionalidades
- `fix/<id>-<description>` — correções de bugs
- `docs/<description>` — documentação
- `chore/<description>` — manutenção
- `refactor/<description>` — refatoração
- `test/<description>` — apenas testes
- `style/<description>` — formatação, sem mudança de comportamento
- `ci/<description>` — mudanças de CI e workflows
- `hotfix/<description>`, `release/<version>` — apenas para quem mantém o
  projeto, em pull requests para a `master`

O `<id>` é o número da issue, quando houver uma. Depois do prefixo, use letras
minúsculas, dígitos, `.`, `_` e `-`. A verificação `branch-policy` do CI reprova
um pull request cuja branch não siga essas regras.

### 2. Faça suas alterações

- Mantenha cada branch focada em um único assunto. Um pull request pequeno e
  fácil de revisar entra mais rápido do que um grande.
- Siga o estilo e os padrões do código ao redor em vez de introduzir os seus
  próprios.
- Adicione ou atualize testes para o comportamento que você alterar.
- Rode `make check` (lint e testes) antes de fazer push.
- A documentação fica em duas árvores, `docs/en/` e `docs/pt-BR/`, com os
  mesmos nomes de arquivo. Quando as duas versões divergem, vale a em inglês.
  Um pull request que altera um documento em um idioma atualiza o outro no
  mesmo pull request, ou abre uma issue de acompanhamento com a label
  `documentation`. As notas de trabalho em `notes/` não são traduzidas.

### 3. Mensagens de commit

Os commits precisam seguir o [Conventional Commits](https://www.conventionalcommits.org/).
Isso é garantido pelo `commitlint` em um git hook, então uma mensagem mal
formatada é rejeitada localmente antes de chegar ao CI.

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

**Escopos:** `front`, `back`, `infra`, `docs`, `ci`.

Exemplos:

```
feat(front): add phaser game scene loader
fix(back): correct JWT token expiration handling
docs(readme): update environment setup instructions
```

Escreva a descrição no imperativo, em letras minúsculas e sem ponto final.

### 4. Abra um pull request

1. Faça push da sua branch.
2. Abra o pull request **contra a `develop`**. A `master` só aceita pull
   requests vindos da `develop`, de `release/*` ou de `hotfix/*`, e o CI reprova
   qualquer outro.
3. Descreva o que mudou e por quê. Se for uma mudança visível, anexe um
   screenshot ou uma gravação curta.
4. Vincule a issue que ele fecha.
5. Confirme que o CI está verde.

Um pull request vindo de um fork roda apenas o `ci.yml` e o `branch-policy.yml`. Os workflows de deploy
nunca rodam para um fork.

### 5. Revisão

- Uma pessoa mantenedora revisa e faz o merge. Espere perguntas — elas são sobre
  o código, não sobre você.
- Faça push de commits de ajuste em vez de dar force push por cima da revisão,
  para que quem revisa consiga ver o que mudou.
- Os merges na `develop` usam "Squash and merge" ou "Rebase and merge". Pull
  requests de release, hotfix e back-merge usam "Create a merge commit", o único
  método que a `master` aceita.
- Apague a branch depois do merge.

## O que o CI executa

Todo pull request dispara o `.github/workflows/ci.yml`:

| Etapa | Comando |
|---|---|
| Typecheck | `npm run typecheck` |
| Lint | `make lint` |
| Build | `npm run build` |
| Testes | `make test` |

As quatro precisam passar antes de um merge. O
`.github/workflows/branch-policy.yml` também roda em todo pull request e confere
o nome da branch e a branch de destino descritos em
[1. Fork e branch](#1-fork-e-branch).

A `master` e a `develop` são protegidas por rulesets definidos em
`.github/rulesets/`: sem push direto, sem force push nem exclusão, uma aprovação
e as duas verificações verdes, reportadas pelo GitHub Actions. Na `develop` a
aprovação precisa ser de um code owner. A `master` aceita apenas merge commits,
para que o histórico continue alinhado com a `develop`. Depois de um release ou
hotfix, um pull request da `master` para a `develop` traz os merge commits de
volta. Uma correção para produção passa por uma branch `hotfix/*`, nunca direto
na `master`. Quem mantém o projeto aplica os rulesets com `make rulesets-apply`
e confere mudanças feitas nas configurações do GitHub com `make rulesets-diff`.

Você pode rodar o mesmo conjunto do CI localmente:

```bash
npm run typecheck && npm run lint && npm run build && npm run test
```

O deploy é exclusivo de quem mantém o projeto. Pushes na `develop` fazem deploy
para um ambiente de staging, e a produção é um dispatch manual a partir da
`master`; os dois rodam em uma infraestrutura à qual contribuidores não têm
acesso, e nenhum deles pode ser disparado a partir de um fork.

## Git hooks

Instalados pelo `make setup` (que roda `npm run prepare`):

| Hook | O que faz |
|---|---|
| pre-commit | `npm run typecheck` e, em seguida, o Biome nos arquivos em stage via `lint-staged` |
| commit-msg | o `commitlint` valida o formato da mensagem |
| pre-push | roda a suíte de testes |

Para pulá-los em uma emergência — não recomendado, e o CI vai rodar mesmo assim:

```bash
git commit --no-verify -m "your message"
```

## Padrões de código

**Lint e formatação** usam o [Biome](https://biomejs.dev/):

```bash
make lint          # check
npm run lint:fix   # fix what can be fixed automatically
```

**Testes:**

```bash
make test                  # everything
cd front && npm test        # one workspace
```

**Tipos:** TypeScript em strict mode. Evite `any`. Defina interfaces para os
contratos de API.

## Alterando assets ou créditos

Assets trazem obrigações que o código não traz.

- **Adicionando um asset de terceiros.** Confira se a licença permite a
  redistribuição. Adicione-o ao `front/src/ui/credits/creditsData.ts`, ao
  [`CREDITS.md`](../../CREDITS.md) e ao
  [`ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md) **no mesmo pull request**.
  Inclua o autor, a URL de origem e a licença. Uma contribuição que adicione um
  asset sem crédito não vai entrar.
- **Evite licenças NonCommercial e sem derivações.** Elas são incompatíveis com
  o resto do projeto. Se você não encontrar um asset livre adequado, diga isso no
  pull request em vez de incluir um asset restrito sem avisar.
- **Não adicione nada que use os logos ou as marcas dos patrocinadores.** Eles
  não são licenciados — veja o [`NOTICE`](../../NOTICE).
- **`creditsData.ts` e `CREDITS.md` são a mesma obrigação em dobro.** Eles nunca
  podem ficar dessincronizados.

A edição do conteúdo das fases — quizzes, diálogos, as obras expostas — é
tratada no [`CONTENT-REUSE.md`](./CONTENT-REUSE.md).

## Solução de problemas

**Docker**

```bash
make clean && make development-up       # reset containers and volumes
make deep-clean && make development-up  # also remove images
```

**Conflitos de porta** na 3000, 3001 ou 5432: pare o serviço conflitante ou
altere os mapeamentos em `compose.development.yaml`.

**Dependências**

```bash
rm -rf node_modules front/node_modules back/node_modules
npm ci
```

**Sem narração.** `RESPONSIVEVOICE_API_KEY` é opcional. Deixe-a vazia
(`RESPONSIVEVOICE_API_KEY=`, como no `.env.example`) e o `/api/tts/synthesize`
responde `503`, então o jogo cai para a síntese de fala do navegador. Não use um
valor placeholder: qualquer valor não vazio é tratado como uma key real e o
ResponsiveVoice o rejeita, então a rota responde `502` em todas as falas.

A voz do navegador depende do sistema operacional e do navegador, e nem sempre
funciona de primeira. Alguns sistemas, principalmente o Linux, precisam de um
motor de fala instalado no nível do sistema operacional, ou do navegador
iniciado com uma flag ou configuração específica, antes que qualquer voz fique
disponível. Para verificar, rode isto no console do navegador:

```js
speechSynthesis.getVoices();
```

Uma lista vazia, ou uma sem nenhuma voz `pt-BR`, significa que a narração vai
ficar muda — isso é o navegador, não o jogo. Instale ou habilite um motor de
fala para o seu sistema e navegador e depois recarregue a página.

**O magic link nunca chega.** Com `EMAIL_PROVIDER=mock`, nenhum email é enviado.
Pegue o link em `make development-logs`.

## Recursos

- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do NestJS](https://docs.nestjs.com/)
- [Documentação do Phaser](https://phaser.io/docs/)
- [Documentação do Biome](https://biomejs.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
