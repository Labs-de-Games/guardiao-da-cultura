import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { User } from "./user.entity";
import { UserService } from "./user.service";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  async register(
    @Body() body: Pick<User, "username" | "email" | "password">,
  ): Promise<User> {
    return this.userService.create(body);
  }

  @Post("login")
  async login(
    @Body() body: { email: string; password: string },
  ): Promise<{ user: User | null }> {
    const user = await this.userService.findByEmail(body.email);
    // TODO: Implement password hashing comparison
    return { user };
  }

  @Get(":id")
  async findById(@Param("id") id: string): Promise<User | null> {
    return this.userService.findById(id);
  }
}
