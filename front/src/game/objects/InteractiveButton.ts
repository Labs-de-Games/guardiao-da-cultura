import * as Phaser from "phaser";
import {
  InteractionComponent,
  type InteractionOptions,
} from "./InteractionComponent";

export class InteractiveButton extends Phaser.GameObjects.Container {
  interaction: InteractionComponent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options?: InteractionOptions,
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.interaction = new InteractionComponent(scene, this, options);

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      },
      this,
    );
  }

  setPlayerTracking(player: Phaser.Physics.Arcade.Sprite) {
    this.interaction.setPlayerTracking(player);
  }

  update(_ts: number, _dt: number) {
    this.interaction.update();
  }
}
