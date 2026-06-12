import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { PostHogService } from "../../posthog/posthog.service";
import { IS_GUEST_PLAY_KEY } from "../decorators/guest-play.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private readonly reflector: Reflector,
    private readonly posthogService: PostHogService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isGuestPlay = this.reflector.getAllAndOverride<boolean>(
      IS_GUEST_PLAY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isGuestPlay) {
      try {
        return await (super.canActivate(context) as Promise<boolean>);
      } catch (error) {
        const guestPlayEnabled = await this.posthogService.isGuestPlayEnabled();
        if (guestPlayEnabled) {
          return true;
        }
        throw error;
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
