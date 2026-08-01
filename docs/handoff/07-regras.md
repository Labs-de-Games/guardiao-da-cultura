# Regras

Esta seção é diferente das outras. O que está aqui não é recomendação. É
critério de merge.

---

## Você defende cada linha que sobe

**Você só abre uma PR de código que consegue revisar e defender linha por linha.**

Se alguém pedir, numa reunião ou num comentário, para você explicar por que uma
função existe, o que acontece se aquele `if` for falso, ou por que aquele `await`
está ali, você precisa responder. Sem abrir o arquivo.

Se você não consegue, a PR é fechada. Não é pedido de mudança, não é conversa. É
fechada, e o trabalho volta para você entender antes de tentar de novo.

Vale igual para código escrito à mão, gerado por IA ou copiado de outro projeto.
A origem não importa. A responsabilidade é de quem abre a PR.

O motivo é prático. Código que ninguém entende é código que ninguém consegue
corrigir às 23h de uma sexta quando a produção cai.

---

## Mudança visual tem demonstração

**Toda PR que muda algo visualmente no jogo precisa de uma seção de demonstração.**

Conta como mudança visual:

- Qualquer alteração de interface React
- Qualquer alteração de cena, objeto ou sprite Phaser
- Assets novos ou trocados: imagens, tilesets, spritesheets, fontes
- Animações, transições, efeitos
- Layout, ordem de sobreposição, escala, posicionamento
- Áudio com feedback visual acoplado
- Texto visível ao jogador

A demonstração precisa de vídeo curto ou prints de antes e depois. **Print só do
depois não serve.** Quem revisa não tem como saber o que mudou.

Se a mudança só aparece sob alguma condição, como um nível específico ou uma
flag, a demonstração precisa mostrar como chegar lá. A PR 517 resolve isso
adicionando um atalho de depuração que só existe em desenvolvimento, para o
revisor alcançar o estado sem jogar a fase inteira.

Mudança visual precisa de duas aprovações: uma técnica e uma de design ou
produto. O board tem uma coluna dedicada a isso. Se o card pulou de
`In Progress` direto para `In Code Review`, o processo foi furado.

---

## O board reflete a realidade

**Não existe trabalho em andamento sem card em `In Progress` com responsável.**

**O card se move antes do trabalho começar, não depois de terminar.**

**Toda task tem `Priority` e `Effort` antes de sair de `Refinement`.**

**Bloqueio se comunica no mesmo dia, por comentário na issue.**

**O mínimo é uma atualização por dia útil no que estiver com você.**

**A branch sai de `develop` e a PR volta para `develop`.** Só a PR de release
aponta para `master`.

Isso custa segundos por dia e é o que mantém o time sabendo quem está com o quê.

---

## Zonas onde agente de IA não mexe sozinho

O `AGENTS.md` da raiz separa o repositório em duas áreas. Estas são livres:

- `front/src/components/`
- `front/src/lib/`
- `front/src/game/`
- `back/src/modules/*/services/`
- `back/src/modules/*/controllers/`
- `back/src/modules/*/dto/`
- `docs/`

Nestas é preciso parar e alinhar com uma pessoa antes:

- `back/src/core/database/migrations/`, porque afeta dados de produção
- `back/src/modules/*/entities/`, porque exige planejar migration
- `.github/workflows/`, porque afeta todos os deploys
- `nginx/`
- `compose.*.yaml`
- `.env.example`
- os arquivos `package.json`

Além disso, agente não abre PR sozinho e não dá push sem confirmação explícita
de uma pessoa.

---

## Padrões de código

**Sem `any`.** Se você não sabe o tipo, descubra.

**Sem número mágico e sem valor fixo espalhado.** Constantes vão para
`front/src/game/constants/`.

**A fronteira React e Phaser é o EventBus.** Componente não acessa cena
diretamente, cena não manipula DOM do React.

**Estado de interface vive no Zustand**, não espalhado em estado local.

**Cache do Phaser é isolado por `levelId`.** Chave global já causou vazamento de
dados entre níveis.

**Ordem de sobreposição é centralizada.** Não invente valor novo.

**No backend, não converta imports em `import type`.** Quebra a injeção de
dependência do NestJS.

---

## Definição de pronto

Uma task só está pronta quando tudo isto é verdade:

- Implementação completa
- Testes passando, e testes novos se o comportamento é novo
- Revisão aprovada
- Se visual: demonstração na PR e revisão de design aprovada
- Documentação atualizada quando o comportamento documentado mudou
- PR mergeada e branch deletada
- Card em `Done`

**Código mergeado não é pronto.** Se a documentação ficou desatualizada, não
está pronto.

---

## O que faz uma PR ser recusada

- PR grande com mudanças não relacionadas misturadas
- Código que parece certo mas nunca foi executado
- Tratamento de erro faltando em caminho que pode falhar
- Cópia sem adaptação
- Comentários que não descrevem o que o código faz
- Mudança visual sem demonstração
- Ausência de `Closes #N` quando existe issue
