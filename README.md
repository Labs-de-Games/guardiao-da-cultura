🌐 Português (Brasil) | [English](./README.en.md)

<p align="center">
  <img src="./docs/images/readme/logo-jogo.png" width="240" alt="Logo do Guardião da Cultura: um escudo com pinturas rupestres, uma igreja colonial, capoeira e o Cristo Redentor, segurado por um guerreiro indígena acima de um pergaminho com o nome do jogo">
</p>

# Guardião da Cultura

<img src="./docs/images/readme/hero.gif" align="right" alt="O investigador controlado pelo jogador, de chapéu e jaqueta marrons">

Um jogo 2D para navegador sobre arte e cultura brasileiras. Você é um
investigador que percorre espaços culturais — Inhotim, o Teatro Amazonas, o São
João de Campina Grande — restaurando obras danificadas ou fora do lugar,
conversando com quem trabalha ali e respondendo quizzes sobre o que encontra.

O jogo foi produzido com recursos de incentivo público pela **Lei Rouanet** e é
publicado como código aberto para que desenvolvedores e educadores possam
executá-lo, estudá-lo, adaptá-lo e reutilizar o seu conteúdo.

| Inhotim | Teatro Amazonas | São João de Campina Grande |
|:---:|:---:|:---:|
| ![Uma galeria do Inhotim com molduras vazias nas paredes, o investigador no andar de baixo e a Inspetora Jarbas no andar de cima](./docs/images/readme/level-inhotim.png) | ![O palco dourado e ornamentado do Teatro Amazonas, com um holofote roxo aceso sobre o investigador](./docs/images/readme/level-teatro-amazonas.png) | ![Um palco colorido de São João à noite, com bandeirinhas, um músico de vestido florido e o investigador](./docs/images/readme/level-sao-joao.png) |

## Jogue

Jogue no navegador em **[Guardião da Cultura](https://guardiaodacultura.42.rio/)**.
Funciona em computador com teclado.

## O que tem no jogo

**Três lugares, três missões, um culpado.**

- **Inhotim — a sala de restauração.** Alguém tirou as esculturas e as pinturas
  do lugar e rasgou uma fotografia. Coloque cada obra onde ela deve ficar,
  encontre os pedaços da foto e monte-a de novo.
- **Teatro Amazonas — a galeria de cartazes.** Vista os figurinos, pendure os
  cartazes, reorganize as estátuas no palco e acenda o holofote certo.
- **São João de Campina Grande — a festa.** Refaça os passos da quadrilha,
  conserte as luzes do palco, reúna a banda de forró e afine a sanfona.

Cada lugar termina com um quiz sobre a arte e a cultura que você encontrou pelo
caminho.

- **A investigação.** Depois de salvar a festa, é hora de dizer quem estava por
  trás de tudo. Quanto menos acusações erradas você fizer, mais estrelas ganha.

<img src="./docs/images/readme/inspetora-jarbas.gif" align="left" alt="Inspetora Cremilda Jarbas, uma mulher de cabelos brancos e óculos, de terno escuro">

**Inspetora Cremilda Jarbas** é a sua chefe. Ela te manda para cada caso, te
mantém no rumo com um humor seco e fala do jeito que se fala em cada lugar que
visita. Em Minas Gerais: *"Tá um trem doido aqui, tiraram os quadros do lugar,
rasgaram as fotografias… Nó! Um crime!"*

<br clear="left">

**Um quadro de pistas.** Cada pista que você encontra é fixada no quadro, e os
fios entre elas contam o que aconteceu.

<p align="center">
  <img src="./docs/images/readme/evidence-board.png" width="600" alt="O quadro de pistas, com o título Pistas, quatro cartões de pista fixados e ligados por um fio vermelho">
</p>

**Feito para todo mundo.** Os diálogos podem ser lidos em voz alta, os textos
seguem diretrizes de linguagem simples e de linguagem neutra de gênero, e, se
você ficar parado por um tempo, o jogo mostra o caminho.

**Estrelas e medalhas** marcam o seu progresso em cada lugar.

## Quem fez e por quê

O Guardião da Cultura foi produzido pelo Labs de Games da 42 Rio, com recursos
da **Lei Rouanet** e apoio do Governo Federal, do Ministério da Cultura, da Galp
e da Bemobi. As obras vêm de artistas e espaços culturais que concordaram em
mostrá-las no jogo. Todas as pessoas envolvidas estão listadas em
[`CREDITS.md`](./CREDITS.md), que espelha a tela de créditos do jogo.

**Mantenedora:** [@anacarla-42](https://github.com/anacarla-42) revisa e aceita
contribuições e é a responsável por receber relatos de segurança.

> ### Vai usar os assets do jogo? Os créditos são obrigatórios.
>
> Se você reutilizar qualquer obra, imagem ou som do jogo, precisa dar crédito
> aos artistas e à equipe que os criou.
>
> O código-fonte é MIT. Os **assets não são**. As obras reproduzidas neste jogo
> — de Abdias Nascimento, Claudia Andujar, Edgard de Souza e outros — foram
> liberadas para publicação com a condição obrigatória de que **o crédito seja
> sempre dado**, e os assets originais produzidos pela equipe são CC BY 4.0, que
> traz a mesma obrigação.
>
> Se o seu fork, build ou extração incluir qualquer coisa de
> `front/public/assets/`, leve junto os créditos de [`CREDITS.md`](./CREDITS.md)
> para um lugar que os seus usuários possam acessar. Distribuir só o `LICENSE`
> não basta. Os termos completos estão em [`ASSETS-LICENSE.md`](./ASSETS-LICENSE.md),
> e as logos dos patrocinadores não são licenciadas — veja o [`NOTICE`](./NOTICE).

## Para educadores

Os quizzes, os diálogos e as obras expostas ficam separados do jogo em si, então
você pode reescrever um quiz ou recontar a história de um lugar para os seus
alunos sem programar. O [`docs/pt-BR/CONTENT-REUSE.md`](./docs/pt-BR/CONTENT-REUSE.md)
explica cada parte e como alterá-la — inclusive a única parte que não é
opcional: uma versão adaptada precisa manter os créditos.

Escolas e instituições culturais também têm um painel que mostra como os seus
jogadores estão avançando no jogo.

## Limitações conhecidas

- **O jogo é só em português.** Todas as histórias, quizzes e menus estão em
  português do Brasil.
- **Só computador e teclado.** Ainda não há controles de toque para celulares ou
  tablets.
- **A voz da narração depende do navegador.** Como a voz de leitura soa, e se há
  uma disponível, varia entre navegadores e computadores.

## Para desenvolvedores

Você precisa de Node.js 24+, Docker e Git. Nada exige chave de API, conta de
e-mail ou serviço pago.

```bash
git clone https://github.com/Labs-de-Games/guardiao-da-cultura.git
cd guardiao-da-cultura
cp .env.example .env
make setup
make development-up
make db-migrate
```

Depois abra <http://localhost:3000>.

- [`docs/pt-BR/CONTRIBUTING.md`](./docs/pt-BR/CONTRIBUTING.md) — ambiente, comandos, login, solução de problemas e o fluxo de contribuição
- [`docs/pt-BR/ARCHITECTURE.md`](./docs/pt-BR/ARCHITECTURE.md) — stack, design do sistema, integrações opcionais e contratos de API
- [`docs/pt-BR/CONTENT-REUSE.md`](./docs/pt-BR/CONTENT-REUSE.md) — como adaptar as fases, os quizzes e a narrativa
- [`docs/README.md`](./docs/README.md) — índice de todos os documentos, em inglês e em português do Brasil
- [`SECURITY.md`](./SECURITY.md) — como relatar uma vulnerabilidade
- [`AGENTS.md`](./AGENTS.md) — como agentes de IA são usados no desenvolvimento (em inglês)
- [`CREDITS.md`](./CREDITS.md), [`ASSETS-LICENSE.md`](./ASSETS-LICENSE.md), [`NOTICE`](./NOTICE) — créditos, termos dos assets e marcas

## Como contribuir

Contribuições são bem-vindas. Crie a sua branch a partir de `develop`, abra o
pull request contra `develop` e siga o
[`docs/pt-BR/CONTRIBUTING.md`](./docs/pt-BR/CONTRIBUTING.md).

## Segurança

Relate vulnerabilidades de forma privada pelo GitHub, não em uma issue pública.
Veja o [`SECURITY.md`](./SECURITY.md).

## Licença

**Código-fonte: [MIT](./LICENSE).**

**Assets: não são MIT.** Tudo em `front/public/assets/` segue o
[`ASSETS-LICENSE.md`](./ASSETS-LICENSE.md). A maior parte exige atribuição;
alguns arquivos não são livres para uso comercial. Os nomes e as logos
institucionais (Governo Federal, Lei Rouanet, Ministério da Cultura, Galp,
Bemobi, 42 Rio) são marcas e não são licenciados — um fork precisa removê-los.
Veja o [`NOTICE`](./NOTICE).
