import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { CollectibleType } from "./user-collectible.entity";
import { UserCollectible } from "./user-collectible.entity";

export interface CollectibleRecordInput {
  userId: string;
  collectibleId: string;
  collectibleType: CollectibleType;
  levelId: string;
}

export interface CollectibleQueryFilters {
  levelId?: string;
  collectibleType?: CollectibleType;
}

@Injectable()
export class UserCollectibleService {
  constructor(
    @InjectRepository(UserCollectible)
    private readonly userCollectibleRepository: Repository<UserCollectible>,
  ) {}

  async recordCollectibles(
    collectibles: CollectibleRecordInput[],
  ): Promise<void> {
    if (!collectibles.length) return;

    const values = collectibles.map((collectible) =>
      this.userCollectibleRepository.create(collectible),
    );

    await this.userCollectibleRepository
      .createQueryBuilder()
      .insert()
      .into(UserCollectible)
      .values(values)
      .orIgnore()
      .execute();
  }

  async findByUser(
    userId: string,
    filters?: CollectibleQueryFilters,
  ): Promise<UserCollectible[]> {
    const query = this.userCollectibleRepository
      .createQueryBuilder("collectible")
      .where("collectible.userId = :userId", { userId });

    if (filters?.levelId) {
      query.andWhere("collectible.levelId = :levelId", {
        levelId: filters.levelId,
      });
    }

    if (filters?.collectibleType) {
      query.andWhere("collectible.collectibleType = :collectibleType", {
        collectibleType: filters.collectibleType,
      });
    }

    return query.orderBy("collectible.collectedAt", "DESC").getMany();
  }
}
