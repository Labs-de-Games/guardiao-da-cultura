# Rodar local

## Primeira vez

```bash
git clone git@github.com:Labs-de-Games/gameplate.git
cd gameplate
npm ci
cp .env.example .env
make up
make db-migrate
```

O `npm ci` também instala os hooks de Git. Os valores padrão do `.env.example`
já funcionam para desenvolvimento e não exigem nenhum segredo real.

| Serviço | Endereço |
|---|---|
| Jogo | http://localhost:3000 |
| API | http://localhost:3001 |
| Banco | localhost:5432 |

## Docker ou nativo

São dois modos. `make up` sobe tudo em Docker, incluindo o banco, e é o modo
padrão. `make local-all` roda front e back nativamente pelo Turborepo, mais
rápido para iterar, mas exige um PostgreSQL seu já rodando.

Para rodar só um lado:

```bash
make local-front
make local-back
```

## Comandos

Use estes comandos. Não invente alternativas: o `AGENTS.md` do repositório é
explícito sobre isso, e comandos improvisados já quebraram ambiente de gente do
time.

| Objetivo | Comando |
|---|---|
| Subir em Docker | `make up` |
| Subir nativo | `make local-all` |
| Derrubar | `make down` |
| Ver logs | `make logs` |
| Lint | `make lint` |
| Corrigir lint | `npm run lint:fix` |
| Testes | `make test` |
| Lint e testes | `make check` |
| Verificar tipos | `npm run typecheck` |
| Rodar migrations | `make db-migrate` |
| Criar migration | `make db-migrate-generate NAME=NomeDaMigration` |
| Limpar tudo | `make deep-clean` |

`make help` lista todos.

## Variáveis de ambiente

O `.env.example` está completo e comentado. Nunca commite o `.env`.

Três regras que evitam retrabalho:

**Nada com prefixo `NEXT_PUBLIC_` é secreto.** Essas variáveis vão para o pacote
que o navegador baixa.

**`NEXT_PUBLIC_` é resolvido no momento do build.** Trocar o valor no Coolify não
tem efeito nenhum. É preciso reconstruir a imagem.

**`RESPONSIVEVOICE_API_KEY` não pode ganhar o prefixo `NEXT_PUBLIC_`.** Ela é
usada apenas no servidor, pela rota `/api/tts/synthesize`. Ela é opcional:
deixe `RESPONSIVEVOICE_API_KEY=` vazia, como no `.env.example`, e a rota
responde `503` (`tts_unavailable`). A narração então cai no Web Speech API do
navegador. Não use um valor de exemplo como `xxxxxxxx`: a rota trata qualquer
valor como chave real e responde `502` em cada fala.

**A voz do navegador depende do sistema.** Sem a chave, quem fala é o
sintetizador de voz do navegador, e ele nem sempre funciona de fábrica. Em
alguns sistemas, principalmente Linux, pode ser preciso instalar um motor de
voz no sistema operacional ou iniciar o navegador com uma flag ou configuração
específica. Para conferir, rode `speechSynthesis.getVoices()` no console do
navegador: uma lista vazia significa que não há vozes e a narração vai ficar
muda.

Em desenvolvimento, `EMAIL_PROVIDER=mock` faz o magic link de login aparecer no
console em vez de ser enviado por e-mail.

## Ferramentas

**Biome** faz lint e formatação. Não é ESLint e não é Prettier. Não discuta
indentação em revisão: rode `npm run lint:fix`.

**TypeScript** em modo estrito, obrigatório. Sem `any`. Se você não sabe o tipo,
descubra. `unknown` com narrowing é aceitável.

**Jest** roda os testes dos dois workspaces.

**Hooks de Git** instalados pelo husky:

| Hook | O que roda |
|---|---|
| pre-commit | verificação de tipos e lint dos arquivos em staging |
| commit-msg | validação do formato do commit |
| pre-push | suíte de testes |

O `pre-commit` só é pulado por inteiro se o `npx` não existir. A etapa de
lint tolera dependências ausentes e apenas avisa, mas a verificação de tipos
não: sem `node_modules` instalado, ela falha e o commit é bloqueado. Se você
clonou e ainda não rodou `npm ci`, rode antes de commitar.

Para pular os hooks, use `git commit --no-verify`. O CI vai reprovar de
qualquer forma se o código estiver quebrado, então isso serve para casos em
que o hook não se aplica, como um commit só de documentação.

## Quando dá errado

| Sintoma | Solução |
|---|---|
| Porta 3000, 3001 ou 5432 ocupada | Pare o serviço conflitante ou ajuste `compose.development.yaml` |
| Erro estranho de dependência | `make sync` |
| Container em estado inconsistente | `make clean && make up` |
| Nada funciona | `make deep-clean && make up` |
| Migration não aplicou | Confira se o container do back está de pé com `make development-ps` |
| Narração muda | O navegador não tem vozes. Veja se `speechSynthesis.getVoices()` volta vazio e instale ou habilite um motor de voz |
| `/api/tts/synthesize` responde `502` | Chave do ResponsiveVoice inválida (por exemplo `xxxxxxxx`). Deixe `RESPONSIVEVOICE_API_KEY=` vazia e reinicie o front |
