import type { Role } from "../../users/enums/role.enum";
import type { JwtTokenType } from "../enums/jwt-token-type.enum";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  type: JwtTokenType;
  jti: string;
  iss: string;
  iat: number;
  exp: number;
}
