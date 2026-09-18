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

  /**
   * `passwordHash` is `select: false` on the entity — excluded from
   * `findByEmail` above by design. This explicit `addSelect` is the only
   * path that should ever pull it into memory (#747 password login).
   */
  async findByEmailWithPasswordHash(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.email = :email", { email })
      .getOne();
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { passwordHash });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByInstitutionSlug(institutionSlug: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { institutionSlug } });
  }

  async setInstitutionOnboarding(
    userId: string,
    institutionName: string,
    institutionSlug: string,
  ): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { institutionName, institutionSlug },
    );
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

  async updateLastLoginAt(
    userId: string,
    lastLoginAt = new Date(),
  ): Promise<void> {
    await this.userRepository.update({ id: userId }, { lastLoginAt });
  }
}
