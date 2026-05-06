import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Role } from "../../users/enums/role.enum";
import { ListUsersQueryDto } from "../dto/list-users-query.dto";
import { ToggleUserStatusDto } from "../dto/toggle-user-status.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { AdminService } from "../services/admin.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get("users/:id")
  async getUserById(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch("users/:id/role")
  async updateUserRole(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Patch("users/:id/status")
  async toggleUserStatus(
    @Param("id") id: string,
    @Body() dto: ToggleUserStatusDto,
  ) {
    return this.adminService.toggleUserStatus(id, dto.isActive);
  }
}
