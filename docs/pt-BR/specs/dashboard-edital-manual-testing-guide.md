# Guia de Testes Manuais — Dashboard do Edital (Épico #738)

> **Escopo:** Épico #738 e suas 12 sub-issues (#739–#748, #807, #808), entregues em
> `feat/dashboard-edital`: login e onboarding de instituição com OAuth/senha,
> a base de identidade do PostHog, os eventos canônicos do funil, a camada de
> query/cache em HogQL, o dashboard da instituição (visão geral/funil/relatório/links),
> links de campanha por turma e o dashboard agregado público.
> **Público-alvo:** QA / revisores validando esta branch antes do merge.
> Espelha a estrutura de `docs/pt-BR/specs/auth-manual-testing-guide.md`; leia
> esse guia primeiro se você ainda não testou o sistema de auth base — este
> guia parte do princípio de que o leitor já sabe como sessões do NextAuth, cookies e
> rate limiting funcionam neste repo e foca só no que é novo aqui.

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Testes da API do backend](#testes-da-api-do-backend)
  - [1. OAuth Upsert e Onboarding](#1-oauth-upsert-e-onboarding)
  - [2. Cadastro com senha e email de confirmação](#2-cadastro-com-senha-e-email-de-confirmação)
  - [3. CRUD de links de campanha](#3-crud-de-links-de-campanha)
  - [4. Probe de health](#4-probe-de-health)
- [Testes de fluxo do frontend](#testes-de-fluxo-do-frontend)
  - [1. Login com Google OAuth + onboarding](#1-login-com-google-oauth--onboarding)
  - [2. Fluxo de cadastro com senha](#2-fluxo-de-cadastro-com-senha)
  - [3. Dashboard da instituição](#3-dashboard-da-instituição)
  - [4. Página de links de campanha](#4-página-de-links-de-campanha)
  - [5. Dashboard público](#5-dashboard-público)
  - [6. Instrumentação do PostHog](#6-instrumentação-do-posthog)
  - [7. Partida completa pelo funil](#7-partida-completa-pelo-funil)
  - [8. Métricas do nível 4 (investigação)](#8-métricas-do-nível-4-investigação)
- [Casos de borda e cenários de erro](#casos-de-borda-e-cenários-de-erro)
- [Verificação de segurança](#verificação-de-segurança)
- [Isolamento entre instituições](#isolamento-entre-instituições)
- [Rate limiting e cache](#rate-limiting-e-cache)
- [Solução de problemas](#solução-de-problemas)
- [Checklist de aprovação](#checklist-de-aprovação)

## Pré-requisitos

- Versão do Node compatível com os engines de `front/package.json` / `back/package.json`.
- Docker rodando (`make up`) ou dev com Turbo (`make local-all`).
- Na branch `feat/dashboard-edital`, com `npm install` rodado na raiz.
- `make db-migrate` aplicado (migration nova: `CreateCampaignLinkTable`, mais
  a coluna `institutionName` em `User`).
- Um **client OAuth do Google Cloud** (credenciais de teste) se for testar o
  caminho de login com Google, ou pule para o caminho de auth com senha se não houver.
- Um **projeto do PostHog** com uma chave de API pessoal (`phx_…`) se for testar a
  camada de query / os números do dashboard contra dados reais. Sem ela, o app
  ainda sobe — `/api/edital/health` retorna `configured:false` e o
  dashboard renderiza seus estados vazios de "não configurado".
- Acesso para inspecionar os emails enviados (`EMAIL_PROVIDER=mock` registra o link no
  console do backend; um provider real de SMTP/Resend exige uma caixa de entrada).
- Valores do `.env` a definir (veja `.env.example` para os placeholders):

  ```
  AUTH_SECRET=
  AUTH_TRUST_HOST=true
  AUTH_GOOGLE_ID=
  AUTH_GOOGLE_SECRET=
  AUTH_OAUTH_UPSERT_TOKEN=
  BACKEND_INTERNAL_URL=http://back:3001
  POSTHOG_PERSONAL_API_KEY=
  POSTHOG_PROJECT_ID=
  POSTHOG_QUERY_HOST=https://us.posthog.com
  POSTHOG_QUERY_CACHE_TTL_MS=300000
  EDITAL_PERIOD_START=
  ```

  > **Nota:** `POSTHOG_QUERY_HOST` é o **host da Query API** (`us.posthog.com`
  > ou `eu.posthog.com`), não o host de ingestão usado pelo
  > `NEXT_PUBLIC_POSTHOG_HOST` do lado do client. Não confunda os dois ao configurar.

## Configuração do ambiente

> **Nota:** o repo não tem um `compose.yaml` padrão — a stack de dev fica em
> `compose.development.yaml`. Comandos `docker compose …` puros falham com
> `no configuration file provided: not found` a menos que você passe
> `-f compose.development.yaml` (os targets do `make` já fazem isso). Para
> não repetir a flag, rode `export COMPOSE_FILE=compose.development.yaml`
> uma vez por shell.

```bash
make up                                                    # builds and starts the dev stack (detached)
docker compose -f compose.development.yaml ps              # expect: nginx, front, back, postgres
make db-migrate                                            # runs inside the back container — stack must be up
docker compose -f compose.development.yaml logs -f back    # tail for OAuth/password auth requests
docker compose -f compose.development.yaml logs -f front   # tail for edital route handler errors
```

`make development-ps` e `make logs` (todos os serviços) são atalhos equivalentes.

Confirme que `/api/edital/health` responde antes de testar qualquer outra coisa:

```bash
curl -s http://localhost:3000/api/edital/health | jq
# { "configured": true }   (or false, if PostHog env vars are unset)
```

## Testes da API do backend

Todos os endpoints de backend abaixo estão sob o prefixo `/api/v1`. Os endpoints das
§1 e §3 exigem o header compartilhado `x-oauth-upsert-token` — eles **não
foram feitos para serem chamados diretamente por um navegador**; o front faz o proxy deles
no servidor. Chame-os diretamente com curl aqui para testar o contrato do backend
isoladamente, do mesmo jeito que o `auth-manual-testing-guide.md` testa `/auth/*`.

> **Lacuna de cobertura:** nesta branch, nenhum de `oauth-upsert.controller.ts`,
> `password-auth.controller.ts` ou do módulo `campaign-links` tem
> arquivos `.spec.ts`. Os comandos curl abaixo são hoje a **única**
> verificação que esses endpoints recebem — trate esta seção como obrigatória, não
> opcional.

### 1. OAuth Upsert e Onboarding

#### 1.1 Fazer upsert de uma nova conta de instituição (simula o login com Google)

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/oauth/upsert \
  -H "Content-Type: application/json" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN" \
  -d '{"email":"escola-teste@example.com","firstName":"Escola","lastName":"Teste"}'
```

**Resposta esperada (200/201):** um objeto de usuário com `role: "institution"`,
`institutionSlug: null`, `isEmailVerified: true`.

#### 1.2 Upsert sem o token compartilhado

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/oauth/upsert \
  -H "Content-Type: application/json" \
  -d '{"email":"x@example.com","firstName":"X","lastName":"Y"}'
```

**Resposta esperada (401/403):** rejeitado — o `OAuthUpsertTokenGuard` falha
fechado. Se `AUTH_OAUTH_UPSERT_TOKEN` não estiver definido no próprio env do backend,
**toda** chamada precisa ser rejeitada, nunca liberada silenciosamente.

#### 1.3 Upsert de um email que já existe como conta de jogador

**Resposta esperada (409 Conflict).** Verifique se o front mostra isso como
`/login?error=EmailConflict` com a mensagem *"Este e-mail já está
cadastrado como conta de jogador..."*.

#### 1.4 Onboarding — definir o nome/slug da instituição

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/oauth/onboarding \
  -H "Content-Type: application/json" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN" \
  -d '{"userId":"<uuid-from-1.1>","institutionName":"Escola Teste"}'
```

**Resposta esperada (200):** slug derivado via `slugify("Escola Teste")` →
`escola-teste`. Repita com o mesmo nome para um segundo usuário — espere um
slug desambiguado (`escola-teste-a1b2` ou parecido), não um erro de colisão.

> **Checagem de segurança:** o proxy do front (`/api/institution/onboarding`) precisa
> derivar o `userId` apenas da sessão confiável, nunca confiar num `userId` no
> corpo da requisição. Confirme lendo
> `front/src/app/api/institution/onboarding/route.ts`.

### 2. Cadastro com senha e email de confirmação

#### 2.1 Cadastrar uma nova conta de instituição

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nova-escola@example.com","password":"SenhaForte123!","institutionSlug":"nova-escola","nickname":"Nova Escola"}'
```

**Resposta esperada (200/201):** um `{"message":"Check your email"}` genérico —
sem confirmar se o email era novo ou duplicado.

**Verifique nos logs do backend / no provider de email mock:** um email de confirmação
(no estilo magic link, expira em 15 minutos) foi enviado — esse é um comportamento novo
nesta branch; o fluxo antigo verificava automaticamente, sem etapa de email.

Com `EMAIL_PROVIDER=mock` (o padrão local), nenhum email é de fato enviado;
o link é impresso no console do backend:

```bash
docker compose -f compose.development.yaml logs back | grep MockEmail
# or: docker logs gameplate-back-1 | grep MockEmail
```

Procure uma linha como:

```
[MockEmail] Verification to nova-escola@example.com: http://localhost/confirm-verification?token=<token>
```

#### 2.2 Consumir o link de confirmação

Copie o parâmetro de query `token` da linha de log `[MockEmail] Verification to …`
(veja 2.1) e confirme que ele tanto
verifica **quanto faz login** numa única chamada:

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/verify-email/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>"}'
```

**Esperado:** a conta agora está com `isEmailVerified: true`, e a resposta/sessão
indica que uma sessão autenticada foi criada.

#### 2.3 Cadastrar com um `institutionSlug` inválido

Tente `institutionSlug: "Not Valid!"` — espere um 400 (precisa bater com
`/^[a-z0-9]+(-[a-z0-9]+)*$/`, ≤64 caracteres).

#### 2.4 Redefinição de senha

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/reset/request \
  -H "Content-Type: application/json" -d '{"email":"nova-escola@example.com"}'
```

Com o provider mock, o link de redefinição é registrado sob o rótulo de **magic link**,
e não um rótulo dedicado de redefinição:

```bash
docker compose -f compose.development.yaml logs back | grep MockEmail
# [MockEmail] Magic link to nova-escola@example.com: http://localhost/reset-institution-password?token=<token>
```

Siga esse link até `/reset-institution-password?token=…` e depois:

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","newPassword":"OutraSenha456!"}'
```

### 3. CRUD de links de campanha

Todas as chamadas exigem `x-oauth-upsert-token` — elas são internas do backend,
nunca chamadas diretamente pelo navegador (o front faz o proxy via `/api/edital/links`,
testado na seção de Frontend abaixo).

#### 3.1 Criar um link de campanha

```bash
curl -s -X POST http://localhost:3001/api/v1/campaign-links \
  -H "Content-Type: application/json" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN" \
  -d '{"institutionSlug":"escola-teste","source":"turma-3a"}'
```

**Esperado (201):** `{id, institutionSlug, source, createdAt}`.

#### 3.2 Listar os links de uma instituição

```bash
curl -s "http://localhost:3001/api/v1/campaign-links?institutionSlug=escola-teste" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN"
```

#### 3.3 Apagar um link que pertence a outra instituição

```bash
curl -s -X DELETE "http://localhost:3001/api/v1/campaign-links/<id>?institutionSlug=outra-escola" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN"
```

**Esperado (403):** a checagem de propriedade rejeita a exclusão entre instituições.
Apagar um id inexistente retorna 404.

#### 3.4 Source duplicado

Crie o mesmo `source` duas vezes para o mesmo `institutionSlug` — a camada de
proxy do front (`campaignLinks.ts`) deve mostrar isso como um 409 com a mensagem
*"Já existe um link com este nome de grupo/turma"*.

### 4. Probe de health

```bash
curl -s http://localhost:3000/api/edital/health | jq
```

**Esperado:** `{configured: true}` quando as três env vars do PostHog
(`POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_QUERY_HOST`) estão
definidas; `{configured: false}` se alguma estiver faltando. Esta rota **não** faz
nenhuma chamada upstream ao PostHog — é uma checagem local barata.

## Testes de fluxo do frontend

### 1. Login com Google OAuth + onboarding

1. Acesse `/login` e clique em "Entrar com Google".
2. Conclua a tela de consentimento do Google com uma conta de teste.
3. **Esperado:** se for um email totalmente novo, você cai em
   `/institution/onboarding` (o role é `institution`, mas o `institutionSlug`
   é `null`).
4. Preencha "Nome da instituição" → envie.
5. **Esperado:** a sessão do NextAuth é atualizada (`update({institutionSlug})`),
   e o redirect cai em `/institution`.
6. **Verifique no DevTools:** Application → Cookies — um cookie de sessão do NextAuth
   está definido; nenhum `institutionSlug` vaza para a URL.
7. Saia e entre de novo com a mesma conta do Google.
8. **Esperado:** como o `institutionSlug` agora está definido, você cai direto em
   `/institution` — o onboarding não é mostrado de novo.

### 2. Fluxo de cadastro com senha

1. Acesse `/register` e preencha email/senha/nome da instituição.
2. **Esperado:** mensagem genérica de sucesso, sem login automático.
3. Pegue o link de confirmação. Localmente (`EMAIL_PROVIDER=mock`) nenhum email é
   enviado — o link só aparece nos logs do backend:

   ```bash
   docker compose -f compose.development.yaml logs back | grep MockEmail
   # [MockEmail] Verification to <email>: http://localhost/confirm-verification?token=<token>
   ```

   Com um provider real, confira a caixa de entrada.
4. Abra o link no mesmo navegador.
5. **Esperado:** conta verificada e o navegador cai autenticado em
   `/institution` (ou numa etapa de onboarding se nenhum slug foi capturado no
   momento do cadastro).
6. **Redefinição de senha pela UI:** peça uma redefinição na página de login e depois pegue
   o link do mesmo jeito — ele é registrado como
   `[MockEmail] Magic link to <email>: http://localhost/reset-institution-password?token=<token>`.
   Abra-o, defina uma nova senha e entre com ela.

### 3. Dashboard da instituição

As quatro páginas ficam sob `/institution/*`, atrás do `InstitutionGuard` +
`middleware.ts` (o role precisa ser `institution` e o slug precisa estar definido).

| Rota | O que checar |
|---|---|
| `/institution` | Cabeçalho "Painel institucional", métrica de destaque (contagem de `gameplay_started`), cards de KPI de sessões iniciadas / taxa de entrada / taxa de conclusão / tempo médio de sessão / progresso médio, um gráfico de barras "Desempenho por fase" (taxa de aprovação no quiz por nível 1–3 — o nível 4 não tem quiz), um gráfico de barras "Estrelas por fase" (média das melhores estrelas de cada jogador, níveis 1–4) e um bloco de insights `QuickRead`. |
| `/institution/funnel` | "Progressão da jornada" — funil completo, da aquisição até todos os níveis, mais um painel "Insights do funil". Os rótulos das 3 etapas de aquisição são overrides legíveis em pt-BR (`STEP_LABELS`); as etapas de nível usam o próprio título do nível, como enviado pelo servidor. |
| `/institution/report` | Cards de KPI — "Sessões iniciadas", "Tempo médio de sessão" (com subtítulo da mediana), "Taxa de conclusão" — mais uma `DataTable` consolidada com linhas por fase de aprovação no quiz, pistas e estrelas, e um botão de export CSV. |
| `/institution/links` | CRUD de links de campanha — veja a §4 abaixo. |

Para cada página:

1. Alterne entre todos os presets de intervalo de datas: **Hoje**, **7 dias**, **30 dias**,
   **90 dias**, **Tudo**, **Personalizado** (seletor personalizado, valida
   `from <= to`).
2. Aplique um filtro de turma (`?turma=turma-3a` na URL) e confirme que os
   números se restringem a essa turma; limpe o filtro e confirme que volta para o
   total da instituição (um valor de turma malformado/desconhecido **não** pode dar 400 —
   ele volta silenciosamente para o total).
3. Confirme que todo o estado dos filtros faz o round-trip pela URL (recarregue a página
   com a mesma query string e confirme que os mesmos filtros vêm pré-selecionados).
4. Em `/institution/report`, clique em **Exportar CSV**:
   - Abra o arquivo num app de planilha com locale pt-BR.
   - **Esperado:** caracteres acentuados intactos (BOM UTF-8), `;` como
     delimitador de colunas, vírgula decimal (não ponto) nas colunas numéricas.
   - **Esperado (#834):** um bloco `phase_N_*` por nível, incluindo
     `phase_4_*`; `phase_N_clues` (renomeado de `phase_N_clue_uses`)
     e `phase_N_avg_stars` presentes; os três valores `phase_4_quiz_*`
     vêm vazios, não `0`.

### 4. Página de links de campanha

`/institution/links`:

1. Digite um nome de turma/grupo em "Nome da turma/grupo" — o campo valida
   em tempo real contra `ORIGIN_SLUG_PATTERN` (`/^[a-z0-9]+(-[a-z0-9]+)*$/`:
   letras minúsculas, dígitos, hifens simples, sem hífen no início/fim).
2. Clique em "Criar link" → a lista é atualizada e aparece uma URL de rastreamento no formato
   `<origin>/?utm_institution=<slug>&utm_source=<source>`, em que `<origin>`
   é o próprio domínio do ambiente atual: `AUTH_URL` em staging e
   produção (ex.: `https://guardiaodacultura.42.rio` em produção), a
   origem da requisição (`http://localhost:3000`) localmente.
3. Clique no botão de copiar → a área de transferência recebe a URL e aparece um
   snackbar de confirmação.
4. Clique em apagar num link → confirme o diálogo → o link some da
   lista.
5. **Verifique na aba Network do DevTools:** nenhuma chamada de capture do PostHog dispara ao
   criar/copiar/apagar um link nesta página — o gerenciamento de links é
   propositalmente silencioso, ao contrário de todas as outras páginas do dashboard.
6. Role até "Origens (últimos 30 dias)" — uma tabela **somente leitura**, agrupada
   pelo `utm_source` cru, do total da instituição (não é afetada pelo filtro de
   turma acima — esta é a visão de origens estática, mais antiga, separada da
   tabela dinâmica de links de campanha).

### 5. Dashboard público

`/public-dashboard` — não exige login.

1. Abra numa sessão anônima/deslogada do navegador.
2. **Esperado:** carrega sem nenhum redirect para `/login`.
3. Confirme que a URL nunca aceita um parâmetro `?slug=` ou `?turma=` — esta
   página é agregada de todas as instituições por design, nunca
   por instituição.
4. Confira os presets de período disponíveis: apenas **7 dias / 30 dias / 90 dias /
   Tudo** — sem "Hoje" nem intervalo personalizado (mais restrito que o dashboard da
   instituição; verifique se isso é intencional, não um bug).
5. Confirme que a barra de progresso da meta anual é renderizada contra
   `EDITAL_ANNUAL_PLAYER_GOAL`, que o gráfico de tendência de jogadores é mensal e que a
   tabela de divisão por origem separa o tráfego institucional do espontâneo.
6. Em "Desempenho por nível", alterne entre **Nível 1–4**: cada um mostra
   entrada, conclusão, aprovação no quiz e média de estrelas. O Nível 4 não tem
   barra de quiz (a investigação não tem quiz); as estrelas aparecem como "X / 5 ★" em
   todos os níveis.
7. **Ainda não existe teste automatizado para esta página** — esta rodada manual é
   a única cobertura atual dela. Tome cuidado redobrado aqui.

### 6. Instrumentação do PostHog

1. Limpe os cookies e acesse `/?utm_institution=escola-teste&utm_source=turma-3a`.
2. **Verifique no DevTools → Application → Cookies:** `gp_distinct_id` está definido
   (Max-Age ≈400 dias), e `gp_distinct_id_seeded` aparece brevemente
   (TTL de 60s) — só existe logo depois que o cookie é criado pela primeira vez.
3. **Verifique no DevTools → Network**, filtrando pelo seu host de ingestão do PostHog:
   as chamadas de capture enviadas carregam `anonymous_player_id`, `campaign_source`,
   `turma_source`, `session_id`, `device_type`, `event_name`,
   `event_timestamp` em todo evento — incluindo eventos internos do PostHog
   como `$pageview`.
4. Recarregue a mesma página **sem** os parâmetros `utm_*`.
5. **Esperado:** `campaign_source`/`turma_source` persistem desde a primeira
   visita (atribuição first-touch — o `register()` do PostHog não
   sobrescreve uma super-property já definida).
6. Tente um slug envenenado, ex.: `?utm_institution=<script>` — confirme que ele é
   rejeitado/sanitizado (precisa bater com `/^[a-z0-9]+(-[a-z0-9]+)*$/`, ≤100 caracteres)
   e não é gravado literalmente como super-property.
7. Na visão Live Events do projeto do PostHog, filtre pelo distinct_id da sua sessão
   e confirme que as mesmas propriedades aparecem no lado do servidor.
8. **Checagem de vazamento de chave:**
   ```bash
   cd front && grep -r "phx_" .next/static/ ; echo "exit: $?"
   ```
   **Esperado:** nenhuma ocorrência (exit code 1) — a chave pessoal da Query API
   nunca pode chegar ao bundle do navegador.

### 7. Partida completa pelo funil

> **Correção:** um rascunho anterior desta seção descrevia um funil de 7 etapas
> terminando em `chapter_1_started`/`chapter_1_completed`. Esse par
> só cobria o nível 1 e foi **substituído** pela issue #807 — veja
> `front/src/lib/edital/server/queries.ts` (`getFunnelSteps()`), que
> alerta explicitamente contra usar `chapter_1_started`/`chapter_1_completed`
> "como base geral". O funil real do dashboard (`buildFunnelQuery`,
> que alimenta tanto `/institution/funnel` quanto a página de visão geral) é:

| # | Etapa | Condição usada por `queries.ts` | Onde dispara |
|---|---|---|---|
| 1 | `landing_page_viewed` | `event = 'landing_page_viewed'` | `PlayLanding.tsx` |
| 2 | `play_clicked` | `event = 'play_clicked'` | `PlayLanding.tsx` (`handlePlay`) |
| 3 | `gameplay_started` | `event = 'gameplay_started'` | `create()` do `Game.ts`, uma vez por sessão (`captureOncePerSession`) |
| 4 | "Concluiu Fase 1" | `event = 'level_completed' AND level_number = 1` | `QuizManager.ts`, sucesso no quiz do nível 1 |
| 5 | "Concluiu Fase 2" | `event = 'level_completed' AND level_number = 2` | `QuizManager.ts`, sucesso no quiz do nível 2 |
| 6 | "Concluiu Fase 3" | `event = 'level_completed' AND level_number = 3` | `QuizManager.ts`, sucesso no quiz do nível 3 |
| 7 | "Concluiu Fase 4" | `event = 'investigation_completed'` | `InvestigationScene.ts`, culpado identificado ou revelado |

Esta lista é **dinâmica sobre `DASHBOARD_LEVELS`** (`front/src/lib/edital/server/levels.ts`:
os níveis do `LEVEL_REGISTRY` mais a investigação) — verifique de novo se a quantidade
de etapas bate com o tamanho dela sempre que um nível for adicionado ou removido.

Jogue todos os 4 níveis e confirme que cada etapa `level_completed`
só incrementa depois que o quiz de fim de nível daquele nível é aprovado (um quiz
reprovado emite `level_failed` no lugar e **não** pode avançar o funil),
e que a etapa 7 incrementa quando a investigação termina — em qualquer um dos
finais.

**Outros eventos reais para checar, mesmo que não alimentem a query do funil
diretamente** — eles ainda importam para o dashboard legado no Postgres
(`game_event`) e para a definição de contexto `chapter_id` usada pelo `before_send`:

| Evento | Ainda dispara? | Alimenta |
|---|---|---|
| `chapter_1_started` | Sim, só no nível 1 | `game_event` (dashboard legado), define o contexto `chapter_id` |
| `chapter_1_completed` | Sim, só no nível 1, depois de `quiz_completed` | `game_event` (dashboard legado) |
| `quiz_started` / `quiz_completed` | Sim, no quiz de fim de nível de todos os níveis | Emitidos em paralelo com `quiz_answered`/`quiz_answer_submitted`; não são uma etapa do funil |

Confirme também:

- Renomear/remover localmente o asset do tilemap do nível 1 faz
  `critical_error_occurred{error_code: "asset_load_failed", is_blocking: true}`
  disparar — e ele **não** é contado por engano como `game_load_failed`
  (esse evento cobre apenas as etapas `player_id_resolution`/`module_import`/
  `phaser_init`).
- Feche a aba no meio da sessão — um evento `session_finished` dispara com um
  `duration_seconds` plausível.
- Repita a partida num segundo dispositivo/navegador com o mesmo
  `?utm_institution=` — confirme que `turma_source`/`campaign_source` são
  consistentes por navegador e independentes por dispositivo.

### 8. Métricas do nível 4 (investigação)

Issue #834. A investigação não é um nível jogável e dispara seus próprios
eventos; o `EVENTS.md` → "Métricas por fase dos dashboards" tem o mapeamento
completo. Com a visão Activity do PostHog aberta, jogue o nível 4 a partir do mapa:

1. Abrir a tela dispara `investigation_opened` com
   `level_id: "level_04"`, `level_number: 4`.
   **Esperado:** o "reached" do Nível 4 sobe em um jogador.
2. Deixe o tutorial fazer o drop roteirizado e depois posicione algumas pistas —
   incluindo mover uma pista para outro suspeito.
   **Esperado:** todo drop real dispara `investigation_clue_placed`
   (`is_tutorial: false`) e soma um à contagem de pistas do nível 4 (movimentos
   também contam); o drop do tutorial (`is_tutorial: true`) não conta.
3. Aponte o culpado na primeira tentativa.
   **Esperado:** `investigation_completed` com `stars: 5`,
   `is_correct: true`, `revealed: false`, depois
   `progress_updated` para `level_04`; uma requisição `POST /scores` com
   `levelId: "level_04"`, `totalStars: 5`, demais campos vazios/zerados (só
   logado — convidados gravam no localStorage). A taxa de conclusão e a
   etapa 7 do funil sobem.
4. Jogue de novo e faça 4 acusações erradas.
   **Esperado:** `investigation_completed` com `stars: 1`,
   `is_correct: false`, `revealed: true`; o jogador continua contando como
   tendo terminado o jogo. As estrelas dele no nível 4 ficam na melhor partida
   (5), não 1.
5. "Estrelas por fase" mostra "X / 5 ★" para todos os níveis, incluindo o nível 4.

### Vendo os dashboards com dados mock

Não precisa de chaves do PostHog. Com `EDITAL_MOCK_DATA=true` no `.env` da raiz
e o front rodando com `next dev` (`make local-all` ou
`make local-front`), toda query HogQL é respondida por
`front/src/lib/edital/server/mockData.ts` em vez do PostHog — todo o
resto (rotas, métricas, UI, CSV) roda de verdade. `EDITAL_MOCK_DATA=no-level-4`
mostra um período em que ninguém chegou à investigação. Ele é ignorado em
builds de produção e de teste, mesmo se estiver definido.

O mock tem uma instituição: o dashboard público conta todo mundo (600
jogadores, 450 pelos links da instituição e 150 diretos), o
dashboard da instituição conta os 450 dela, divididos entre os links de turma/campanha que ela
criou em `/institution/links` — cada turma no filtro "Turma ou origem"
mostra a sua parte. Os links são reais (lidos do backend, que
precisa de `AUTH_OAUTH_UPSERT_TOKEN`); sem nenhum criado, a instituição continua
mostrando os 450, mas sem linhas de turma. Defina `EDITAL_MOCK_INSTITUTION=<slug>` para que
o "Turmas ativas" do dashboard público conte os links dessa instituição. O Docker Compose não passa a
variável para o container do front, então use os targets do Turbo para isso. O
cache de módulo guarda os resultados por `POSTHOG_QUERY_CACHE_TTL_MS` (5 minutos por
padrão): reinicie o servidor de dev depois de trocar de cenário.

## Casos de borda e cenários de erro

### Conflito de email no OAuth

Entre com Google usando um email que já tem uma conta de **jogador**.
**Esperado:** 409 de `/auth/oauth/upsert`, e o front redireciona para
`/login?error=EmailConflict` com a mensagem de conflito em português.

### Sessão de instituição sem vínculo

Limpe manualmente o `institutionSlug` numa sessão de teste (ou intercepte antes de o
onboarding terminar) e acesse `/institution` diretamente.
**Esperado:** redirecionado para `/institution/onboarding`; nenhuma chamada à Query
API do PostHog é feita no servidor para o estado sem vínculo (confira os logs do backend —
zero requisições HogQL).

### Slug de turma/campanha malformado na URL

Acesse `/institution/funnel?turma=Not_Valid!!`.
**Esperado:** volta para os dados do total da instituição — **não** um erro 400.

### `EDITAL_PERIOD_START` sem valor

Com essa var sem valor (o padrão atual do `.env.example`), selecione
**Tudo** (all-time) em qualquer página do dashboard.
**Esperado (lacuna conhecida e documentada):** o limite inferior do intervalo cai
na época Unix — na prática, sem limite. Esse é o comportamento esperado
até uma data real de deploy em produção ser registrada nessa variável; não
abra isso como um bug novo, mas confirme que o dashboard não dá erro.

### Cache / single-flight da Query API

Carregue `/institution` duas vezes em sequência rápida (duas abas, mesmos filtros).
**Esperado:** apenas uma chamada HogQL upstream é feita dentro da
janela de `POSTHOG_QUERY_CACHE_TTL_MS` (padrão 5 min) — verifique pelos logs do
backend ou pela própria visão de uso da API do seu projeto no PostHog, não contando
chamadas de rede no navegador (as duas abas chamam a rota de API do próprio front;
o cache fica no servidor).

### Proteção contra open redirect

Tente `/login?redirect=https://evil.example.com` e `/login?redirect=//evil.example.com`.
**Esperado:** rejeitado por `safeRedirectTarget()` — só caminhos que começam
com `/institution` são respeitados.

## Verificação de segurança

### Flags de cookie

| Cookie | httpOnly | Secure | SameSite | Observações |
|---|---|---|---|---|
| `gp_distinct_id` | Não (legível pelo client por design — lido pelo posthog-js) | Sim (prod) | Lax | Max-Age ≈400 dias |
| `gp_distinct_id_seeded` | Não | Sim (prod) | Lax | TTL de 60s, apenas marcador de migração |
| Cookie de sessão do NextAuth | Sim | Sim (prod) | Lax | Comportamento padrão do NextAuth v5 — veja o guia de auth |

### Endpoints com segredo compartilhado

- Confirme que o `x-oauth-upsert-token` usa uma comparação em tempo constante
  (`timingSafeEqual`) — confira a implementação do `OAuthUpsertTokenGuard`,
  e não só o comportamento dele, já que ataques de timing não são observáveis só
  com curl.
- Confirme que o backend se recusa a subir (ou falha toda chamada) se
  `AUTH_OAUTH_UPSERT_TOKEN` não estiver definido num ambiente parecido com produção —
  isso precisa falhar fechado, nunca aberto.

### Isolamento da chave do PostHog

Rode de novo a checagem `grep -r "phx_" front/.next/static/` da §6 acima como
parte de todo build de release candidate, não só uma vez durante o desenvolvimento.

### Propriedade dos links de campanha

Confirme de novo a §3.3 acima (exclusão entre instituições → 403) — este é o único
lugar do épico em que uma instituição poderia, de outra forma, ler/alterar
dados de outra se o guard regredisse.

## Isolamento entre instituições

1. Crie duas contas de instituição, A e B, cada uma com seus próprios links de turma
   e tráfego de gameplay (use valores distintos de `utm_institution`).
2. Entre como A e veja `/institution`, `/institution/funnel`,
   `/institution/report`, `/institution/links`.
3. **Esperado:** todo número e todo link listado pertencem só a A.
4. Saia, entre como B e repita.
5. **Esperado:** B nunca vê os nomes de turma, links ou métricas de A, e vice-versa.
   Confirme que isso vale mesmo quando as duas instituições usaram o mesmo
   **nome** de turma (ex.: as duas criaram um link `"turma-3a"`) — eles precisam
   continuar com escopo por `institutionSlug`, sem colidir.
6. Confirme que `/public-dashboard` é a **única** página em que números agregados
   entre instituições devem aparecer — em todos os outros lugares, o isolamento
   precisa se manter.

## Rate limiting e cache

| Endpoint | Limite | Método de teste |
|---|---|---|
| `POST /auth/password/register` | 3/hora por email | Rode o curl da §2.1 4x em loop, espere 429 na 4ª |
| `POST /auth/password/login` | 5/15min por email | Faça tentativas com senha errada em loop, espere 429 |
| `POST /auth/password/reset/request` | 3/hora por email | Rode o curl da §2.4 em loop |
| Query API do PostHog (via `/api/edital/*`) | Aplicado no servidor pelo próprio PostHog (429 + `retry-after`) | Force muitas combinações distintas de filtros rapidamente; confirme que o app mostra um erro tratado, não um crash |
| Cache de resultados de query | `POSTHOG_QUERY_CACHE_TTL_MS` (padrão 300000ms), máx. 200 entradas | Carregamentos repetidos com filtros idênticos dentro do TTL não devem aumentar o volume de chamadas à API do PostHog |

## Solução de problemas

### `/api/edital/health` retorna `configured: false`

Confira se as três, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` e
`POSTHOG_QUERY_HOST`, estão definidas no env do serviço do **front** — esta é uma
chave só do servidor, diferente da `POSTHOG_API_KEY` do lado do client.

### O email de confirmação nunca chega

Confira o `EMAIL_PROVIDER` — se for `mock`, o link é registrado no console do
backend, e não enviado de fato por email:

```bash
docker compose -f compose.development.yaml logs back | grep MockEmail
```

Links de confirmação aparecem como `[MockEmail] Verification to …`; links de
redefinição de senha aparecem como `[MockEmail] Magic link to …`.

### O CSV abre com acentos corrompidos no Excel

Confirme que o arquivo começa com um BOM UTF-8 (`EF BB BF`) — se uma extensão
do navegador ou uma ferramenta intermediária o removeu, baixe de novo diretamente.

### Os números do dashboard não batem com uma query SQL manual no PostHog

Rode manualmente a query HogQL equivalente no editor SQL do PostHog,
usando os mesmos filtros de `commonPredicate` (`anonymous_player_id != ''`,
`campaign_source = '<slug>'`, janela de timestamp) que o `queries.ts` monta —
uma divergência geralmente significa que algum filtro (turma, clamp de data) não está sendo
aplicado de forma idêntica.

### `turma_source`/`campaign_source` nunca aparece nos eventos

Confira se a fixação do first-touch já não travou um valor diferente (ou
vazio) de uma visita anterior no mesmo navegador — limpe o
`localStorage`/cookies e tente de novo com os parâmetros `?utm_*` presentes no
primeiríssimo carregamento de página.

## Checklist de aprovação

### OAuth e onboarding

- [ ] O login com Google cria uma nova conta de instituição
- [ ] Uma conta nova sem slug é redirecionada para `/institution/onboarding`
- [ ] O onboarding deriva um slug único a partir do nome da instituição
- [ ] Conflito de email (conta de jogador existente) mostra `EmailConflict` em `/login`
- [ ] `x-oauth-upsert-token` falha fechado quando está sem valor ou não bate

### Auth com senha

- [ ] O cadastro envia um email real de confirmação (sem verificação automática)
- [ ] O link de confirmação verifica e faz login numa única etapa
- [ ] Login/cadastro/redefinição respeitam seus rate limits
- [ ] Formato inválido de `institutionSlug` é rejeitado

### Links de campanha

- [ ] Criar/listar/apagar funciona ponta a ponta pela UI de `/institution/links`
- [ ] A validação de slug bate com `ORIGIN_SLUG_PATTERN`
- [ ] `source` duplicado para a mesma instituição retorna 409
- [ ] Exclusão entre instituições é rejeitada (403/404)
- [ ] Nenhum evento do PostHog dispara ao gerenciar links

### Dashboard da instituição

- [ ] As páginas de visão geral, funil e relatório carregam com todos os presets de intervalo de datas
- [ ] O filtro de turma restringe os resultados; turma inválida volta para o total sem erro
- [ ] O export CSV abre corretamente no Excel pt-BR (BOM, `;`, vírgula decimal)
- [ ] O estado dos filtros faz o round-trip pela URL ao recarregar

### Dashboard público

- [ ] Carrega sem exigir autenticação
- [ ] Mostra apenas números agregados, nunca recortes por instituição
- [ ] Só os presets 7d/30d/90d/all-time estão disponíveis

### Instrumentação do PostHog

- [ ] O cookie `gp_distinct_id` persiste entre recarregamentos (Max-Age de ~400 dias)
- [ ] `campaign_source`/`turma_source` de first-touch se mantêm entre recarregamentos sem o parâmetro
- [ ] Slugs de UTM envenenados/malformados são sanitizados, não repassados crus
- [ ] A chave `phx_` nunca aparece no bundle do frontend gerado no build

### Eventos do funil

- [ ] As 3 etapas de aquisição (`landing_page_viewed`, `play_clicked`, `gameplay_started`) disparam em ordem
- [ ] O `level_completed` de cada nível (com o `level_number` correto) dispara no sucesso do quiz, avançando a etapa do funil daquele nível
- [ ] A quantidade de etapas do funil bate com o tamanho de `DASHBOARD_LEVELS` (3 de aquisição + 1 por nível, 7 hoje)
- [ ] Terminar a investigação (qualquer final) dispara `investigation_completed` com `level_id`/`level_number`/`is_correct`/`revealed` e conta como ter terminado o jogo
- [ ] As pistas do nível 4 contam só `investigation_clue_placed` fora do tutorial; os níveis 1–3 contam `clue_collected`, nunca `clue_used`
- [ ] "Estrelas por fase" mostra a média da melhor partida de cada jogador por nível, num máximo de 5
- [ ] O nível 4 envia um registro para `/scores` e dispara `progress_updated`
- [ ] `gameplay_started` dispara exatamente uma vez por sessão, não por nível
- [ ] Um quiz de fim de nível reprovado emite `level_failed`, não `level_completed`, e não avança o funil
- [ ] `critical_error_occurred` dispara numa falha forçada de carregamento de asset
- [ ] `chapter_1_started`/`chapter_1_completed` ainda disparam no nível 1 (consumidor legado `game_event`), mas está confirmado que não fazem parte da query do funil do próprio dashboard

### Segurança

- [ ] Endpoints com segredo compartilhado usam comparação em tempo constante e falham fechado
- [ ] O isolamento entre instituições se mantém em todas as páginas do dashboard, exceto a pública
- [ ] A proteção contra open redirect rejeita destinos externos de `?redirect=` em `/login`

*Fim do Guia de Testes Manuais*
