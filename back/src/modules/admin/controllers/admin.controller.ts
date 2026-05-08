import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Role } from "../../users/enums/role.enum";
import { ListUsersQueryDto } from "../dto/list-users-query.dto";
import { ToggleUserStatusDto } from "../dto/toggle-user-status.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { AdminService } from "../services/admin.service";

@ApiTags("Admin")
@ApiBearerAuth("access-token")
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Roles(Role.Admin)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  @ApiOperation({ summary: "List all users with pagination and filters" })
  @ApiOkResponse({ description: "List of users" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  @ApiForbiddenResponse({ description: "Requires admin role" })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User UUID", type: "string" })
  @ApiOkResponse({ description: "User found" })
  @ApiNotFoundResponse({ description: "User not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  @ApiForbiddenResponse({ description: "Requires admin role" })
  async getUserById(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch("users/:id/role")
  @ApiOperation({ summary: "Update user role" })
  @ApiParam({ name: "id", description: "User UUID", type: "string" })
  @ApiBody({ type: UpdateRoleDto })
  @ApiOkResponse({ description: "User role updated" })
  @ApiNotFoundResponse({ description: "User not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  @ApiForbiddenResponse({ description: "Requires admin role" })
  async updateUserRole(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Patch("users/:id/status")
  @ApiOperation({ summary: "Toggle user active status" })
  @ApiParam({ name: "id", description: "User UUID", type: "string" })
  @ApiBody({ type: ToggleUserStatusDto })
  @ApiOkResponse({ description: "User status updated" })
  @ApiNotFoundResponse({ description: "User not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  @ApiForbiddenResponse({ description: "Requires admin role" })
  async toggleUserStatus(
    @Param("id") id: string,
    @Body() dto: ToggleUserStatusDto,
  ) {
    return this.adminService.toggleUserStatus(id, dto.isActive);
  }
}
