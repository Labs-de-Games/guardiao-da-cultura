import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/user.entity";
import { AdminController } from "./controllers/admin.controller";
import { AdminService } from "./services/admin.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
