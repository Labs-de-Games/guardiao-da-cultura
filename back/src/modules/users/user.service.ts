import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import type { Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UserService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { nickname } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    const saved = await this.userRepository.save(user);
    this.logger.info({ userId: saved.id }, "User created");
    return saved;
  }

  async save(user: User): Promise<User> {
    const saved = await this.userRepository.save(user);
    this.logger.info({ userId: saved.id }, "User updated");
    return saved;
  }
}
