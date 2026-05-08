import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_VERIFIED_EMAIL_KEY } from "../decorators/verified-email.decorator";
import type { RequestWithUser } from "../interfaces/request-with-user.interface";

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireVerified = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_VERIFIED_EMAIL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireVerified) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user.isEmailVerified) {
      throw new ForbiddenException("Email verification required");
    }

    return true;
  }
}
