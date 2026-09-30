export interface CreditEntry {
  name: string;
  url?: string;
  license?: string;
}

export interface CreditSection {
  heading: string;
  entries: CreditEntry[];
}

/**
 * Source: https://github.com/Labs-de-Games/gameplate/issues/618#issuecomment-5285581428
 *
 * This list and `CREDITS.md` at the repository root are the same attribution
 * obligation rendered twice: one for players, one for anyone reusing the
 * assets. Several of the works here were cleared for publication on the
 * condition that credit is always given, so the two must never drift apart —
 * change both in the same pull request, and update `ASSETS-LICENSE.md` when the
 * licence terms of an entry change.
 */
export const CREDITS_SECTIONS: CreditSection[] = [
  {
    heading: "Realização",
    entries: [
      { name: "Governo Federal", url: "https://www.gov.br/" },
      {
        name: "Lei Rouanet",
        url: "https://www.gov.br/cultura/pt-br/assuntos/acoes-programas-e-politicas/lei-rouanet-1",
      },
      { name: "Ministério da Cultura", url: "https://www.gov.br/cultura/" },
      { name: "Galp", url: "https://www.galp.com/pt/" },
      { name: "Bemobi", url: "https://www.bemobi.com/" },
    ],
  },
  {
    heading: "Desenvolvedores",
    entries: [
      {
        name: "Alessandro Soares",
        url: "https://www.linkedin.com/in/alessandro-soares-51a08327a/",
      },
      {
        name: "César Augusto do Nascimento",
        url: "https://www.linkedin.com/in/cesaran42/",
      },
      {
        name: "Felipe Dórea",
        url: "https://www.linkedin.com/in/flpdorea/",
      },
      {
        name: "Gabriel Salgado",
        url: "https://www.linkedin.com/in/abg2jz/",
      },
      {
        name: "Henrique Jarbas",
        url: "https://www.linkedin.com/in/henrique-jarbas-71a0b6bb/",
      },
      {
        name: "Yuri Faustino",
        url: "https://www.linkedin.com/in/yuri-faustino-7b08a2193/",
      },
    ],
  },
  {
    heading: "Designer",
    entries: [
      {
        name: "Letícia Murteira",
        url: "https://www.linkedin.com/in/leticiamcardoso/",
      },
    ],
  },
  {
    heading: "Product Owner",
    entries: [
      {
        name: "Ana Carla César",
        url: "https://www.linkedin.com/in/anacarlacesar/",
      },
    ],
  },
  {
    heading: "Tech Lead",
    entries: [
      {
        name: "Tamillys Pantuza",
        url: "https://www.linkedin.com/in/tamillys/",
      },
    ],
  },
  {
    heading: "Oficina de Games",
    entries: [
      {
        name: "Felipe Fernandes",
        url: "https://mentoriasgamesbr.ementor.com.br/mentor/felipefernandes/",
      },
      {
        name: "Thiago Croft",
        url: "https://www.instagram.com/thiagocroft/",
      },
      {
        name: "Matheus Viana",
        url: "https://www.linkedin.com/in/matheus-viana-viuge-antunes-380587246/",
      },
      { name: "Rodrigo Mendes", url: "https://rodoes.art/3d-work" },
      {
        name: "Gabriel Salgado",
        url: "https://www.linkedin.com/in/abg2jz/",
      },
      { name: "Tamir Nadav", url: "https://linkedin.com/in/aquajew" },
      { name: "Antônio Ibrahine", url: "https://www.antonioibrahine.com/" },
      { name: "Daniel Martins", url: "https://linktr.ee/dmaisumoficial" },
    ],
  },
  {
    heading: "Apresentação",
    entries: [
      {
        name: "César Augusto do Nascimento",
        url: "https://www.linkedin.com/in/cesaran42/",
      },
      {
        name: "Fabrício De Martino",
        url: "https://www.instagram.com/mediadorcriativo/",
      },
    ],
  },
  {
    heading: "Licenças",
    entries: [
      {
        name: "Phaser",
        url: "https://phaser.io/",
        license: "MIT License — https://opensource.org/license/MIT",
      },
      {
        name: "ResponsiveVoice-NonCommercial",
        url: "https://responsivevoice.org",
        license: "Creative Commons BY-NC-ND 4.0",
      },
    ],
  },
  {
    heading: "Consultoria",
    entries: [
      {
        name: "Alfredo Tiomno Tolmasquim",
        url: "https://abgc.org.br/portfolio-item/prof-dr-alfredo-tiomno-tolmasquim/",
      },
      { name: "Daniel Martins", url: "https://linktr.ee/dmaisumoficial" },
    ],
  },
  {
    heading: "Obras de Arte",
    entries: [
      { name: "Abdias Nascimento — Oxum em êxtase" },
      { name: "Abdias Nascimento — Okê Oxóssi" },
      {
        name: "Abdias Nascimento — Invocação noturna ao poeta Gerardo Mello Mourão: Oxóssi",
      },
      { name: "Abdias Nascimento — Xangô Rodrigues Alves" },
      { name: "Edgard de Souza — Sem título (Dor de cabeça)" },
      { name: "Claudia Andujar — Sem título (Yanomami)" },
      { name: "Chico Buarque — Ópera do malandro" },
      {
        name: "Márcio Souza — Zona Franca, meu amor; ou Tem piranha no pirarucu",
      },
      { name: "Márcio Souza — A paixão de Ajuricaba" },
      { name: "Richard Wagner — O anel do nibelungo" },
    ],
  },
  {
    heading: "Espaços Culturais",
    entries: [
      { name: "Inhotim", url: "https://www.inhotim.org.br/" },
      {
        name: "Teatro Amazonas",
        url: "https://cultura.am.gov.br/espacos-culturais/teatros/teatro-amazonas/",
      },
      {
        name: "São João de Campina Grande",
        url: "https://campinagrande.pb.gov.br/",
      },
    ],
  },
  {
    heading: "Músicas",
    entries: [
      {
        name: "Agent M por Jumbo",
        url: "https://www.facebook.com/sound/collection/?sound_collection_tab=sound_tracks&asset_id=132224994119105&reference=artist_attr",
      },
      {
        name: "Suco de Abacaxi por Guifrog",
        url: "https://freemusicarchive.org/music/Guifrog/Suco_de_Abacaxi/Guifrog_-_Suco_de_Abacaxi/",
        license: "Attribution 3.0 International License",
      },
      {
        name: "Loop Suco de Abacaxi editado com Audjust",
        url: "https://www.audjust.com/",
      },
      {
        name: "Chee Zee Jungle por Kevin MacLeod (incompetech.com)",
        url: "https://incompetech.com/music/royalty-free/music.html",
        license: "Creative Commons: By Attribution 4.0 License",
      },
      {
        name: "Cricket Ambience, Remix, A por Moulaythami",
        url: "https://freesound.org/people/Moulaythami/sounds/536930/",
        license: "Attribution 4.0",
      },
    ],
  },
  {
    heading: "Efeitos Sonoros",
    entries: [
      {
        name: "High pitched rat squeaks por ElevenLabs",
        url: "https://elevenlabs.io/sound-effects/rat",
      },
      {
        name: "hmmm.wav por agent vivid",
        url: "https://freesound.org/s/22090/",
        license: "Sampling+",
      },
      {
        name: "Heavy stone door opens 2 por PostProdDog",
        url: "https://freesound.org/s/578491/",
        license: "Creative Commons 0",
      },
      {
        name: "Loop de arrasto criado com TunePocket Loop Maker",
        url: "https://tunepocket.com/audio-loop-maker/",
      },
      {
        name: "Heavy Book por IENBA",
        url: "https://freesound.org/s/648959/",
        license: "Creative Commons 0",
      },
      {
        name: "Heavy object drop por mokasza",
        url: "https://freesound.org/s/810170/",
        license: "Attribution 4.0",
      },
      {
        name: "Pulo por Leohpaz",
        url: "https://leohpaz.itch.io/90-retro-player-movement-sfx",
      },
      {
        name: "iPhone câmera click.wav por Nathan_Lomeli",
        url: "https://freesound.org/s/79190/",
        license: "Sampling+",
      },
      { name: "Whoosh por Editors Keys", url: "https://www.editorskeys.com/" },
      {
        name: "Interface Sounds por Kenney",
        url: "https://kenney.nl/assets/interface-sounds",
        license: "Creative Commons 0",
      },
      {
        name: "UI Audio por Kenney",
        url: "https://kenney.nl/assets/ui-audio",
        license: "Creative Commons 0",
      },
    ],
  },
  {
    heading: "Ícones",
    entries: [
      {
        name: "Rat icons por G-CAT do Flaticon",
        url: "https://www.flaticon.com/free-icon/rat_12634989",
      },
      {
        name: "Rat Sprites por Carysaurus",
        url: "https://carysaurus.itch.io/rat-sprites",
      },
      {
        name: "arrow keys por b farias do Noun Project",
        url: "https://thenounproject.com/icon/arrow-keys-1100214/",
        license: "CC BY 3.0",
      },
      {
        name: "Keyhole por Mani Amini do Noun Project",
        url: "https://thenounproject.com/icon/keyhole-41032/",
        license: "CC BY 3.0",
      },
      {
        name: "Máscaras por HiClipart",
        url: "https://www.hiclipart.com/free-transparent-background-png-clipart-ouqbg",
      },
      {
        name: "Fogueira por CityPNG",
        url: "https://www.citypng.com/photo/15015/hd-black-bonfire-campfire-firewood-icon-png",
      },
      {
        name: "Color Switches por Jan Schneider",
        url: "https://jan-schneider.itch.io/color-switches",
        license: "CC BY 4.0",
      },
    ],
  },
  {
    heading: "Agradecimentos",
    entries: [
      { name: "Carretel Mídia", url: "https://carretelmidia.com/" },
      {
        name: "Caio César Teixeira Loures",
        url: "https://scholar.google.com/citations?user=2NUpyvYAAAAJ&hl=pt-BR",
      },
      {
        name: "Letícia de Souza Barbosa",
        url: "https://www.riolicenciamento.com.br/",
      },
      { name: "Ipeafro", url: "https://ipeafro.org.br/" },
      { name: "Galeria Vermelho", url: "https://galeriavermelho.com.br/" },
    ],
  },
  {
    heading: "",
    entries: [{ name: "Não, o rato não vai falar." }],
  },
];
