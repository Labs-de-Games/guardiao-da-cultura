import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Role } from "../../users/enums/role.enum";
import { User } from "../../users/user.entity";
import type { ListUsersQueryDto } from "../dto/list-users-query.dto";

export interface PaginatedUsersResult {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async listUsers(query: ListUsersQueryDto): Promise<PaginatedUsersResult> {
    const { page, limit, search, role, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder("user");

    if (search) {
      qb.where(
        "(user.email ILIKE :search OR user.nickname ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (role) {
      qb.andWhere("user.role = :role", { role });
    }

    if (isActive !== undefined) {
      qb.andWhere("user.isActive = :isActive", { isActive });
    }

    qb.orderBy("user.createdAt", "DESC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateUserRole(id: string, role: Role): Promise<User> {
    const user = await this.getUserById(id);
    user.role = role;
    return this.userRepository.save(user);
  }

  async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = isActive;
    return this.userRepository.save(user);
  }
}
