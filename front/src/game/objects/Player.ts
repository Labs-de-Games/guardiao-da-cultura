import * as Phaser from "phaser";
import type { IPlayerState } from "../types/EntityTypes";
import { InteractableType } from "../types/InteractableTypes";
import type { CarryableItem } from "./interactables/CarryableItem";
import type { DraggableItem } from "./interactables/DraggableItem";
import {
  PLAYER_ANIMS,
  PLAYER_ASSETS,
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
  private grabOffsetY: number = 0;

  // Tile layers that have collision enabled (walls/floor/etc).
  private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];

  private setPhysicsBodyForVisualScale(scale: number) {
    const isDragging = scale === PLAYER_PHYSICS.DRAGGING_SCALE;
    const isJumping = this.anims.currentAnim?.key === PLAYER_ANIMS.JUMP.key;

    let hitbox: { readonly WIDTH: number; readonly HEIGHT: number } =
      PLAYER_PHYSICS.HITBOX;
    let hitboxOffset: { readonly X: number; readonly Y: number } =
      PLAYER_PHYSICS.HITBOX_OFFSET;

    if (isDragging) {
      hitbox = PLAYER_PHYSICS.DRAGGING_HITBOX;
      hitboxOffset = PLAYER_PHYSICS.DRAGGING_HITBOX_OFFSET;
    } else if (isJumping) {
      hitbox = PLAYER_PHYSICS.JUMP_HITBOX;
      hitboxOffset = PLAYER_PHYSICS.JUMP_HITBOX_OFFSET;
    }

    const worldW = hitbox.WIDTH * PLAYER_PHYSICS.SCALE;
    const worldH = hitbox.HEIGHT * PLAYER_PHYSICS.SCALE;
    const worldOffX = hitboxOffset.X * PLAYER_PHYSICS.SCALE;
    const worldOffY = hitboxOffset.Y * PLAYER_PHYSICS.SCALE;

    this.setSize(worldW / scale, worldH / scale);
    this.setOffset(worldOffX / scale, worldOffY / scale);
  }

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
    scene.load.spritesheet(
      PLAYER_ASSETS.DRAGGING_SPRITESHEET.key,
      PLAYER_ASSETS.DRAGGING_SPRITESHEET.path,
      {
        frameWidth: PLAYER_ASSETS.DRAGGING_SPRITESHEET.frameWidth,
        frameHeight: PLAYER_ASSETS.DRAGGING_SPRITESHEET.frameHeight,
      },
    );
    scene.load.spritesheet(
      PLAYER_ASSETS.CARRYING_SPRITESHEET.key,
      PLAYER_ASSETS.CARRYING_SPRITESHEET.path,
      {
        frameWidth: PLAYER_ASSETS.CARRYING_SPRITESHEET.frameWidth,
        frameHeight: PLAYER_ASSETS.CARRYING_SPRITESHEET.frameHeight,
      },
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
      key: PLAYER_ANIMS.CARRY_IDLE.key,
      frames: scene.anims.generateFrameNumbers(
        PLAYER_ANIMS.CARRY_IDLE.spritesheet,
        {
          frames: [...PLAYER_ANIMS.CARRY_IDLE.frames],
        },
      ),
      frameRate: PLAYER_ANIMS.CARRY_IDLE.frameRate,
      repeat: PLAYER_ANIMS.CARRY_IDLE.repeat,
    });
    scene.anims.create({
      key: PLAYER_ANIMS.CARRY_WALK.key,
      frames: scene.anims.generateFrameNumbers(
        PLAYER_ANIMS.CARRY_WALK.spritesheet,
        {
          frames: [...PLAYER_ANIMS.CARRY_WALK.frames],
        },
      ),
      frameRate: PLAYER_ANIMS.CARRY_WALK.frameRate,
      repeat: PLAYER_ANIMS.CARRY_WALK.repeat,
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

  setCollisionLayers(layers: Phaser.Tilemaps.TilemapLayer[]) {
    this.collisionLayers = layers;
  }

  private wouldGrabbedPedestalHitWall(
    dirX: -1 | 1,
    dtMs: number,
    accel: number,
  ): boolean {
    if (
      !this.isGrabbing ||
      !this.grabbedItem ||
      this.collisionLayers.length === 0
    ) {
      return false;
    }

    const playerBody = this.body as Phaser.Physics.Arcade.Body;
    const itemBody = this.grabbedItem.body as
      | Phaser.Physics.Arcade.Body
      | undefined;
    if (!playerBody || !itemBody) return false;

    // Predict a conservative next X for the pedestal based on next velocity.
    // Note: this codebase applies per-frame velocity changes directly.
    const nextVelX = playerBody.velocity.x + dirX * accel;
    const dx = (nextVelX * dtMs) / 1000;

    const pedCenterX = this.x + this.grabOffset + dx;
    const pedBottomY = this.y + this.grabOffsetY;
    const pedHalfW = itemBody.width / 2;
    const pedH = itemBody.height;

    // Sample a few vertical points along the pedestal footprint.
    const ySamples = [
      pedBottomY - 2,
      pedBottomY - pedH / 2,
      pedBottomY - pedH + 2,
    ];

    // Check the tile at the leading edge.
    const edgeX =
      (dirX > 0 ? pedCenterX + pedHalfW : pedCenterX - pedHalfW) + dirX * 2;

    for (const layer of this.collisionLayers) {
      for (const y of ySamples) {
        const tile = layer.getTileAtWorldXY(edgeX, y, true);
        if (!tile || tile.index === -1) continue;

        // Respect one-way/platform layers: only block if the relevant side is collidable.
        if (dirX > 0) {
          if (tile.collideLeft) return true;
        } else {
          if (tile.collideRight) return true;
        }
      }
    }

    return false;
  }

  // Player update logic (runs once per frame)
  update(_ts: number, dt: number) {
    if (this.isDead || this.isInDialogue) return;

    if (this.isHit) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
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
    if (spacePress && body?.blocked.down) {
      if (!this.isGrabbing) {
        // Priority 1: try to grab a nearby draggable sculpture
        const grabbed = this.tryGrab();
        if (!grabbed) {
          // Priority 2: toggle carry for paintings, or open placeholder UI
          const handled = this.tryToggleCarry();
          if (!handled && !this.isCarrying) {
            this.emit("interact-placeholder");
          }
        }
      }
    } else if (!spaceDown && this.isGrabbing) {
      this.releaseGrab();
    }

    if (body) {
      const accel = this.getMovementAcceleration();

      if (leftDown) {
        if (this.wouldGrabbedPedestalHitWall(-1, dt, accel)) {
          body.setVelocityX(0);
        } else {
          if (!this.isMovementRestricted(isJumpPlaying, isOnStairs)) {
            const walkAnim = this.isCarrying
              ? PLAYER_ANIMS.CARRY_WALK.key
              : PLAYER_ANIMS.WALK.key;
            const changed = this.anims.currentAnim?.key !== walkAnim;
            this.anims.play(walkAnim, true);
            if (changed) this.setPhysicsBodyForVisualScale(this.scaleX);
          }
          body.velocity.x -= accel;
          if (!this.isGrabbing) this.setFlipX(true);
        }
      } else if (rightDown) {
        if (this.wouldGrabbedPedestalHitWall(1, dt, accel)) {
          body.setVelocityX(0);
        } else {
          if (!this.isMovementRestricted(isJumpPlaying, isOnStairs)) {
            const walkAnim = this.isCarrying
              ? PLAYER_ANIMS.CARRY_WALK.key
              : PLAYER_ANIMS.WALK.key;
            const changed = this.anims.currentAnim?.key !== walkAnim;
            this.anims.play(walkAnim, true);
            if (changed) this.setPhysicsBodyForVisualScale(this.scaleX);
          }
          body.velocity.x += accel;
          if (!this.isGrabbing) this.setFlipX(false);
        }
      } else if (!this.isMovementRestricted(isJumpPlaying, isOnStairs)) {
        const idleAnim = this.isCarrying
          ? PLAYER_ANIMS.CARRY_IDLE.key
          : PLAYER_ANIMS.IDLE.key;
        const changed = this.anims.currentAnim?.key !== idleAnim;
        this.anims.play(idleAnim, true);
        if (changed) this.setPhysicsBodyForVisualScale(this.scaleX);
      }
    }

    if (this.isGrabbing && this.grabbedItem) {
      this.grabbedItem.x = this.x + this.grabOffset;
      this.grabbedItem.y = this.y + this.grabOffsetY;
      const itemBody = this.grabbedItem.body as
        | Phaser.Physics.Arcade.Body
        | undefined;
      itemBody?.updateFromGameObject();
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
      !isOnStairs
    ) {
      this.setVelocityY(PLAYER_MOVEMENT.JUMP_VELOCITY_Y);
      if (!this.isCarrying) {
        this.anims.play(PLAYER_ANIMS.JUMP.key, true);
        this.setPhysicsBodyForVisualScale(this.scaleX);
      }
    }

    if (isOnStairs && !this.isGrabbing) {
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
      // Offset so the base of the item rests near the player's hands (above their head)
      const offsetY =
        this.displayHeight / 2 + this.carriedItem.displayHeight / 2 - 10;
      this.carriedItem.x = this.x;
      this.carriedItem.y = this.y - offsetY;
      this.carriedItem.setDepth(this.depth + 1);
    }
  }

  private tryGrab(): boolean {
    if (this.isCarrying) return false;
    const GRAB_DIST = PLAYER_MOVEMENT.GRAB_DISTANCE;
    let closestItem: DraggableItem | null = null;
    let minDist: number = GRAB_DIST;

    for (const item of this.draggableRegistry) {
      if (!item.input?.enabled) continue;

      const itemBody = item.body as Phaser.Physics.Arcade.Body | undefined;
      const itemX = itemBody?.center?.x ?? item.x;
      const itemY = itemBody?.center?.y ?? item.y;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, itemX, itemY);
      if (dist < minDist) {
        minDist = dist;
        closestItem = item;
      }
    }

    if (!closestItem) return false;

    this.isGrabbing = true;
    this.grabbedItem = closestItem;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const prevBodyX = body?.x;
    const prevBodyY = body?.y;
    this.grabbedItem.setDepth(11);

    // Switch player to the dragging pose (visual), but keep the physics
    // body stable to avoid collision ejection.
    this.setScale(PLAYER_PHYSICS.DRAGGING_SCALE);
    this.setPhysicsBodyForVisualScale(PLAYER_PHYSICS.DRAGGING_SCALE);

    // Swap to the dragging spritesheet immediately so we can compensate any
    // body shift caused by the new (bigger) animation frame size.
    this.anims.play(PLAYER_ANIMS.GRAB_IDLE.key, true);

    // Keep the Arcade body world position stable across scale/animation changes.
    if (
      body &&
      typeof prevBodyX === "number" &&
      typeof prevBodyY === "number"
    ) {
      body.updateFromGameObject();
      this.x += prevBodyX - body.x;
      this.y += prevBodyY - body.y;
      body.updateFromGameObject();
    }

    // Preserve the sculpture position and keep a rigid constraint.
    this.grabOffset = closestItem.x - this.x;
    this.grabOffsetY = closestItem.y - this.y;
    this.grabbedItem.setGrabbed(true);

    this.emit("item-interacted", closestItem);
    return true;
  }

  private tryToggleCarry(): boolean {
    if (this.isCarrying && this.carriedItem) {
      this.carriedItem.setCarried(false);
      this.scene.events.emit("item-dropped", this.carriedItem);
      this.carriedItem = null;
      this.isCarrying = false;
      this.anims.play(PLAYER_ANIMS.IDLE.key, true);
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

      this.anims.play(PLAYER_ANIMS.CARRY_IDLE.key, true);
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
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Zero player velocity BEFORE releasing the sculpture so the physics
    // engine doesn't slide the player into the sculpture on the same frame,
    // which would trigger Arcade separation and push it sideways.
    if (body) {
      body.setVelocity(0, 0);
    }

    if (this.grabbedItem) {
      this.grabbedItem.setGrabbed(false);
      this.grabbedItem.setDepth(10);
    }
    this.isGrabbing = false;
    this.grabbedItem = null;

    this.setScale(PLAYER_PHYSICS.SCALE);
    this.setPhysicsBodyForVisualScale(PLAYER_PHYSICS.SCALE);

    // Swap back to the walking spritesheet immediately for the same reason as above.
    this.anims.play(PLAYER_ANIMS.IDLE.key, true);
  }

  private getMovementAcceleration(): number {
    if (this.isGrabbing) return PLAYER_MOVEMENT.PUSH_ACCELERATION;
    return PLAYER_MOVEMENT.WALK_ACCELERATION;
  }

  private isMovementRestricted(
    isJumpPlaying: boolean,
    isOnStairs: boolean,
  ): boolean {
    return this.isGrabbing || isJumpPlaying || isOnStairs;
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
};
