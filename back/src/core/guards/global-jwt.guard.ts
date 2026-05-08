import { Provider } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";

export const GlobalJwtGuardProvider: Provider = {
  provide: APP_GUARD,
  useClass: JwtAuthGuard,
};
