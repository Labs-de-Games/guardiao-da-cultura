import { SetMetadata } from "@nestjs/common";

export const IS_GUEST_PLAY_KEY = "isGuestPlay";

export const GuestPlay = () => SetMetadata(IS_GUEST_PLAY_KEY, true);
