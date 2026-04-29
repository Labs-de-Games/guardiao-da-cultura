import * as Phaser from "phaser";
import type { IPlayerState } from "../types/EntityTypes";
import { InteractableType } from "../types/InteractableTypes";
import type { CarryableItem } from "./interactables/CarryableItem";
import type { DraggableItem } from "./interactables/DraggableItem";
import {
  PLAYER_ANIMS,
  PLAYER_ASSETS,
  PLAYER_DAMAGE,
  PLAYER_EVENTS,
  PLAYER_KEYS,
  PLAYER_MOVEMENT,
  PLAYER_PHYSICS,
} from "./PlayerConfig";

export class Player
  extends Phaser.Physics.Arcade.Sprite
  implements IPlayerState
{
  keys: PlayerKeys;
  isDead: boolean = false;
  isHit: boolean = false;
  isInDialogue: boolean = false;
  isInspecting: boolean = false;
  stairsLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  // Grab mechanics
  private draggableRegistry: DraggableItem[] = [];
  private carryableRegistry: CarryableItem[] = [];
  private inventory: CarryableItem[] = []; // Simple inventory for chunks/items
  private grabbedItem: DraggableItem | null = null;
  private carriedItem: CarryableItem | null = null;
  public isGrabbing: boolean = false;
  public isCarrying: boolean = false;
  private grabOffset: number = 0;

  // Preload player assets
  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(
      PLAYER_ASSETS.WALK_SPRITESHEET.key,
      PLAYER_ASSETS.WALK_SPRITESHEET.path,
      {
        frameWidth: PLAYER_ASSETS.WALK_SPRITESHEET.frameWidth,
        frameHeight: PLAYER_ASSETS.WALK_SPRITESHEET.frameHeight,
      },
    );
    scene.load.spritesheet(
      PLAYER_ASSETS.INSPECT_SPRITESHEET.key,
      PLAYER_ASSETS.INSPECT_SPRITESHEET.path,
      {
        frameWidth: PLAYER_ASSETS.INSPECT_SPRITESHEET.frameWidth,
        frameHeight: PLAYER_ASSETS.INSPECT_SPRITESHEET.frameHeight,
      },
    );
    scene.load.spritesheet(
      PLAYER_ASSETS.JUMP_SPRITESHEET.key,
      PLAYER_ASSETS.JUMP_SPRITESHEET.path,
      {
        frameWidth: PLAYER_ASSETS.JUMP_SPRITESHEET.frameWidth,
        frameHeight: PLAYER_ASSETS.JUMP_SPRITESHEET.frameHeight,
      },
    );
    scene.load.spritesheet(
      PLAYER_ASSETS.CLIMB_SPRITESHEET.key,
      PLAYER_ASSETS.CLIMB_SPRITESHEET.path,
      {
        frameWidth: PLAYER_ASSETS.CLIMB_SPRITESHEET.frameWidth,
        frameHeight: PLAYER_ASSETS.CLIMB_SPRITESHEET.frameHeight,
      },
    );
    scene.load.spritesheet(
      PLAYER_ASSETS.CLIMB_DOWN_SPRITESHEET.key,
      PLAYER_ASSETS.CLIMB_DOWN_SPRITESHEET.path,
      {
        frameWidth: PLAYER_ASSETS.CLIMB_DOWN_SPRITESHEET.frameWidth,
        frameHeight: PLAYER_ASSETS.CLIMB_DOWN_SPRITESHEET.frameHeight,
      },
    );
    scene.load.audio(
      PLAYER_ASSETS.SOUNDS.MAGNIFYING_UP.key,
      PLAYER_ASSETS.SOUNDS.MAGNIFYING_UP.path,
    );
    scene.load.audio(
      PLAYER_ASSETS.SOUNDS.MAGNIFYING_DOWN.key,
      PLAYER_ASSETS.SOUNDS.MAGNIFYING_DOWN.path,
    );
  }

  // Create player animations
  static createAnims(scene: Phaser.Scene) {
    scene.anims.create({
      key: PLAYER_ANIMS.IDLE.key,
      frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.IDLE.spritesheet, {
        frames: [...PLAYER_ANIMS.IDLE.frames],
      }),
      frameRate: PLAYER_ANIMS.IDLE.frameRate,
      repeat: PLAYER_ANIMS.IDLE.repeat,
    });
    scene.anims.create({
      key: PLAYER_ANIMS.WALK.key,
      frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.WALK.spritesheet, {
        frames: [...PLAYER_ANIMS.WALK.frames],
      }),
      frameRate: PLAYER_ANIMS.WALK.frameRate,
      repeat: PLAYER_ANIMS.WALK.repeat,
    });
    scene.anims.create({
      key: PLAYER_ANIMS.INSPECT.key,
      frames: scene.anims.generateFrameNumbers(
        PLAYER_ANIMS.INSPECT.spritesheet,
        { frames: [...PLAYER_ANIMS.INSPECT.frames] },
      ),
      frameRate: PLAYER_ANIMS.INSPECT.frameRate,
      repeat: PLAYER_ANIMS.INSPECT.repeat,
    });
    scene.anims.create({
      key: PLAYER_ANIMS.STOP_INSPECT.key,
      frames: scene.anims.generateFrameNumbers(
        PLAYER_ANIMS.STOP_INSPECT.spritesheet,
        { frames: [...PLAYER_ANIMS.STOP_INSPECT.frames] },
      ),
      frameRate: PLAYER_ANIMS.STOP_INSPECT.frameRate,
      repeat: PLAYER_ANIMS.STOP_INSPECT.repeat,
    });
    scene.anims.create({
      key: PLAYER_ANIMS.JUMP.key,
      frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.JUMP.spritesheet, {
        frames: [...PLAYER_ANIMS.JUMP.frames],
      }),
      frameRate: PLAYER_ANIMS.JUMP.frameRate,
      repeat: PLAYER_ANIMS.JUMP.repeat,
    });
    scene.anims.create({
      key: PLAYER_ANIMS.CLIMB.key,
      frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.CLIMB.spritesheet, {
        frames: [...PLAYER_ANIMS.CLIMB.frames],
      }),
      frameRate: PLAYER_ANIMS.CLIMB.frameRate,
      repeat: PLAYER_ANIMS.CLIMB.repeat,
    });
    scene.anims.create({
      key: PLAYER_ANIMS.CLIMB_DOWN.key,
      frames: scene.anims.generateFrameNumbers(
        PLAYER_ANIMS.CLIMB_DOWN.spritesheet,
        { frames: [...PLAYER_ANIMS.CLIMB_DOWN.frames] },
      ),
      frameRate: PLAYER_ANIMS.CLIMB_DOWN.frameRate,
      repeat: PLAYER_ANIMS.CLIMB_DOWN.repeat,
    });

    scene.anims.create({
      key: PLAYER_ANIMS.GRAB_IDLE.key,
      frames: scene.anims.generateFrameNumbers(
        PLAYER_ANIMS.GRAB_IDLE.spritesheet,
        { frames: [...PLAYER_ANIMS.GRAB_IDLE.frames] },
      ),
      frameRate: PLAYER_ANIMS.GRAB_IDLE.frameRate,
      repeat: PLAYER_ANIMS.GRAB_IDLE.repeat,
    });

    scene.anims.create({
      key: PLAYER_ANIMS.PUSH.key,
      frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.PUSH.spritesheet, {
        frames: [...PLAYER_ANIMS.PUSH.frames],
      }),
      frameRate: PLAYER_ANIMS.PUSH.frameRate,
      repeat: PLAYER_ANIMS.PUSH.repeat,
    });

    scene.anims.create({
      key: PLAYER_ANIMS.PULL.key,
      frames: scene.anims.generateFrameNumbers(PLAYER_ANIMS.PULL.spritesheet, {
        frames: [...PLAYER_ANIMS.PULL.frames],
      }),
      frameRate: PLAYER_ANIMS.PULL.frameRate,
      repeat: PLAYER_ANIMS.PULL.repeat,
    });
  }

  // Create player
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.keys = this.scene.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.UP],
      down: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.DOWN],
      left: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.LEFT],
      right: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.RIGHT],
      w: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.W],
      a: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.A],
      s: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.S],
      d: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.D],
      space: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.SPACE],
      E: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.E],
      shift: Phaser.Input.Keyboard.KeyCodes[PLAYER_KEYS.SHIFT],
    }) as PlayerKeys;

    this.setScale(PLAYER_PHYSICS.SCALE);
    this.setDamping(PLAYER_PHYSICS.DAMPING);
    this.setSize(PLAYER_PHYSICS.HITBOX.WIDTH, PLAYER_PHYSICS.HITBOX.HEIGHT);
    this.setOffset(
      PLAYER_PHYSICS.HITBOX_OFFSET.X,
      PLAYER_PHYSICS.HITBOX_OFFSET.Y,
    );
    this.setDrag(PLAYER_PHYSICS.DRAG.X, PLAYER_PHYSICS.DRAG.Y);
    this.setGravity(PLAYER_PHYSICS.GRAVITY.X, PLAYER_PHYSICS.GRAVITY.Y);
    this.setMaxVelocity(
      PLAYER_PHYSICS.MAX_VELOCITY.X,
      PLAYER_PHYSICS.MAX_VELOCITY.Y,
    );

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      },
      this,
    );
    this.play(PLAYER_ANIMS.INITIAL_ANIM);
  }

  setDraggableRegistry(items: DraggableItem[]) {
    this.draggableRegistry = items;
  }

  setCarryableRegistry(items: CarryableItem[]) {
    this.carryableRegistry = items;
  }

  // Player damage
  takeDamage(dirX: number) {
    if (this.isDead || this.isHit) return;

    this.isHit = true;
    this.setVelocityY(PLAYER_DAMAGE.KNOCKBACK_VELOCITY_Y);
    this.setVelocityX(dirX * PLAYER_DAMAGE.KNOCKBACK_VELOCITY_X);

    this.setTint(PLAYER_DAMAGE.HIT_TINT);

    this.scene.time.delayedCall(PLAYER_DAMAGE.HIT_STUN_DURATION_MS, () => {
      this.clearTint();
      this.isHit = false;
    });
  }

  // Player update logic (runs once per frame)
  update(_ts: number, _dt: number) {
    if (this.isDead || this.isInDialogue) return;

    if (this.isHit) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
      this.isInspecting = !this.isInspecting;
      this.scene.events.emit(
        PLAYER_EVENTS.INSPECT_MODE_TOGGLED,
        this.isInspecting,
      );
      if (this.isInspecting) {
        this.scene.sound.play(PLAYER_ASSETS.SOUNDS.MAGNIFYING_UP.key);
      } else {
        this.scene.sound.play(PLAYER_ASSETS.SOUNDS.MAGNIFYING_DOWN.key);
      }
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isStopInspectPlaying =
      this.anims.currentAnim?.key === PLAYER_ANIMS.STOP_INSPECT.key &&
      this.anims.isPlaying;
    const isJumpPlaying =
      this.anims.currentAnim?.key === PLAYER_ANIMS.JUMP.key &&
      this.anims.isPlaying;

    let isOnStairs = false;
    if (this.stairsLayer && body) {
      const tile = this.stairsLayer.getTileAtWorldXY(
        body.center.x,
        body.center.y,
        true,
      );
      isOnStairs = tile && tile.index !== -1;
    }

    const upDown = this.keys.up.isDown || this.keys.w.isDown;
    const downDown = this.keys.down.isDown || this.keys.s.isDown;
    const isClimbing = isOnStairs && (upDown || downDown) && !this.isGrabbing;

    if (isOnStairs && !this.isGrabbing) {
      body.setAllowGravity(false);
      if (upDown) {
        body.setVelocityY(-PLAYER_MOVEMENT.CLIMB_SPEED_Y);
      } else if (downDown) {
        body.setVelocityY(PLAYER_MOVEMENT.CLIMB_SPEED_Y);
      } else {
        body.setVelocityY(0);
      }
    } else {
      body.setAllowGravity(true);
    }

    const leftDown = this.keys.left.isDown || this.keys.a.isDown;
    const rightDown = this.keys.right.isDown || this.keys.d.isDown;
    const spaceDown = this.keys.space.isDown;
    const spacePress = Phaser.Input.Keyboard.JustDown(this.keys.space);
    if (spaceDown && !this.isGrabbing && body?.blocked.down) {
      this.tryGrab();
    } else if (!spaceDown && this.isGrabbing) {
      this.releaseGrab();
    }

    if (spacePress && body?.blocked.down) {
      const handled = this.tryToggleCarry();
      if (!handled && !this.isCarrying) {
        this.emit("interact-placeholder");
      }
    }

    if (body) {
      const accel = this.getMovementAcceleration();

      if (leftDown) {
        if (
          !this.isMovementRestricted(
            isStopInspectPlaying,
            isJumpPlaying,
            isOnStairs,
          )
        ) {
          this.anims.play(PLAYER_ANIMS.WALK.key, true);
        }
        body.velocity.x -= accel;
        if (!this.isGrabbing) this.setFlipX(true);
      } else if (rightDown) {
        if (
          !this.isMovementRestricted(
            isStopInspectPlaying,
            isJumpPlaying,
            isOnStairs,
          )
        ) {
          this.anims.play(PLAYER_ANIMS.WALK.key, true);
        }
        body.velocity.x += accel;
        if (!this.isGrabbing) this.setFlipX(false);
      } else if (
        !this.isMovementRestricted(
          isStopInspectPlaying,
          isJumpPlaying,
          isOnStairs,
        )
      ) {
        this.anims.play(PLAYER_ANIMS.IDLE.key, true);
      }
    }

    if (this.isGrabbing && this.grabbedItem) {
      this.grabbedItem.x = this.x + this.grabOffset;
      this.grabbedItem.y = this.y;
      const isMoving = Math.abs(body.velocity.x) > 10;

      if (isMoving) {
        const isPushing =
          (body.velocity.x > 0 && this.grabOffset > 0) ||
          (body.velocity.x < 0 && this.grabOffset < 0);
        if (isPushing) {
          this.anims.play(PLAYER_ANIMS.PUSH.key, true);
        } else {
          this.anims.play(PLAYER_ANIMS.PULL.key, true);
        }
      } else {
        this.anims.play(PLAYER_ANIMS.GRAB_IDLE.key, true);
      }
    }

    const jumpDown = this.keys.up.isDown || this.keys.w.isDown;

    if (
      this.body &&
      jumpDown &&
      this.body.blocked.down &&
      !this.isGrabbing &&
      !this.isInspecting &&
      !isStopInspectPlaying &&
      !isOnStairs
    ) {
      this.setVelocityY(PLAYER_MOVEMENT.JUMP_VELOCITY_Y);
      this.anims.play(PLAYER_ANIMS.JUMP.key, true);
    }

    if (isOnStairs) {
      if (isClimbing) {
        if (downDown) {
          this.anims.play(PLAYER_ANIMS.CLIMB_DOWN.key, true);
        } else {
          this.anims.play(PLAYER_ANIMS.CLIMB.key, true);
        }
      } else {
        if (this.anims.currentAnim?.key === PLAYER_ANIMS.CLIMB.key) {
          this.anims.pause();
        } else {
          this.anims.play(PLAYER_ANIMS.CLIMB.key);
          this.anims.pause();
        }
      }
    }

    if (this.isCarrying && this.carriedItem) {
      const offsetY = 60;
      this.carriedItem.x = this.x;
      this.carriedItem.y = this.y - offsetY;
      this.carriedItem.setDepth(this.depth + 1);
    }
  }

  private tryGrab() {
    if (this.isCarrying) return;
    const GRAB_DIST = PLAYER_MOVEMENT.GRAB_DISTANCE;
    let closestItem: DraggableItem | null = null;
    let minDist: number = GRAB_DIST;

    for (const item of this.draggableRegistry) {
      if (!item.input?.enabled) continue;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, item.x, item.y);
      if (dist < minDist) {
        const isFacingItem =
          (this.flipX && item.x < this.x) || (!this.flipX && item.x > this.x);
        if (isFacingItem) {
          minDist = dist;
          closestItem = item;
        }
      }
    }

    if (closestItem) {
      this.isGrabbing = true;
      this.grabbedItem = closestItem;
      this.grabOffset = closestItem.x - this.x;
      this.grabbedItem.setGrabbed(true);

      this.emit("item-interacted", closestItem);
    }
  }

  private tryToggleCarry(): boolean {
    if (this.isCarrying && this.carriedItem) {
      this.carriedItem.setCarried(false);
      this.scene.events.emit("item-dropped", this.carriedItem);
      this.carriedItem = null;
      this.isCarrying = false;
      return true;
    }

    if (this.isGrabbing) return false;

    const GRAB_DIST = PLAYER_MOVEMENT.GRAB_DISTANCE;
    let closestItem: CarryableItem | null = null;
    let minDist: number = GRAB_DIST;

    for (const item of this.carryableRegistry) {
      if (!item.input?.enabled || item.isCarried) continue;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, item.x, item.y);
      if (dist < minDist) {
        minDist = dist;
        closestItem = item;
      }
    }

    if (closestItem) {
      if (closestItem.interactableType === InteractableType.PICTURE_CHUNK) {
        this.inventory.push(closestItem);
        closestItem.setCarried(true);
        closestItem.setVisible(false);

        this.emit("item-interacted", closestItem);
        return true;
      }

      this.isCarrying = true;
      this.carriedItem = closestItem;
      this.carriedItem.setCarried(true);

      this.emit("item-interacted", closestItem);
      return true;
    }
    return false;
  }

  public getInventory(): CarryableItem[] {
    return this.inventory;
  }

  public removeFromInventory(itemId: string) {
    this.inventory = this.inventory.filter((item) => item.itemId !== itemId);
  }

  private releaseGrab() {
    if (this.grabbedItem) {
      this.grabbedItem.setGrabbed(false);
    }
    this.isGrabbing = false;
    this.grabbedItem = null;
  }

  private getMovementAcceleration(): number {
    if (this.isGrabbing) return PLAYER_MOVEMENT.PUSH_ACCELERATION;
    if (this.isInspecting) return PLAYER_MOVEMENT.INSPECT_ACCELERATION;
    return PLAYER_MOVEMENT.WALK_ACCELERATION;
  }

  private isMovementRestricted(
    isStopInspectPlaying: boolean,
    isJumpPlaying: boolean,
    isOnStairs: boolean,
  ): boolean {
    return (
      this.isGrabbing ||
      this.isInspecting ||
      isStopInspectPlaying ||
      isJumpPlaying ||
      isOnStairs
    );
  }
}

type PlayerKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  E: Phaser.Input.Keyboard.Key;
  shift: Phaser.Input.Keyboard.Key;
};
