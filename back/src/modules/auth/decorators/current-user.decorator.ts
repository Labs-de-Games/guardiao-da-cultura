import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestWithUser } from "../interfaces/request-with-user.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
