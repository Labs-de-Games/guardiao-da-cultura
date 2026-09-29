import * as Phaser from "phaser";
import { AudioManager } from "../audio";
import { GameEvents } from "../constants/GameEvents";
import { LayoutConfig } from "../constants/LayoutConfig";
import { InteractionComponent } from "../objects/InteractionComponent";
import { TiledUtils } from "../utils/TiledUtils";

export const SWITCH_LIGHT_ANIM_KEY = "switch_light_anim";

export interface SwitchLightInstance {
  sprite: Phaser.GameObjects.Sprite;
  instanceId: string;
  interaction: InteractionComponent;
  lightBarName?: string;
  isActivated: boolean;
}

export interface SwitchLightConfig {
  x: number;
  y: number;
  instanceId: string;
  lightBarName?: string;
  scale?: number;
}

export class SwitchLightSystem {
  private switches: SwitchLightInstance[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Registers all objects from a Tiled SwitchLight object layer.
  public registerAllFromLayer(
    layer: Phaser.Tilemaps.ObjectLayer,
    scale: number = LayoutConfig.GAME.MAP_SCALE,
  ): void {
    if (!layer?.objects) return;

    layer.objects.forEach((obj) => {
      const lightBarName = TiledUtils.getProperty(obj, "light_bar");
      const rawScale = TiledUtils.getProperty(obj, "scale");
      const scaled = TiledUtils.scaleCoords(obj, scale);

      this.registerSwitch({
        x: scaled.x,
        y: scaled.y,
        instanceId: obj.name || Phaser.Math.RND.uuid(),
        lightBarName: lightBarName as string | undefined,
        scale: rawScale !== undefined ? Number(rawScale) : undefined,
      });
    });
  }

  // Registers a single switch at the specified position.
  public registerSwitch(config: SwitchLightConfig): SwitchLightInstance {
    const sprite = this.scene.add.sprite(config.x, config.y, "switch_light", 0);
    sprite.setOrigin(0.5, 1);
    sprite.setScale(config.scale !== undefined ? config.scale : 1);
    sprite.setDepth(10);

    const instance = {
      sprite,
      instanceId: config.instanceId,
      lightBarName: config.lightBarName,
      isActivated: false,
    } as SwitchLightInstance;

    instance.interaction = new InteractionComponent(this.scene, sprite, {
      dialogueLines: [],
      playInteractSound: false,
      onInteract: () => this.activate(instance),
    });

    this.switches.push(instance);
    return instance;
  }

  private activate(instance: SwitchLightInstance): void {
    if (instance.isActivated) return;
    instance.isActivated = true;
    instance.interaction.destroy();
    AudioManager.playSfx("sfx.switch");

    const notify = () => {
      if (!instance.lightBarName) return;
      this.scene.events.emit(GameEvents.SWITCH_LIGHT_ACTIVATED, {
        lightBarName: instance.lightBarName,
      });
    };

    // An animation without frames (texture missing when it was registered)
    // would throw on play and block progression, so skip straight to notify.
    const anim = this.scene.anims.get(SWITCH_LIGHT_ANIM_KEY);
    if (!anim || anim.frames.length === 0) {
      notify();
      return;
    }

    instance.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, notify);
    instance.sprite.play(SWITCH_LIGHT_ANIM_KEY);
  }

  public setPlayerTracking(player: Phaser.Physics.Arcade.Sprite): void {
    this.switches.forEach(({ interaction }) => {
      interaction.setPlayerTracking(player);
    });
  }

  public update(): void {
    this.switches.forEach(({ interaction }) => {
      interaction.update();
    });
  }

  // Gets all registered switches.
  public getAll(): SwitchLightInstance[] {
    return this.switches;
  }

  public getProgress(): { filled: number; total: number } {
    return {
      filled: this.switches.filter((s) => s.isActivated).length,
      total: this.switches.length,
    };
  }

  public allActivated(): boolean {
    return (
      this.switches.length > 0 && this.switches.every((s) => s.isActivated)
    );
  }

  // Destroys all switches and cleans up.
  public destroy(): void {
    this.switches.forEach(({ sprite, interaction }) => {
      interaction.destroy();
      sprite.destroy();
    });
    this.switches = [];
  }
}
