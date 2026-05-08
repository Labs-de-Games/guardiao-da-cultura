import type { Request } from "express";
import type { User } from "../../users/user.entity";

export interface RequestWithUser extends Request {
  user: User;
}
