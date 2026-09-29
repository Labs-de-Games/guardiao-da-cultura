# Guia de Testes Manuais — Autenticação e Autorização

> **Escopo:** Este guia cobre a verificação manual end-to-end do sistema de autenticação sem senha com magic link implementado nas Fases 1–10.
> **Público-alvo:** Devs e testers de QA que estão verificando o sistema de auth antes da cobertura de testes automatizados (Fase 11).

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Testes da API do Backend](#testes-da-api-do-backend)
  - [Fluxo de Cadastro](#1-fluxo-de-cadastro)
  - [Fluxo de Login com Magic Link](#2-fluxo-de-login-com-magic-link)
  - [Refresh de Token e Logout](#3-refresh-de-token-e-logout)
  - [Endpoints de Admin](#4-endpoints-de-admin)
- [Testes dos Fluxos do Frontend](#testes-dos-fluxos-do-frontend)
  - [Cadastro](#1-cadastro-frontend)
  - [Verificação de Email](#2-verificação-de-email)
  - [Login com Magic Link](#3-login-com-magic-link)
  - [Persistência de Sessão](#4-persistência-de-sessão)
  - [Logout e Logout All](#5-logout-e-logout-all)
- [Casos de Borda e Cenários de Erro](#casos-de-borda-e-cenários-de-erro)
- [Verificação de Segurança](#verificação-de-segurança)
- [Sincronização entre Abas](#sincronização-entre-abas)
- [Rate Limiting](#rate-limiting)
- [Solução de Problemas](#solução-de-problemas)

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) (v24+) instalado
- Docker e Docker Compose rodando
- Repositório Git clonado e na branch `feat/auth-implementation`
- `.env` do backend configurado com `JWT_SECRET` e `MAGIC_LINK_SECRET` válidos e com as configurações do serviço de email
- MailHog, Mailtrap ou a saída do console disponível para inspecionar os emails enviados

## Configuração do Ambiente

```bash
# Start the full development stack
cd /home/flpdorea/Projects/gameplate
make dev

# Verify services are healthy
docker compose -f compose.development.yaml ps
```

Containers que devem estar rodando:
- `gameplate-front` — Next.js em http://localhost:3000
- `gameplate-back` — NestJS em http://localhost:3001
- `gameplate-db` — PostgreSQL em localhost:5432

Se estiver usando o serviço de email mock (padrão em desenvolvimento), os emails de magic link e de verificação são registrados no stdout do container do backend:

```bash
make logs-back
# or
docker compose -f compose.development.yaml logs -f back
```

---

## Testes da API do Backend

Todos os endpoints do backend têm o prefixo `/api/v1`. Use `curl` ou um cliente HTTP como Postman/Insomnia.

### 1. Fluxo de Cadastro

#### 1.1 Cadastrar um novo usuário

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1995-06-15",
    "email": "testuser@example.com",
    "nickname": "testuser_42"
  }'
```

**Resposta esperada (200 OK):**
```json
{
  "message": "Check your email"
}
```

**Verifique nos logs do backend:** Uma URL de email de verificação é impressa contendo os query parameters `token=` e `nonce=`.

#### 1.2 Cadastrar com email duplicado

Repita a mesma requisição com o mesmo email.

**Resposta esperada (200 OK):**
```json
{
  "message": "Check your email"
}
```

> **Checagem de segurança:** A resposta é idêntica à da primeira requisição. Nenhum vazamento por enumeração de emails.

#### 1.3 Cadastrar com dados inválidos

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "",
    "lastName": "User",
    "dateOfBirth": "invalid-date",
    "email": "not-an-email",
    "nickname": "ab"
  }'
```

**Resposta esperada (400 Bad Request):**
Erros de validação para cada campo inválido.

#### 1.4 Preview do token de verificação (GET)

Copie o link de verificação dos logs do backend. Ele se parece com:
```
http://localhost:3001/api/v1/auth/verify-email?token=XYZ&nonce=ABC
```

```bash
curl -v "http://localhost:3001/api/v1/auth/verify-email?token=<TOKEN>&nonce=<NONCE>"
```

**Resposta esperada (302 Redirect):**
- Header `Location`: `http://localhost:3000/auth/confirm-verification?token=<TOKEN>`
- O token **AINDA NÃO** foi consumido (confirmação em duas etapas).

#### 1.5 Consumir o token de verificação (POST)

```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-email/confirm \
  -H "Content-Type: application/json" \
  -d '{ "token": "<TOKEN>" }'
```

**Resposta esperada (200 OK):**
```json
{
  "redirectTo": "/"
}
```

**Verifique se os cookies foram definidos:**
```bash
# Use -c to save cookies
curl -X POST http://localhost:3001/api/v1/auth/verify-email/confirm \
  -H "Content-Type: application/json" \
  -d '{ "token": "<TOKEN>" }' \
  -c cookies.txt

cat cookies.txt
```

Você deve ver:
- `refresh_token` — httpOnly, Secure, SameSite=Strict
- `auth_status` — não httpOnly, SameSite=Lax

#### 1.6 Reenviar o email de verificação

```bash
curl -X POST http://localhost:3001/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{ "email": "testuser@example.com" }'
```

**Resposta esperada (200 OK):**
```json
{
  "message": "Check your email"
}
```

---

### 2. Fluxo de Login com Magic Link

#### 2.1 Solicitar o magic link

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "testuser@example.com" }' \
  -c login_attempt.txt
```

**Resposta esperada (200 OK):**
```json
{
  "message": "Check your email"
}
```

**Verifique os cookies:**
```bash
cat login_attempt.txt
```
- O cookie `login_attempt` deve estar presente (httpOnly, expira em 15min).

#### 2.2 Preview do magic link (GET)

Copie o magic link dos logs do backend.

```bash
curl -v "http://localhost:3001/api/v1/auth/login?token=<TOKEN>&nonce=<NONCE>" \
  -b login_attempt.txt
```

**Resposta esperada (302 Redirect):**
- Header `Location`: `http://localhost:3000/auth/confirm-login?token=<TOKEN>`

#### 2.3 Consumir o magic link (POST)

```bash
curl -X POST http://localhost:3001/api/v1/auth/login/confirm \
  -H "Content-Type: application/json" \
  -d '{ "token": "<TOKEN>" }' \
  -b login_attempt.txt \
  -c session.txt
```

**Resposta esperada (200 OK):**
```json
{
  "redirectTo": "/"
}
```

**Verifique os cookies em `session.txt`:**
- `refresh_token`
- `auth_status`

#### 2.4 Obter o usuário atual

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Resposta esperada (200 OK):**
```json
{
  "id": "uuid",
  "email": "testuser@example.com",
  "nickname": "testuser_42",
  "firstName": "Test",
  "lastName": "User",
  "role": "player",
  "isEmailVerified": true
}
```

> Para obter o access token: ele é retornado no corpo da resposta de `POST /auth/login/confirm` e de `POST /auth/verify-email/confirm`. Nos testes do frontend, ele fica armazenado em memória pelo interceptor do Axios.

---

### 3. Refresh de Token e Logout

#### 3.1 Refresh do token

Use o cookie `refresh_token` da sessão:

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -b session.txt
```

**Resposta esperada (200 OK):**
```json
{
  "accessToken": "new-jwt-token"
}
```

**Verifique:** Um novo cookie `refresh_token` é definido (rotação de token).

#### 3.2 Logout

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -b session.txt \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Resposta esperada (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Verifique:**
- Os cookies `refresh_token` e `auth_status` foram limpos.
- Um `POST /auth/refresh` posterior com o cookie antigo retorna 401.

#### 3.3 Logout de todos os dispositivos

Primeiro, faça login de novo para obter uma sessão nova. Depois:

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout-all \
  -b session.txt \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Resposta esperada (200 OK):**
```json
{
  "message": "Logged out from all devices"
}
```

**Verifique:**
- Todos os refresh tokens desse usuário foram revogados no banco de dados.
- O `jti` do access token está na blacklist.

---

### 4. Endpoints de Admin

#### 4.1 Criar um usuário admin

Atualize manualmente a role do usuário no banco de dados, ou cadastre um novo usuário e promova-o:

```bash
# Connect to the database
docker compose -f compose.development.yaml exec db psql -U postgres -d gameplate

# Promote user to admin
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

#### 4.2 Listar usuários (apenas admin)

```bash
curl http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

**Resposta esperada (200 OK):**
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

#### 4.3 Acessar um endpoint de admin sem ser admin

Use o access token de um jogador comum:

```bash
curl http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>"
```

**Resposta esperada (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

#### 4.4 Atualizar a role do usuário

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/users/<USER_ID>/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -d '{ "role": "institution" }'
```

**Resposta esperada (200 OK):**
Objeto do usuário atualizado.

#### 4.5 Alternar o status do usuário

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/users/<USER_ID>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -d '{ "isActive": false }'
```

**Resposta esperada (200 OK):**
Objeto do usuário atualizado.

**Verifique:** Um usuário inativo não consegue fazer login. Tentar `POST /auth/login` retorna a resposta genérica "Check your email", mas nenhum email com magic link é enviado.

---

## Testes dos Fluxos do Frontend

Abra o navegador em http://localhost:3000. Abra o DevTools (F12) → aba Network e ative **Preserve log**.

### 1. Cadastro (Frontend)

1. Acesse `/register`.
2. Preencha o formulário:
   - Nome: `Test`
   - Sobrenome: `User`
   - Data de nascimento: `06/15/1995`
   - Email: `testuser@example.com`
   - Nickname: `testuser_42`
3. Envie o formulário.

**Esperado:**
- O formulário mostra o estado de carregamento.
- Em caso de sucesso, o formulário é substituído por: "Check your email to verify your account."
- Nenhum toast de erro aparece.

**Verifique no DevTools:**
- `POST /api/v1/auth/register` retorna 200.
- O corpo da resposta contém `{ message: "Check your email" }`.

### 2. Verificação de Email

1. Abra os logs do backend (`make logs-back`) e encontre a URL do email de verificação.
2. Copie o valor do query parameter `token`.
3. Acesse `/auth/confirm-verification?token=<TOKEN>`.

**Esperado:**
- A página mostra o botão "Verify Email".
- Clicar no botão mostra um spinner de carregamento e depois redireciona para `/`.

**Verifique no DevTools:**
- `POST /api/v1/auth/verify-email/confirm` retorna 200 com `{ redirectTo: "/" }`.
- Os cookies da resposta incluem `refresh_token` e `auth_status`.
- `GET /api/v1/auth/me` é chamado automaticamente depois do redirecionamento e retorna os dados do usuário.

### 3. Login com Magic Link

#### 3.1 Solicitar o magic link

1. Faça logout primeiro (se estiver logado).
2. Acesse `/login`.
3. Informe o email: `testuser@example.com`.
4. Envie.

**Esperado:**
- O formulário mostra o estado de carregamento.
- É substituído por "Check your email for a magic link" e um timer de contagem regressiva de 60 segundos.
- O botão de reenviar fica desabilitado durante a contagem regressiva.

**Verifique no DevTools:**
- `POST /api/v1/auth/login` retorna 200.
- O cookie `login_attempt` é definido.

#### 3.2 Confirmar o login

1. Abra os logs do backend e copie o `token` do magic link.
2. Acesse `/auth/confirm-login?token=<TOKEN>`.

**Esperado:**
- A página mostra o botão "Confirm Login".
- Clicar no botão mostra um spinner de carregamento e depois redireciona para `/`.

**Verifique no DevTools:**
- `POST /api/v1/auth/login/confirm` retorna 200.
- Novos cookies `refresh_token` e `auth_status` são definidos.
- `GET /api/v1/auth/me` retorna os dados do usuário.

### 4. Persistência de Sessão

1. Confirme que você está logado (acesse `/` e o jogo carrega).
2. Feche a aba do navegador.
3. Abra http://localhost:3000 de novo em uma nova aba.

**Esperado:**
- A página carrega sem redirecionar para `/login`.
- O `AuthGuard` mostra o `LoadingScreen` rapidamente.
- `GET /api/v1/auth/me` é chamado com o access token armazenado.
- Se o access token tiver expirado, `POST /api/v1/auth/refresh` é chamado automaticamente e depois `/me` é tentado de novo.
- O jogo é renderizado depois que os dados do usuário são carregados.

### 5. Logout e Logout All

#### 5.1 Logout

1. Enquanto estiver logado, dispare o logout (implemente um botão de logout na UI ou chame `logout()` a partir de `useAuth()`).

**Esperado:**
- O usuário é redirecionado para `/login`.
- O cookie `auth_status` é removido.
- O cookie `refresh_token` é limpo.

**Verifique no DevTools:**
- `POST /api/v1/auth/logout` retorna 200.
- Os headers `Set-Cookie` limpam os dois cookies.

#### 5.2 Logout All

1. Faça login em dois navegadores diferentes (ou em uma janela normal + anônima).
2. No Navegador A, dispare "Logout All Devices."

**Esperado:**
- Tanto o Navegador A quanto o Navegador B são redirecionados para `/login`.

**Verifique no Navegador B:**
- Na próxima chamada de API (ou ao recarregar a página), `POST /auth/refresh` retorna 401.
- O `AuthContext` limpa o estado e redireciona para `/login`.

---

## Casos de Borda e Cenários de Erro

### Magic Link Expirado

1. Solicite um magic link.
2. Espere 15 minutos (ou expire o token manualmente no banco de dados).
3. Acesse a página de confirmação e clique em "Confirm Login."

**Esperado:**
- `POST /auth/login/confirm` retorna 401 ou 400.
- O frontend redireciona para `/login?error=expired` com uma mensagem de erro.

### Magic Link Reutilizado

1. Solicite um magic link.
2. Clique no link e faça login com sucesso.
3. Volte para a página de confirmação e clique em "Confirm Login" de novo com o mesmo token.

**Esperado:**
- `POST /auth/login/confirm` retorna 400.
- O frontend redireciona para `/login?error=already_used`.

### Dispositivo Errado (Magic Link)

1. Solicite um magic link no Navegador A.
2. Copie apenas o `token` da URL (não o cookie).
3. Cole a URL da página de confirmação no Navegador B.

**Esperado:**
- `POST /auth/login/confirm` retorna 401 porque o nonce do cookie `login_attempt` não bate.
- O frontend redireciona para `/login?error=wrong_device`.

### Pre-fetch de Email

1. Solicite um magic link.
2. Cole a URL do magic link no Slack, no Discord ou em qualquer app de chat que gere preview de links.

**Esperado:**
- O preview dispara uma requisição `GET`, que só valida um preview.
- O token **NÃO** é consumido.
- Clicar no link a partir do email continua funcionando normalmente.

### 401s Simultâneos

1. Faça login e espere o access token expirar (15 minutos).
2. Dispare várias chamadas de API ao mesmo tempo (ex.: cliques rápidos em botões ou carregamento de página com vários fetches de dados).

**Esperado:**
- Apenas **uma** requisição `POST /auth/refresh` é enviada.
- Todas as requisições que falharam são refeitas com o novo access token.
- Nenhuma chamada de refresh duplicada na aba Network.

### Access Token na Blacklist

1. Faça login.
2. Copie o access token da memória (você pode logá-lo temporariamente no interceptor do Axios).
3. Faça logout.
4. Tente usar o access token copiado em uma requisição `curl`:

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <OLD_ACCESS_TOKEN>"
```

**Esperado:**
- A resposta é 401 Unauthorized.
- O `jti` foi colocado na blacklist.

---

## Verificação de Segurança

### Flags dos Cookies

Abra o DevTools → Application → Cookies → http://localhost:3000.

| Cookie | httpOnly | Secure | SameSite | Path |
|--------|----------|--------|----------|------|
| `refresh_token` | ✅ Sim | ✅ Sim | Strict | `/api/v1/auth` |
| `auth_status` | ❌ Não | ✅ Sim | Lax | `/` |
| `login_attempt` | ✅ Sim | ✅ Sim | Lax | `/api/v1/auth` |

**Verifique:**
- O `refresh_token` **NÃO** pode ser lido pelo JavaScript (`document.cookie` não o inclui).
- O `auth_status` **PODE** ser lido pelo JavaScript (necessário para o middleware e para as checagens no client).
- A flag `Secure` pode estar ausente no localhost (os navegadores permitem isso em desenvolvimento local).

### Armazenamento do Access Token

**Verifique:**
- Abra o DevTools → Console.
- Digite `localStorage.getItem('accessToken')` ou `sessionStorage.getItem('accessToken')`.
- Esperado: `null` (o token nunca é armazenado no storage).
- O token só existe na closure do interceptor do Axios / no estado do React.

### Defesa contra XSS

Como não existe campo de senha, o credential stuffing tradicional e o XSS de senha ficam eliminados. Verifique que:
- Nenhuma tag `<script>` ou event handler pode ser injetado pelo formulário de cadastro.
- O campo de nickname rejeita caracteres especiais (só alfanuméricos + underscore são permitidos).

### Rate Limiting

#### Limite de cadastro

```bash
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{ "firstName": "Test", "lastName": "User", "dateOfBirth": "1995-06-15", "email": "ratelimit@example.com", "nickname": "ratelimit_'$i'" }'
done
```

**Esperado:** Depois de 3 requisições do mesmo email dentro de 1 hora, as requisições seguintes retornam **429 Too Many Requests**.

#### Limite de login

```bash
for i in {1..7}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{ "email": "ratelimit@example.com" }'
done
```

**Esperado:** Depois de 5 requisições por email por hora, retorna 429.

---

## Sincronização entre Abas

1. Abra http://localhost:3000 na **Aba A** e faça login.
2. Abra http://localhost:3000 na **Aba B** (mesmo navegador, outra aba).

**Esperado na Aba B:**
- A Aba B detecta o cookie `auth_status` ao carregar.
- `GET /auth/me` dá certo sem exigir um novo login.

3. Na **Aba A**, dispare o Logout.

**Esperado na Aba B:**
- Em 1–2 segundos, a Aba B é redirecionada para `/login`.
- Isso é disparado pelo evento `LOGOUT` do `BroadcastChannel` (ou do fallback via `localStorage`).

4. Teste o **Logout All** a partir da Aba A.

**Esperado:**
- Todas as abas redirecionam para `/login`.

---

## Rate Limiting

| Endpoint | Limite | Método de teste |
|----------|-------|-------------|
| `POST /auth/register` | 3/h por email | Cadastros rápidos com o mesmo email |
| `POST /auth/login` | 5/h por email | Requisições de login rápidas com o mesmo email |
| `POST /auth/resend-verification` | 3/h por email | Requisições de reenvio rápidas |
| `POST /auth/refresh` | 30/min por IP | Chamadas de refresh rápidas |
| `GET /admin/*` | 30/min por IP | Carregamentos rápidos de páginas de admin |

**Verifique:** Quando o limite é excedido, a resposta é:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Solução de Problemas

### O email com o magic link não aparece nos logs

- Verifique se o container do backend está rodando: `docker compose ps`
- Verifique se o serviço de email está configurado corretamente no `.env`.
- Se estiver usando o serviço mock, confirme que `EMAIL_SERVICE=mock` está definido.

### Erros de CORS no navegador

- Verifique se o `CORS_ORIGIN` do backend inclui `http://localhost:3000`.
- Verifique se `credentials: true` está definido na configuração de CORS do NestJS.
- O header `Access-Control-Allow-Origin` NÃO pode ser `*` quando cookies são usados.

### O middleware não está redirecionando

- Verifique se o cookie `auth_status` está presente em DevTools → Application → Cookies.
- Se estiver ausente, verifique se `POST /auth/login/confirm` ou `POST /auth/verify-email/confirm` definiu o cookie com sucesso.
- Confirme que o frontend e o backend estão no mesmo domínio de nível superior (localhost serve).

### A sessão não é restaurada depois de recarregar

- Confira em DevTools → Network se há um `POST /api/v1/auth/refresh`.
- Se ele retornar 401, o cookie `refresh_token` pode estar ausente ou expirado.
- Verifique se o cookie é enviado com a requisição (procure o header `Cookie` na aba Network).

### Erro "Wrong device"

- Isso significa que o cookie `login_attempt` está ausente ou que o nonce não bate.
- Confirme que você está testando no mesmo navegador/sessão em que o magic link foi solicitado.
- Se estiver testando com `curl`, você precisa passar as flags `-b` e `-c` para manter os cookies.

---

## Checklist de Aprovação

Antes de seguir para a Fase 11 (Testes Automatizados), verifique todos os itens abaixo:

### Cadastro
- [ ] Um novo usuário consegue se cadastrar com dados válidos
- [ ] Email duplicado retorna uma resposta genérica idêntica (sem enumeração)
- [ ] Dados inválidos mostram erros de validação
- [ ] O email de verificação é enviado e registrado no log
- [ ] O preview do link de verificação (GET) não consome o token
- [ ] A confirmação da verificação (POST) ativa a conta e define os cookies
- [ ] O reenvio da verificação funciona e tem rate limit

### Login
- [ ] A solicitação do magic link envia o email e define o cookie `login_attempt`
- [ ] O preview do magic link (GET) redireciona para a página de confirmação sem consumir o token
- [ ] A confirmação do magic link (POST) define os cookies `refresh_token` e `auth_status`
- [ ] Dispositivo/cookie errado retorna o erro `wrong_device`
- [ ] Link expirado retorna o erro `expired`
- [ ] Link reutilizado retorna o erro `already_used`
- [ ] O pre-fetch de email não consome o token

### Sessão
- [ ] O access token é armazenado apenas em memória (não em localStorage/sessionStorage)
- [ ] A rotação do refresh token funciona (token antigo revogado, novo token emitido)
- [ ] A sessão é restaurada depois de recarregar a página, via refresh token
- [ ] 401s simultâneos resultam em uma única chamada de refresh
- [ ] Access token na blacklist retorna 401

### Logout
- [ ] O logout revoga o refresh token e limpa os cookies
- [ ] O logout-all revoga todos os refresh tokens e coloca o access token na blacklist
- [ ] O logout entre abas é sincronizado em todas as abas

### Middleware e Roteamento
- [ ] Usuário não autenticado acessando `/` é redirecionado para `/login`
- [ ] Usuário autenticado acessando `/login` é redirecionado para `/`
- [ ] O cookie `auth_status` pode ser lido pelo JavaScript e pelo middleware
- [ ] O cookie `refresh_token` é httpOnly e não pode ser lido pelo JavaScript

### Admin
- [ ] O admin consegue listar usuários
- [ ] O admin consegue atualizar a role do usuário
- [ ] O admin consegue alternar o status do usuário
- [ ] Não-admin recebe 403 nos endpoints de admin
- [ ] Usuário inativo não consegue fazer login

### Rate Limiting
- [ ] O cadastro tem rate limit por email
- [ ] O login tem rate limit por email
- [ ] O refresh tem rate limit por IP

### Segurança
- [ ] Todos os cookies têm as flags `SameSite`, `Secure` e `httpOnly` adequadas
- [ ] Não existe nenhum campo de senha na UI nem na API
- [ ] Nenhum secret de JWT ou de magic link é exposto em logs ou respostas
- [ ] As mensagens de erro não vazam informações sensíveis (ex.: "user not found")

---

*Fim do Guia de Testes Manuais*
