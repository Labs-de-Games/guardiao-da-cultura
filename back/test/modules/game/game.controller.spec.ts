import { Test } from "@nestjs/testing";
import type { Request } from "express";
import { GameController } from "../../../src/modules/game/game.controller";
import { GameService } from "../../../src/modules/game/game.service";
import type { User } from "../../../src/modules/users/user.entity";
import { GameEventType } from "../../../src/shared/events/game-events";

function makeRequest(cookies: Record<string, string> = {}): Request {
  return { cookies } as unknown as Request;
}

describe("GameController — playerId resolution precedence", () => {
  let controller: GameController;
  let mockGameService: { processEvent: jest.Mock };

  const PAYLOAD = {
    type: GameEventType.GAME_STARTED,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    mockGameService = { processEvent: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [GameController],
      providers: [{ provide: GameService, useValue: mockGameService }],
    }).compile();

    controller = moduleRef.get(GameController);
  });

  it("prefers the authenticated user id over the header and cookie", async () => {
    await controller.receiveEvent(
      PAYLOAD,
      { id: "user-1" } as User,
      "guest-header-id",
      makeRequest({ gp_distinct_id: "cookie-id" }),
    );
    expect(mockGameService.processEvent).toHaveBeenCalledWith(
      PAYLOAD,
      "user-1",
    );
  });

  it("prefers the x-guest-id header over the cookie when there is no user", async () => {
    await controller.receiveEvent(
      PAYLOAD,
      undefined,
      "guest-header-id",
      makeRequest({ gp_distinct_id: "cookie-id" }),
    );
    expect(mockGameService.processEvent).toHaveBeenCalledWith(
      PAYLOAD,
      "guest-header-id",
    );
  });

  it("falls back to the durable cookie when the header is absent (e.g. sendBeacon)", async () => {
    await controller.receiveEvent(
      PAYLOAD,
      undefined,
      undefined,
      makeRequest({ gp_distinct_id: "cookie-id" }),
    );
    expect(mockGameService.processEvent).toHaveBeenCalledWith(
      PAYLOAD,
      "cookie-id",
    );
  });

  it("mints a random id when nothing else is present", async () => {
    await controller.receiveEvent(PAYLOAD, undefined, undefined, makeRequest());
    const [, playerId] = mockGameService.processEvent.mock.calls[0];
    expect(playerId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("ignores a malformed cookie value and mints a random id", async () => {
    await controller.receiveEvent(
      PAYLOAD,
      undefined,
      undefined,
      makeRequest({ gp_distinct_id: "not valid!" }),
    );
    const [, playerId] = mockGameService.processEvent.mock.calls[0];
    expect(playerId).not.toBe("not valid!");
  });

  it("returns { success: true }", async () => {
    const result = await controller.receiveEvent(
      PAYLOAD,
      undefined,
      undefined,
      makeRequest(),
    );
    expect(result).toEqual({ success: true });
  });
});
