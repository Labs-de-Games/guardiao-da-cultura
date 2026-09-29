# Status de Implementação — Épico #738: Dashboard do Edital

Este documento era originalmente um plano de execução prospectivo (uma etapa por issue, escrito antes
de qualquer parte do trabalho começar). Todas as 12 sub-issues (#739–#748, mais #807 e #808,
adicionadas depois que este plano foi escrito) já foram entregues em `feat/dashboard-edital`. Esta
revisão substitui o plano por um **registro de status**: o que cada etapa de fato virou, verificado
contra o código desta branch, e não o que foi proposto.

Renomeado de `implementation-plan-738-dashboard-edital.md` para tirar o número da issue do nome do
arquivo (o épico é a #738 de qualquer forma; o número não acrescentava nada encontrável que o
conteúdo e o diretório já não dessem).

Legenda: ✅ entregue como planejado · 🔁 entregue, materialmente diferente do plano · ➕ entregue, fora
do plano original.

---

## O que foi entregue além das 10 issues originais

Duas sub-issues foram adicionadas no meio do épico, depois que a ordem abaixo foi escrita, e estão
incorporadas nas etapas relevantes:

- **#807** — links de campanha por turma e métricas por fase. Adiciona uma entity/tabela real no
  backend, `CampaignLink` (`back/src/modules/campaign-links/`), além do design do plano de "registry
  em TypeScript, sem tabela" para as origens no nível da instituição — links de turma são dinâmicos e
  criados pelo usuário, então precisam de uma persistência que o registry estático não oferece.
- **#808** — um dashboard agregado público e sem autenticação (`front/src/app/public-dashboard/page.tsx`,
  `front/src/app/api/public/dashboard/route.ts`) para reporte externo ao programa Rouanet,
  reaproveitando a camada de query/cache construída na etapa 4, mas com seus próprios query builders
  irmãos (`globalQueries.ts`, `globalMetrics.ts`) que nunca recebem um `Scope` — agregado de todo mundo
  por design, nunca por instituição.

Uma terceira adição, que não é rastreada por nenhum dos números de issue originais: **o cadastro de
instituição com senha agora envia um email real de confirmação** (no estilo magic link, espelhando o
antigo fluxo de jogador que foi removido) antes que a conta possa fazer login, além de um email de
redefinição de senha correspondente — ambos usando um template HTML com a marca compartilhado. Isso
fechou uma lacuna em que `PasswordAuthService.register` originalmente marcava as contas como
verificadas imediatamente, sem nenhuma etapa de email.

---

## Etapa 0 — Onepager + respostas da #739(a)(b)(c) — ✅ concluída

`docs/pt-BR/specs/edital-onepager.md` existe, com o funil de 7 etapas e o `EDITAL_PERIOD_START`
registrados. As três perguntas do spike foram respondidas e estão refletidas no que de fato foi
construído:

- **(a) `windowFunnel`**: implementado com um caminho de fallback explícito — `queries.ts` usa
  `uniqExactIf` por nome de evento para agregados no estilo da Q1 e `windowFunnel` para o funil
  ordenado, com a justificativa do fallback registrada em comentários no código.
- **(b) Rate limits da Query API**: resolvido pelo design de cache de módulo + single-flight nas
  etapas 4/7, e não por um número fixo de rate limit — a mitigação foi construída independentemente
  do limite exato.
- **(c) NextAuth v5 no Next 16.2.9**: funcionamento confirmado. `front/src/auth.ts` / `auth.config.ts`
  entregam a separação Edge/Node exatamente como planejado, no Next 16.2.9, com os providers
  Credentials + Google.

O modelo de atribuição (propriedade de evento, não propriedade de pessoa) foi entregue como decidido
— veja `campaign.ts`, `origins.ts` e as propriedades `campaign_source`/`turma_source` propagadas por
todos os eventos.

---

## Etapa 1 — #743: env e infra — ✅ concluída

Os três arquivos de compose (`compose.development.yaml`, `compose.staging.yaml`,
`compose.production.yaml`) têm `AUTH_TRUST_HOST` e `AUTH_OAUTH_UPSERT_TOKEN`. O `.env.example`
documenta `POSTHOG_PERSONAL_API_KEY` (a chave pessoal `phx_`, diferente da chave de escrita `phc_`),
`AUTH_TRUST_HOST` e `AUTH_OAUTH_UPSERT_TOKEN`. O `docs/pt-BR/specs/posthog-implementation-plan.md` foi
ajustado com a exceção da chave pessoal só no servidor que o plano pedia. A quantidade de réplicas (1)
e sua implicação para o cache de módulo estão registradas em comentários no código de `metrics.ts`, e
não deixadas como uma nota de issue avulsa.

---

## Etapa 2 — #740: base de identidade — ✅ concluída

`front/src/lib/edital/anonymousPlayer.ts` implementa a identidade por cookie durável descrita no
plano: cookie definido pelo servidor via `middleware.ts` (não pelo provider — a própria inclinação do
plano foi confirmada e adotada), `Max-Age` explícito, seed de migração única a partir do valor legado
`gp_fallback_guest_id` do localStorage, nunca o contrário. `PostHogProvider.tsx` e
`beforeSend.ts`/`eventContext.ts` (`front/src/lib/posthog/`) implementam o timing de init e o
`before_send` como uma rede de segurança total, que nunca lança exceção — seguindo a regra explícita
do plano contra usá-lo para renomear eventos ou desdobrá-los em vários. `back/src/modules/game/game.controller.ts` e
`back/src/modules/posthog/posthog.controller.ts` têm o fallback com precedência do cookie.

---

## Etapa 3 — #741: dual-emit canônico — ✅ concluída

O `EVENTS.md` documenta todos os 7 eventos canônicos (de `play_clicked` até `chapter_1_completed`)
como ativos, emitidos em paralelo com seus equivalentes legados, com a tabela de mapeamento
legado/canônico explícita sobre as diferenças intencionais (ex.: `gameplay_started` dispara uma vez
por sessão via `captureOncePerSession`, enquanto o legado `game_started` ainda dispara uma vez por
nível). `critical_error_occurred` está ligado ao `loaderror` real de assets do `Game.ts` (a tarefa do
plano de "corrigir o `handleLoadingError` que não faz nada") e é espelhado em `game_event` com
`severity: "critical"`.

A migration do índice `game_event(timestamp, type)` foi incorporada como planejado
(`1780000000007-AddGameEventTimestampTypeIndex.ts`) — 🔁 com uma correção feita durante a própria
rodada de revisão deste épico: a migration original usava um `CREATE INDEX` simples, que teria
travado as escritas numa tabela grande; agora ela usa `CREATE INDEX CONCURRENTLY` com
`transaction = false`.

---

## Etapa 4 — #742a: lib de query pura + `/api/edital/health` — ✅ concluída

`front/src/lib/env-server.ts` tem os quatro (agora mais — as adições de turma/campaign-links/public-dashboard
aumentaram isso) campos opcionais de PostHog/query atrás de `import "server-only"`, como uma garantia
em tempo de build. `front/src/lib/edital/server/{hogql,queries,metrics,period,csv}.ts` e o
`front/src/lib/edital/types.ts`, seguro para o client, existem. O tipo `Scope` com marca e impossível
de forjar foi entregue exatamente como especificado — todo query builder recebe `Scope` como primeiro
argumento, que só pode ser produzido via `resolveScope(session)`.

🔁 Um desvio do plano: o cache de módulo não ficou como um único cache por requisição — ganhou um
módulo auxiliar companheiro `rows.ts` (`rowsToLevelMap`) e `numeric.ts` (`toNumber`), e uma constante
paralela `levels.ts`, quando o mesmo padrão de agregação por nível passou a ser necessário tanto no
caminho de query com escopo de instituição quanto no posterior do dashboard público (#808) — extraído
durante a rodada de limpeza do próprio épico em vez de duplicado três vezes.

---

## Etapa 5 — #739(d): `EDITAL_PERIOD_START` — 🔁 concluída, mais geral do que o planejado

Implementado como **leitura do ambiente** (o campo `editalPeriodStart` de `front/src/lib/env-server.ts`),
e não como uma constante fixa no código como o plano descrevia ("registrar a data de deploy da
#740... ligar a constante"). O clamp de `all-time` em `period.ts` lê o valor no momento da
requisição; quando ele não está definido, `all-time` não tem limite inferior (documentado e testado em
`period.test.ts`) em vez de cair numa data fixa no código — uma escolha mais defensiva do que o plano
pedia, já que significa que um valor não definido falha de forma segura (sem clamp, condizente com
"de fato ainda não sabemos") em vez de usar silenciosamente uma data errada embutida.

---

## Etapa 6 — #744: NextAuth e tenancy — ✅ concluída, 🔁 sem janela de coexistência

`auth.ts`/`auth.config.ts` separados como planejado. `back/src/modules/auth/controllers/oauth-upsert.controller.ts`
implementa o endpoint de upsert atrás do `OAuthUpsertTokenGuard` (comparação de token em tempo
constante via `timingSafeEqual`, falha fechada se o token não estiver configurado). Migrations
adicionaram as colunas `institutionSlug`/`institutionName`/`passwordHash` a `User`.
`resolveScope(session)` é o único caminho legítimo para um `Scope` (`front/src/lib/edital/server/scope.ts`).

🔁 O plano previa uma "janela de coexistência com risco aceito" entre o antigo papel autoatribuível do
`register.dto.ts` e a nova tenancy do NextAuth. Todo aquele sistema de auth antigo
(`AuthController`, `AuthService`, `register.dto.ts`, todo o route group `(auth)`) foi **removido por
completo** em vez de mantido em coexistência — então o risco da janela de coexistência nunca se
concretizou; não houve janela.

---

## Etapa 7 — #742b: os cinco route handlers protegidos por sessão — 🔁 concluída, seis rotas e não cinco

Todas as rotas obtêm o `Scope` de `resolveScope(session)`, nunca de um parâmetro da requisição —
verificado diretamente no próprio doc comment de `routeGuard.ts` ("`?slug=`/`?campaign=` are not read anywhere in this
file, or anywhere downstream"). Rotas entregues: `summary`, `funnel`, `report`, `report.csv`,
`campaigns`, mais `links`/`links/[id]` para o CRUD de links de campanha (fora das cinco originais, mas
com o mesmo padrão protegido por sessão). As mitigações de scan no ClickHouse (limite de linhas no
CSV, piso obrigatório de intervalo de datas) estão implementadas.

🔁 Uma lacuna encontrada e corrigida durante a própria revisão deste épico: `summary`, `report`,
`funnel`, `campaigns` e `report.csv` originalmente não tinham `try`/`catch` em volta das chamadas
HogQL no `Promise.all` — uma falha de query aparecia como um 500 não tratado em vez de uma resposta de
erro limpa. Corrigido para seguir o padrão que `links`/`links/[id]` já usavam corretamente.

---

## Etapa 8 — #745: as três telas — ✅ concluída, mais uma quarta (dashboard público, #808)

`institution/page.tsx` (Resumo Executivo), `institution/funnel/page.tsx` e
`institution/report/page.tsx` foram todas entregues, usando `useAsyncData` (com a correção de o retry
limpar o erro que o plano pedia) e uma union tipada `DateRange` (não a `string` crua que o plano
encontrou). `FunnelStep` tem um `count` absoluto opcional, como planejado. A métrica proibida "Login
concluído" e qualquer constante `*_TARGETS` foram removidas; `/institution/settings` foi apagada junto
com seu link de navegação.

➕ `front/src/app/public-dashboard/page.tsx` (#808) é uma quarta tela que o plano nunca previu —
uma visão agregada pública e sem autenticação para a exigência de reporte da Rouanet, compartilhando
a mesma família de componentes `Section`/`DataTable`/`KPICard`, mas com seus próprios componentes
locais da página (`PublicKpiCard`, `PublicSectionHeading`), documentados no código como
intencionalmente divergentes dos compartilhados.

---

## Etapa 9 — #746: links de campanha — 🔁 concluída, com um backend real adicionado depois (#807)

`front/src/lib/edital/origins.ts` entrega o registry estático de origens de instituição como planejado
(TypeScript, sem tabela). `institution/links/page.tsx` é a UI geradora, emitindo zero eventos do
PostHog, como exigido.

🔁 O que o plano não previu: a **#807** depois exigiu links por turma que as instituições criam
dinamicamente em tempo de execução — o registry estático não comporta isso. Uma entity/tabela/módulo
real `CampaignLink` (`back/src/modules/campaign-links/`) foi adicionada especificamente para isso,
atrás da mesma fronteira de confiança servidor-a-servidor do endpoint de OAuth-upsert. Os dois
sistemas coexistem de propósito: `origins.ts` para o registry fixo no nível da instituição, a tabela
no banco para os links por turma que as próprias instituições geram.

---

## Etapa 10 — #747: provider de senha — ✅ concluída, mais uma peça que faltava adicionada depois

`back/src/modules/auth/services/password.service.ts` usa argon2id com os parâmetros mínimos da OWASP
(`m=19456, t=2, p=1`), documentados em relação ao limite de memória do container.
`PasswordAuthService.login` retorna um erro genérico indistinguível para senha errada e email
desconhecido. O rate limiting usa o mesmo padrão `@ThrottleByEmail` que o plano especificou
(confirmado: o `ThrottlerGuard` genérico continua não registrado como `APP_GUARD` global em
`app.module.ts` — isso é intencional, conforme a própria nota da #742 de que throttling por rota é
suficiente na escala de contas de instituição, e não um descuido).

🔁 **Lacuna encontrada e fechada depois, fora do escopo original da #747**: o cadastro originalmente
marcava `isEmailVerified: true` imediatamente, sem nenhum email de confirmação — sem espelhar nada do
antigo fluxo de jogador (removido). Isso foi corrigido para bater com o que o sistema antigo fazia:
`register` agora cria a conta não verificada, envia um email real de confirmação (magic link, expira
em 15 minutos, mesmo `MagicLinkService`/`IEmailService` usado em outros lugares), e um novo provider
Credentials do NextAuth, `email-verification`, tanto verifica a conta quanto já loga a instituição
direto em `/institution` quando o link é clicado — `login` agora recusa contas não verificadas. Tanto o
email de confirmação de cadastro quanto o de redefinição de senha usam um template HTML com a marca
compartilhado, seguindo o design do produto no Figma (cabeçalho escuro com o brasão, botão em pílula
dourado, linha de rodapé da Lei Rouanet), em vez do template genérico "42 Rio" que os demais emails do
app ainda usam.

---

## Etapa 11 — #748: limpeza e docs — ✅ concluída

`analytics.controller.ts` e `dashboard.controller.ts` (os controllers com dados falsos fixos no código
e duplicados) foram apagados. O wrapper morto do front `front/src/lib/api/analytics.ts` foi apagado.
O `EVENTS.md` corrige a afirmação sobre `game_load_failed`/carregamento de assets como planejado.
O `docs/pt-BR/specs/posthog-implementation-plan.md` tem a exceção da chave pessoal só no servidor. A
nota sobre as stacks de analytics coexistentes está registrada no `EVENTS.md`, declarando o PostHog
como única fonte da verdade para o edital. Ela listava quatro stacks quando foi escrita (PostHog,
pipeline no Postgres, Contentsquare, gtag do Google Ads); o Contentsquare foi removido em 2026-09-29 e
a nota agora lista três.

---

## Lacunas conhecidas, nesta revisão

Herdadas da própria revisão de fim de épico, não resolvidas por nenhuma das etapas acima:

- **`middleware.ts`**: o redirect de login define um parâmetro `?redirect=` que a página de login
  originalmente não lia (os usuários sempre caíam em `/institution`, independentemente de onde tinham
  sido redirecionados) — corrigido, com uma proteção contra open redirect que restringe o valor aceito
  a `/institution/*`.
- **`next-auth.d.ts`**: `Session.user.id`/`role` estavam tipados como sempre presentes, apesar de
  serem definidos condicionalmente no callback `session` — corrigidos para opcionais, condizente com o
  que todo consumidor real já checava de forma defensiva.
- **Migration `CREATE INDEX CONCURRENTLY`** (etapa 3) e a **lacuna de `try`/`catch`** em cinco rotas
  do edital (etapa 7) — ambas listadas acima, ambas corrigidas nesta branch antes do merge.
- **Ainda não existe cobertura de testes** para `public-dashboard/page.tsx` (#808) — sinalizado, ainda
  não fechado.

---

## Verificação, ponta a ponta

Reaproveitado do plano original — continua sendo o gate E2E canônico, rodado contra o sistema real
hoje:

1. `npm run typecheck && npm run lint && npm test` na raiz (turbo, os dois workspaces).
2. `make db-migrate` para subir e `migration:revert` para descer cada migration nova.
3. Local: `/?utm_institution=escola-teste`, depois três hard reloads — confirmar nos eventos ao vivo do
   PostHog que o `distinct_id` é estável, que `landing_page_viewed` chega com o conjunto completo de
   propriedades e que `anonymous_player_created` disparou uma vez.
4. Uma partida completa, checando as 7 etapas em ordem, depois fechar a aba e confirmar
   `session_finished` com um `duration_seconds` plausível — repetir no Safari do iOS.
5. Renomear o tilemap do nível 1 e confirmar `critical_error_occurred{is_blocking:true}`.
6. Rodar o probe da Query API com `curl` nos dois ambientes com a chave `phx_`.
7. Rodar a Q1 manualmente no editor SQL do PostHog e comparar com `/api/edital/summary`, a página de
   visão geral e o export CSV — todos precisam bater.
8. Logar como duas instituições com slugs diferentes e confirmar o isolamento; confirmar que uma conta
   sem vínculo gera zero chamadas upstream ao PostHog no log do servidor.
9. `grep -r "phx_" front/.next/static/` não pode retornar nada.
10. Abrir o CSV exportado no Excel pt-BR: acentos intactos, um valor por coluna.
11. Cadastrar uma nova conta de instituição, confirmar que o email de verificação chega (ou, em dev
    local com `EMAIL_PROVIDER=mock`, que o link aparece no log), clicar nele e confirmar que ele cai
    autenticado em `/institution`.
