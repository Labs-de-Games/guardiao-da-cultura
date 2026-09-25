import { Injectable } from "@nestjs/common";
import type { HashOptions } from "argon2";
import * as argon2 from "argon2";

/**
 * argon2id hashing for institution password accounts (#747). Params sized
 * against the 512MB container memory cap (discovery §3.2/§3.3): 19 MiB
 * memory cost keeps a single hash well under the cap even with concurrent
 * requests, at OWASP's minimum recommended argon2id parameters (m=19456,
 * t=2, p=1) — a deliberately conservative choice over the argon2 default
 * (m=65536/64MB) which would risk memory pressure under load on this host.
 */
const ARGON2ID_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, ARGON2ID_OPTIONS);
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      // Malformed/foreign hash (e.g. never-set) — treat as no match, never throw.
      return false;
    }
  }
}
