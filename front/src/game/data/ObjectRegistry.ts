import type { InteractionOptions } from "../objects/InteractionComponent";

/**
 * Interface para estender InteractionOptions com metadados de posicionamento sugerido
 * ou identificação no Tiled.
 */
export interface InteractiveObjectConfig extends InteractionOptions {
  id: string; // Chave para busca no registro
}

/**
 * Registro Central de Objetos Interativos do Museu.
 * Mapeia o 'name' do objeto no Tiled para suas configurações de interação.
 */
export const ObjectRegistry: Record<string, InteractiveObjectConfig> = {
  statue_relic: {
    id: "statue_relic",
    interactionDistance: 210,
    dialogText:
      'Uma estátua gélida e cinzenta. A placa gasta pelo tempo diz: "Esculpida no ano de 1832, representando a rigidez da alma humana".',
    infoKey: "statue_info",
    requireInspectionMode: true,
    enableHint: true,
    hintDelayMs: 145000,
    hintOffsetX: 20,
    hintOffsetY: 42,
  },
  painting_relic: {
    id: "painting_relic",
    interactionDistance: 130,
    dialogText:
      "A tela está coberta por uma névoa escura, mas você consegue ler a assinatura borrada: 'Vincent'. Ao lado, um pedaço de papel rasgado revela que a obra foi concluída em 1889, capturando uma noite estrelada antes que o mundo perdesse sua luz.",
    infoKey: "painting_info",
    requireInspectionMode: true,
    enableHint: true,
    hintDelayMs: 135000,
    hintOffsetX: 40,
    hintOffsetY: -140,
  },
  sarcophagus_relic: {
    id: "sarcophagus_relic",
    interactionDistance: 130,
    dialogText:
      "Um túmulo pesado de uma civilização apagada. Ao afastar a tampa pesada, você não encontra ouro, mas sim uma Múmia preservada. Uma prova de que a humanidade sempre tentou lutar contra o esquecimento.",
    infoKey: "sarcophagus_info",
    requireInspectionMode: true,
    enableHint: true,
    hintDelayMs: 140000,
    hintOffsetX: 0,
    hintOffsetY: -120,
  },
  fossil_relic: {
    id: "fossil_relic",
    interactionDistance: 130,
    dialogText:
      "A marca de uma criatura gigantesca encravada na pedra. A placa do museu, quase apagada, descreve a criatura como um monarca do período Jurássico. Uma era muito antes do homem existir.",
    infoKey: "fossil_info",
    requireInspectionMode: true,
    enableHint: true,
    hintDelayMs: 160000,
    hintOffsetX: 0,
    hintOffsetY: -100,
  },
  phase_complete_portal: {
    id: "phase_complete_portal",
    interactionDistance: 130,
    gapY: -60,
    gapX: 15,
    dialogueLines: [], // Sinaliza diálogo complexo (onInteract)
    enableHint: false,
    hintDelayMs: 15000,
    hintOffsetX: 0,
    hintOffsetY: -120,
  },
};
