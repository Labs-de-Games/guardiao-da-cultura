import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, type Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    data: Pick<User, "username" | "email" | "password">,
  ): Promise<User> {
    const user = this.userRepository.create(data);

    try {
      return await this.userRepository.save(user);
    } catch (err) {
      // Postgres unique violation (e.g. duplicate email).
      if (err instanceof QueryFailedError) {
        const code = (err as unknown as { code?: string }).code;
        if (code === "23505") {
          throw new ConflictException("Email already registered");
        }
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
