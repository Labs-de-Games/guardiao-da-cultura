import * as Phaser from "phaser";
import { AudioManager } from "../audio";
import { Actions } from "../constants/KeyBindings";
import { getKeys } from "../systems/InputManager";
import type { IPlayerState } from "../types/EntityTypes";
import { InteractiveType } from "../types/InteractiveTypes";
import type { CarryableItem } from "./interactives/CarryableItem";
import type { DraggableItem } from "./interactives/DraggableItem";
import {
  PLAYER_ANIMS,
  PLAYER_ASSETS,
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
  isTutorialActive: boolean = false;
  stairsLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  isClimbingStairs: boolean = false;

  private draggableRegistry: DraggableItem[] = [];
  private carryableRegistry: CarryableItem[] = [];
  private inventory: CarryableItem[] = [];
  private grabbedItem: DraggableItem | null = null;
  public carriedItem: CarryableItem | null = null;
  public isGrabbing: boolean = false;
  public isCarrying: boolean = false;
  private portalExitIdleAnim: string | null = null;
  private grabOffset: number = 0;
  private grabOffsetY: number = 0;
  private dragLoopSound: Phaser.Sound.BaseSound | null = null;
  private footstepSound: Phaser.Sound.BaseSound | null = null;
  private climbLoopSound: Phaser.Sound.BaseSound | null = null;

  // Coyote Time Variables
  private coyoteTime = 200;
  private lastOnGroundTime = 0;
  private hasJumped = false;

  /** Timestamp of the last frame on which any tracked key was held. */
  private lastInputTime: number = Date.now();

  private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];

  /** Reference to the moving platform the player is standing on. */
  private standingPlatform: Phaser.Physics.Arcade.Sprite | null = null;

  /** True while the body's max Y velocity is temporarily raised for a launch (e.g. trampoline). */
  private launchMaxVelocityBoosted = false;

  /**
   * True from the moment launch() is called until the player actually
   * leaves the ground. Suppresses the blocked.down -> hasJumped reset for
   * that span, since the collider callback that calls launch() runs earlier
   * in the same frame's physics step and blocked.down can still read true
   * from that same contact. Tracking by "still touching ground" rather than
   * velocity sign keeps this from misfiring while riding a platform upward,
   * where velocity.y is legitimately negative every frame.
   */
  private suppressGroundedJumpReset = false;

  /**
   * Play an animation and, if it wasn't already playing, resync the hitbox
   * to the new anim's frame size (spritesheets have different dimensions).
   */
  private playAnim(key: string) {
    const changed = this.anims.currentAnim?.key !== key;
    this.anims.play(key, true);
    if (changed) this.setPhysicsBodyForVisualScale(this.scaleX);
    return changed;
  }

  private setPhysicsBodyForVisualScale(scale: number) {
    const hitbox = PLAYER_PHYSICS.HITBOX;

    // Horizontally center and vertically foot-anchor the hitbox within
    // whichever frame is currently active (walk/idle/jump/dragging/carrying
    // frames are 64x44-ish while back/front frames are 48x37).
    const offsetX = (this.frame.width - hitbox.WIDTH) / 2;
    const footPadding =
      this.texture.key === PLAYER_ASSETS.CARRYING_JUMP_SPRITESHEET.key
        ? PLAYER_PHYSICS.CARRY_JUMP_FOOT_PADDING
        : this.texture.key === PLAYER_ASSETS.IDLE_SPRITESHEET.key
          ? PLAYER_PHYSICS.IDLE_FOOT_PADDING
          : 0;
    const offsetY =
      this.frame.height -
      hitbox.HEIGHT -
      footPadding -
      PLAYER_PHYSICS.GROUND_VISUAL_OFFSET -
      0.5;

    const worldW = hitbox.WIDTH * PLAYER_PHYSICS.SCALE;
    const worldH = hitbox.HEIGHT * PLAYER_PHYSICS.SCALE;
    const worldOffX = offsetX * PLAYER_PHYSICS.SCALE;
    const worldOffY = offsetY * PLAYER_PHYSICS.SCALE;

    this.setSize(worldW / scale, worldH / scale);
    this.setOffset(worldOffX / scale, worldOffY / scale);
  }

  static preload(scene: Phaser.Scene) {
    for (const asset of Object.values(PLAYER_ASSETS)) {
      if (!("path" in asset)) continue;
      scene.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
      });
    }
  }

  static createAnims(scene: Phaser.Scene) {
    for (const anim of Object.values(PLAYER_ANIMS)) {
      if (typeof anim === "string") continue;
      scene.anims.create({
        key: anim.key,
        frames: scene.anims.generateFrameNumbers(anim.spritesheet, {
          frames: [...anim.frames],
        }),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }
  }

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.keys = getKeys(this.scene, [
      Actions.MOVE_UP,
      Actions.MOVE_DOWN,
      Actions.MOVE_LEFT,
      Actions.MOVE_RIGHT,
      Actions.JUMP,
      Actions.INTERACT,
    ]) as PlayerKeys;

    this.setScale(PLAYER_PHYSICS.SCALE);
    this.setDamping(PLAYER_PHYSICS.DAMPING);
    this.setPhysicsBodyForVisualScale(PLAYER_PHYSICS.SCALE);
    this.setDrag(PLAYER_PHYSICS.DRAG.X, PLAYER_PHYSICS.DRAG.Y);
    this.setGravity(PLAYER_PHYSICS.GRAVITY.X, PLAYER_PHYSICS.GRAVITY.Y);
    this.setMaxVelocity(
      PLAYER_PHYSICS.MAX_VELOCITY.X,
      PLAYER_PHYSICS.MAX_VELOCITY.Y,
    );
    this.setCollideWorldBounds(true);

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        // Clean up sounds
        if (this.dragLoopSound) {
          this.dragLoopSound.destroy();
          this.dragLoopSound = null;
        }
        if (this.footstepSound) {
          this.footstepSound.destroy();
          this.footstepSound = null;
        }
        if (this.climbLoopSound) {
          this.climbLoopSound.destroy();
          this.climbLoopSound = null;
        }
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

  public setPortalExitIdleAnim(animKey: string) {
    this.portalExitIdleAnim = animKey;
  }

  private clearPortalExitIdleAnim() {
    this.portalExitIdleAnim = null;
  }

  public getNearbyCarryableItem(): CarryableItem | null {
    const GRAB_DIST = 150; // Matches carry toggle pickup range
    let closestItem: CarryableItem | null = null;
    let minDist: number = GRAB_DIST;

    const playerFootY = this.body
      ? this.body.bottom
      : this.y + this.displayHeight / 2;

    for (const item of this.carryableRegistry) {
      if (!item.input?.enabled || item.isCarried) continue;

      const dist = Phaser.Math.Distance.Between(
        this.x,
        playerFootY,
        item.x,
        item.y,
      );

      if (dist < minDist) {
        minDist = dist;
        closestItem = item;
      }
    }

    return closestItem;
  }

  public getNearbyDraggableItem(): DraggableItem | null {
    if (this.isCarrying) return null;
    const GRAB_DIST = PLAYER_MOVEMENT.GRAB_DISTANCE;
    let closestItem: DraggableItem | null = null;
    let minDist: number = GRAB_DIST;

    const playerFootY = this.body
      ? this.body.bottom
      : this.y + this.displayHeight / 2;
    for (const item of this.draggableRegistry) {
      if (!item.input?.enabled) continue;

      const dist = Phaser.Math.Distance.Between(
        this.x,
        playerFootY,
        item.x,
        item.y,
      );
      if (dist < minDist) {
        minDist = dist;
        closestItem = item;
      }
    }

    return closestItem;
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

  /**
   * Stamps the current time whenever the player is holding any tracked key.
   * Read by the nudge system to tell a genuinely idle player apart from one
   * who is playing without triggering a scripted interaction.
   *
   * Uses `isDown` rather than `JustDown` on purpose: `JustDown` mutates the
   * key's internal state and would swallow the presses consumed later in
   * `update()` for interact and jump.
   */
  private trackInputActivity(): void {
    const k = this.keys;
    const anyKeyDown =
      k.up.isDown ||
      k.down.isDown ||
      k.left.isDown ||
      k.right.isDown ||
      k.w.isDown ||
      k.a.isDown ||
      k.s.isDown ||
      k.d.isDown ||
      k.e.isDown ||
      k.space.isDown;

    if (anyKeyDown) {
      this.lastInputTime = Date.now();
    }
  }

  /** Timestamp of the most recent player input, for idle detection. */
  public getLastInputTime(): number {
    return this.lastInputTime;
  }

  update(_ts: number, dt: number) {
    if (this.isDead) return;

    if (this.isHit) return;

    this.trackInputActivity();

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Clear standing platform if player is no longer on ground
    if (!body?.blocked.down) {
      this.standingPlatform = null;
    }

    if (body.blocked.down) {
      if (this.suppressGroundedJumpReset) {
        // Still touching the surface that launched us this frame; hold off
        // on re-arming jump until we've actually left the ground.
      } else {
        this.lastOnGroundTime = _ts;
        this.hasJumped = false;
      }
    } else {
      this.suppressGroundedJumpReset = false;
    }

    // Once the boosted launch has decayed back under the normal jump/fall
    // speed, restore the regular max Y velocity so normal falls stay capped.
    if (
      this.launchMaxVelocityBoosted &&
      body.velocity.y > -PLAYER_PHYSICS.MAX_VELOCITY.Y
    ) {
      body.setMaxVelocity(
        PLAYER_PHYSICS.MAX_VELOCITY.X,
        PLAYER_PHYSICS.MAX_VELOCITY.Y,
      );
      this.launchMaxVelocityBoosted = false;
    }

    const isJumpPlaying =
      (this.anims.currentAnim?.key === PLAYER_ANIMS.JUMP.key ||
        this.anims.currentAnim?.key === PLAYER_ANIMS.CARRY_JUMP.key) &&
      this.anims.isPlaying;

    let isOnStairsCenter = false;
    let isOnStairsBottom = false;

    let hasStairAbove = false;
    let hasStairBelow = false;

    let tCenter: Phaser.Tilemaps.Tile | null = null;
    let tBottom: Phaser.Tilemaps.Tile | null = null;
    let tAbove: Phaser.Tilemaps.Tile | null = null;
    let tBelow: Phaser.Tilemaps.Tile | null = null;

    if (this.stairsLayers.length > 0 && body) {
      for (const layer of this.stairsLayers) {
        if (!layer || !layer.visible) continue;

        const tileHeight = layer.tilemap.tileHeight || 16;
        const tc = layer.getTileAtWorldXY(body.center.x, body.center.y, true);
        const tb = layer.getTileAtWorldXY(body.center.x, body.bottom - 4, true);
        const ta = layer.getTileAtWorldXY(
          body.center.x,
          body.center.y - tileHeight,
          true,
        );
        const tbel = layer.getTileAtWorldXY(
          body.center.x,
          body.bottom + tileHeight,
          true,
        );

        if (tc && tc.index !== -1) tCenter = tc;
        if (tb && tb.index !== -1) tBottom = tb;
        if (ta && ta.index !== -1) tAbove = ta;
        if (tbel && tbel.index !== -1) tBelow = tbel;
      }

      isOnStairsCenter = !!(tCenter && tCenter.index !== -1);
      isOnStairsBottom = !!(tBottom && tBottom.index !== -1);
      hasStairAbove = !!(tAbove && tAbove.index !== -1);
      hasStairBelow = !!(tBelow && tBelow.index !== -1);
    }

    const isOnStairs = isOnStairsCenter || isOnStairsBottom;

    if (this.isInDialogue) {
      // Stop movement sounds when in dialogue
      this.stopMovementSounds();
      this.applyMovementRestriction(isOnStairs);
      if (!this.isTutorialActive) return;
    }

    const upDown = this.keys.up.isDown || this.keys.w.isDown;
    const downDown = this.keys.down.isDown || this.keys.s.isDown;

    if (!isOnStairs) {
      // Stop climb loop sound when leaving stairs
      if (this.isClimbingStairs && this.climbLoopSound) {
        this.climbLoopSound.stop();
        this.climbLoopSound.destroy();
        this.climbLoopSound = null;
      }
      this.isClimbingStairs = false;
    } else {
      const isJumpAnimActive =
        this.anims.currentAnim?.key === PLAYER_ANIMS.JUMP.key;
      const wasInAir = !this.isClimbingStairs && body && !body.blocked.down;

      const canClimbUp = upDown && isOnStairsCenter && hasStairAbove;
      const canClimbDown = downDown && isOnStairs && hasStairBelow;
      const canAutoClimb = (isJumpAnimActive || wasInAir) && isOnStairsCenter;

      if (
        (canClimbUp || canClimbDown || canAutoClimb) &&
        !this.isGrabbing &&
        !this.isCarrying
      ) {
        if (!this.isClimbingStairs) {
          this.playAnim(PLAYER_ANIMS.CLIMB.key);
        }
        this.isClimbingStairs = true;
      }

      // Exit climbing state if player is touching the ground and not actively climbing
      if (body?.blocked.down && !upDown && !downDown) {
        this.isClimbingStairs = false;
      }
    }

    const isClimbing =
      isOnStairs &&
      this.isClimbingStairs &&
      (upDown || downDown) &&
      !this.isGrabbing &&
      !this.isCarrying;

    // Start/stop climb loop sound based on whether player is actively moving on stairs
    if (isClimbing) {
      if (!this.climbLoopSound) {
        const settings = AudioManager.getSettings();
        this.climbLoopSound = this.scene.sound.add("sfx.player.climb", {
          loop: true,
          volume: 0.3 * settings.sfxVolume,
          mute: settings.muted,
        });
        this.climbLoopSound.play();
      }
    } else {
      // Stop climb loop sound when not actively climbing
      if (this.climbLoopSound) {
        this.climbLoopSound.stop();
        this.climbLoopSound.destroy();
        this.climbLoopSound = null;
      }
    }

    if (isOnStairs && this.isClimbingStairs && !this.isGrabbing) {
      // Prevent climbing while carrying paintings
      if (this.isCarrying) {
        body.setAllowGravity(false);
        body.setVelocityY(0);
      } else {
        body.setAllowGravity(false);
        if (upDown && isOnStairsCenter) {
          body.setVelocityY(-PLAYER_MOVEMENT.CLIMB_SPEED_Y);
        } else if (downDown) {
          body.setVelocityY(PLAYER_MOVEMENT.CLIMB_SPEED_Y);
        } else {
          body.setVelocityY(0);
        }
      }
    } else {
      body.setAllowGravity(true);
    }

    const leftDown = this.keys.left.isDown || this.keys.a.isDown;
    const rightDown = this.keys.right.isDown || this.keys.d.isDown;

    if (this.portalExitIdleAnim && (leftDown || rightDown)) {
      this.clearPortalExitIdleAnim();
    }

    // Determines if the climbing animation should be paused on the current frame.
    // This keeps the player suspended on the stairs in a paused climbing stance.
    const shouldPlayClimbPause =
      isOnStairs &&
      this.isClimbingStairs &&
      !isClimbing &&
      !this.isGrabbing &&
      !this.isCarrying;

    const ePress = Phaser.Input.Keyboard.JustDown(this.keys.e);
    if (this.isInDialogue && !this.isTutorialActive) return;
    if (ePress) {
      if (this.isGrabbing) {
        this.releaseGrab();
      } else {
        const isGrounded = body?.blocked.down;

        // Priority 1: try to grab a nearby draggable sculpture (Grounded only)
        let handled = false;
        if (isGrounded) {
          handled = this.tryGrab();
        }

        if (!handled) {
          // Priority 2: toggle carry for paintings (Allows air interaction)
          handled = this.tryToggleCarry();

          if (!handled && !this.isCarrying && isGrounded) {
            // Priority 3: placeholder UI (Grounded only)
            this.emit("interact-placeholder");
          }
        }
      }
    }

    this.syncHeldItemPosition(body);

    if (this.isInDialogue) return;

    if (body) {
      const NOMINAL_DT = 1000 / 60;
      const dtClamped = Math.min(dt, 50);
      const dtScale = dtClamped / NOMINAL_DT;
      const accel = this.getMovementAcceleration() * dtScale;

      if (leftDown) {
        if (this.wouldGrabbedPedestalHitWall(-1, dt, accel)) {
          body.setVelocityX(0);
        } else {
          if (!this.isMovementRestricted(isJumpPlaying, isOnStairs)) {
            const walkAnim = this.isCarrying
              ? PLAYER_ANIMS.CARRY_WALK.key
              : PLAYER_ANIMS.WALK.key;
            this.playAnim(walkAnim);
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
            this.playAnim(walkAnim);
          }
          body.velocity.x += accel;
          if (!this.isGrabbing) this.setFlipX(false);
        }
      } else if (!this.isMovementRestricted(isJumpPlaying, isOnStairs)) {
        if (this.portalExitIdleAnim) {
          this.playAnim(this.portalExitIdleAnim);
          return;
        }

        const idleAnim = this.isCarrying
          ? PLAYER_ANIMS.CARRY_IDLE.key
          : PLAYER_ANIMS.IDLE.key;
        // playAnim only calls anims.play() on transition into the anim -
        // calling it every idle frame would restart the loop from frame 0
        // on every tick instead of letting it play continuously.
        this.playAnim(idleAnim);
      }
    }

    // Footstep sound - play while walking on ground
    const isWalkingOnGround =
      body?.blocked.down &&
      !this.isGrabbing &&
      !this.isClimbingStairs &&
      !isJumpPlaying &&
      (leftDown || rightDown) &&
      Math.abs(body.velocity.x) > 10;

    if (isWalkingOnGround && !this.isInDialogue) {
      if (!this.footstepSound) {
        const settings = AudioManager.getSettings();
        this.footstepSound = this.scene.sound.add("sfx.player.footstep", {
          loop: true,
          volume: 0.2 * settings.sfxVolume,
          mute: settings.muted,
        });
        this.footstepSound.play();
      }
    } else {
      if (this.footstepSound) {
        this.footstepSound.stop();
        this.footstepSound.destroy();
        this.footstepSound = null;
      }
    }

    if (this.isGrabbing && this.grabbedItem) {
      const isMoving = Math.abs(body.velocity.x) > 10;

      // The dragging sheet's moving frames are drawn facing left, opposite
      // of the walk sheet's right-facing default, so the flip direction is
      // inverted here.
      if (isMoving) {
        this.setFlipX(body.velocity.x > 0);
      }

      // Play drag loop sound only when moving
      if (isMoving) {
        if (!this.dragLoopSound) {
          const settings = AudioManager.getSettings();
          this.dragLoopSound = this.scene.sound.add("sfx.object.drag_loop", {
            loop: true,
            volume: settings.sfxVolume,
            mute: settings.muted,
          });
          this.dragLoopSound.play();
        }

        const isPushing =
          (body.velocity.x > 0 && this.grabOffset > 0) ||
          (body.velocity.x < 0 && this.grabOffset < 0);
        if (isPushing) {
          this.anims.play(PLAYER_ANIMS.PUSH.key, true);
        } else {
          this.anims.play(PLAYER_ANIMS.PULL.key, true);
        }
      } else {
        // Stop drag loop when not moving
        if (this.dragLoopSound) {
          AudioManager.playSfxVariation("sfx.object.drop", 2, 0.2);
          this.dragLoopSound.stop();
          this.dragLoopSound.destroy();
          this.dragLoopSound = null;
        }
        this.anims.play(PLAYER_ANIMS.GRAB_IDLE.key, true);
      }
    }

    const jumpDown = Phaser.Input.Keyboard.JustDown(this.keys.space);

    const canJump =
      !this.hasJumped &&
      (body.blocked.down || _ts - this.lastOnGroundTime < this.coyoteTime);

    if (
      this.body &&
      jumpDown &&
      canJump &&
      !this.isGrabbing &&
      !this.isClimbingStairs
    ) {
      // Apply jump velocity
      this.hasJumped = true;
      this.setVelocityY(PLAYER_MOVEMENT.JUMP_VELOCITY_Y);
      AudioManager.playSfx("sfx.player.jump", 0.4);

      // Add platform inertia: inherit horizontal velocity from moving platform
      if (this.standingPlatform) {
        const platform = this
          .standingPlatform as import("./MovingPlatform").MovingPlatform;
        if (typeof platform.getVelocity === "function") {
          const platformVel = platform.getVelocity();
          // Only inherit horizontal velocity to preserve jump height
          // Vertical inheritance would affect jump physics when platform moves up/down
          const INERTIA_FACTOR = 2.5;
          this.body.velocity.x += platformVel.x * INERTIA_FACTOR;
        }
      }

      const jumpAnim = this.isCarrying
        ? PLAYER_ANIMS.CARRY_JUMP.key
        : PLAYER_ANIMS.JUMP.key;
      this.playAnim(jumpAnim);
    }

    if (
      isOnStairs &&
      this.isClimbingStairs &&
      !this.isGrabbing &&
      !this.isCarrying
    ) {
      if (isClimbing) {
        const climbAnim = downDown
          ? PLAYER_ANIMS.CLIMB_DOWN.key
          : PLAYER_ANIMS.CLIMB.key;
        this.playAnim(climbAnim);
      } else if (shouldPlayClimbPause) {
        this.anims.pause();
      }
    }
  }

  private syncHeldItemPosition(body: Phaser.Physics.Arcade.Body) {
    if (this.isGrabbing && this.grabbedItem) {
      this.grabbedItem.x = this.x + this.grabOffset;
      this.grabbedItem.y = this.y + this.grabOffsetY;
      const itemBody = this.grabbedItem.body as
        | Phaser.Physics.Arcade.Body
        | undefined;
      itemBody?.updateFromGameObject();
    }

    if (this.isCarrying && this.carriedItem) {
      const carryFrameHeight =
        this.texture.key === PLAYER_ASSETS.CARRYING_JUMP_SPRITESHEET.key
          ? this.frame.height - PLAYER_PHYSICS.CARRY_JUMP_CANVAS_PADDING
          : this.frame.height;
      const offsetY = (carryFrameHeight * this.scaleY) / 2 - 10;
      this.carriedItem.x = this.x;
      this.carriedItem.y = this.y - offsetY;
      this.carriedItem.setDepth(this.depth + 2);
    }
  }

  private tryGrab(): boolean {
    const closestItem = this.getNearbyDraggableItem();

    if (!closestItem) return false;

    this.isGrabbing = true;
    this.grabbedItem = closestItem;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const prevBodyX = body?.x;
    const prevBodyY = body?.y;
    this.grabbedItem.setDepth(11);

    // Swap to the dragging spritesheet first so the hitbox recalculation
    // reads its (slightly shorter) frame dimensions.
    this.playAnim(PLAYER_ANIMS.GRAB_IDLE.key);

    // Keep the Arcade body world position stable across the frame-size change.
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
      const body = this.body as Phaser.Physics.Arcade.Body | null;
      const carriedType = this.carriedItem.interactiveType;
      const requiresGroundToDrop =
        carriedType === InteractiveType.POSTER ||
        carriedType === InteractiveType.PAINTING;

      if (requiresGroundToDrop && !body?.blocked.down) {
        return false;
      }

      this.carriedItem.setCarried(false);
      this.scene.events.emit("item-dropped", this.carriedItem);
      this.carriedItem = null;
      this.isCarrying = false;
      this.playAnim(PLAYER_ANIMS.IDLE.key);
      return true;
    }

    if (this.isGrabbing || !this.body?.blocked.down) return false;
    const closestItem = this.getNearbyCarryableItem();

    if (closestItem) {
      if (closestItem.interactiveType === InteractiveType.PHOTO_CHUNK) {
        this.inventory.push(closestItem);
        closestItem.setCarried(true);
        closestItem.setVisible(false);

        this.emit("item-interacted", closestItem);
        return true;
      }

      this.isCarrying = true;
      this.carriedItem = closestItem;
      this.carriedItem.setCarried(true);

      this.playAnim(PLAYER_ANIMS.CARRY_IDLE.key);
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

  /**
   * Set the platform the player is currently standing on.
   * Called from collision callbacks when player lands on a moving platform.
   */
  public setStandingPlatform(
    platform: Phaser.Physics.Arcade.Sprite | null,
  ): void {
    this.standingPlatform = platform;
  }

  /**
   * Launches the player upward with the given velocity (negative = up),
   * bypassing the normal jump-key/coyote-time gating. If the requested
   * velocity exceeds the regular max Y velocity (e.g. a strong trampoline),
   * temporarily raises the cap so the launch isn't clamped; it's restored
   * once the boost decays back under the normal jump/fall speed.
   */
  public launch(velocityY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const requiredMaxY = Math.max(
      PLAYER_PHYSICS.MAX_VELOCITY.Y,
      Math.abs(velocityY),
    );
    if (requiredMaxY > body.maxVelocity.y) {
      body.setMaxVelocity(body.maxVelocity.x, requiredMaxY);
      this.launchMaxVelocityBoosted = true;
    }

    this.hasJumped = true;
    this.suppressGroundedJumpReset = true;
    this.standingPlatform = null;
    this.setVelocityY(velocityY);
    AudioManager.playSfx("sfx.player.jump", 0.4);

    const jumpAnim = this.isCarrying
      ? PLAYER_ANIMS.CARRY_JUMP.key
      : PLAYER_ANIMS.JUMP.key;
    this.playAnim(jumpAnim);
  }

  private releaseGrab() {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Zero player velocity BEFORE releasing the sculpture so the physics
    // engine doesn't slide the player into the sculpture on the same frame,
    // which would trigger Arcade separation and push it sideways.
    if (body) {
      body.setVelocity(0, 0);
    }

    // Stop drag loop sound
    if (this.dragLoopSound) {
      this.dragLoopSound.stop();
      this.dragLoopSound.destroy();
      this.dragLoopSound = null;
    }

    if (this.grabbedItem) {
      this.grabbedItem.setGrabbed(false);
      this.grabbedItem.setDepth(10);
    }
    this.isGrabbing = false;
    this.grabbedItem = null;

    // Swap back to the walking spritesheet so the hitbox recalculation
    // reads its frame dimensions.
    this.playAnim(PLAYER_ANIMS.IDLE.key);
  }

  private getMovementAcceleration(): number {
    if (this.isGrabbing) return PLAYER_MOVEMENT.PUSH_ACCELERATION;
    return PLAYER_MOVEMENT.WALK_ACCELERATION;
  }

  private isMovementRestricted(
    isJumpPlaying: boolean,
    isOnStairs: boolean,
  ): boolean {
    return (
      this.isGrabbing || isJumpPlaying || (isOnStairs && this.isClimbingStairs)
    );
  }

  private applyMovementRestriction(isOnStairs: boolean) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.setAllowGravity(false);
    }

    if (
      this.anims.currentAnim?.key === PLAYER_ANIMS.BACK.key ||
      this.anims.currentAnim?.key === PLAYER_ANIMS.BACK_CARRYING.key ||
      this.anims.currentAnim?.key === PLAYER_ANIMS.FRONT.key ||
      this.anims.currentAnim?.key === PLAYER_ANIMS.FRONT_CARRYING.key ||
      this.anims.currentAnim?.key === PLAYER_ANIMS.IDLE_SOUTH.key
    ) {
      return;
    }

    if (this.isGrabbing) {
      this.anims.play(PLAYER_ANIMS.GRAB_IDLE.key, true);
      return;
    }

    if (isOnStairs && !this.isCarrying) {
      this.playAnim(PLAYER_ANIMS.CLIMB.key);
      this.anims.pause();
      return;
    }

    const idleAnim = this.isCarrying
      ? PLAYER_ANIMS.CARRY_IDLE.key
      : PLAYER_ANIMS.IDLE.key;
    this.anims.play(idleAnim, true);
  }

  /**
   * Stop all movement-related sounds.
   * Called when entering dialogue or other states that restrict movement.
   */
  private stopMovementSounds(): void {
    if (this.climbLoopSound) {
      this.climbLoopSound.stop();
      this.climbLoopSound.destroy();
      this.climbLoopSound = null;
    }
    if (this.footstepSound) {
      this.footstepSound.stop();
      this.footstepSound.destroy();
      this.footstepSound = null;
    }
    if (this.dragLoopSound) {
      this.dragLoopSound.stop();
      this.dragLoopSound.destroy();
      this.dragLoopSound = null;
    }
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
  e: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};
