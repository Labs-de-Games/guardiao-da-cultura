import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConsentService } from "./consent.service";
import { UserConsent } from "./user-consent.entity";

/**
 * Consent records for identified accounts (issue #338). Exports the service
 * because the auth module writes a row during registration and reads one when
 * deciding whether a session may reach the dashboard.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserConsent])],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
