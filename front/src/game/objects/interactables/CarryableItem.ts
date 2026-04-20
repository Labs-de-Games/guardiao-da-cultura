import type * as Phaser from "phaser";
import { InteractableItem } from "./InteractableItem";

export class CarryableItem extends InteractableItem {
	public isCarried: boolean = false

	public setCarried(isCarried: boolean) {
		this.isCarried = isCarried;
		if (this.isCarried) {
			this.setTint(0xaaaaaa);
		} else {
			this.clearTint();
			// this.scene.events.emit("item-dropped", this);
		}
	}
	protected onPointerDown(_pointer: Phaser.Input.Pointer) {
	// Basic pointer down interactions if any, keyboard handles movement
	}

	// snapBack is no longer needed as items should stay where they are dropped.
	public snapBack() {
	console.log(
		`[CarryableItem] snapBack called for ${this.itemName}, but free-drop is enabled.`,
		);
	}
}
