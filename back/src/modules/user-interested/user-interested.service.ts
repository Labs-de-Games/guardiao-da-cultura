import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { UserInterested } from "./user-interested.entity";

@Injectable()
export class UserInterestedService {
  constructor(
    @InjectRepository(UserInterested)
    private readonly userInterestedRepository: Repository<UserInterested>,
  ) {}

  async registerInterest(
    email: string | null,
    isInterested: boolean,
  ): Promise<UserInterested> {
    const record = this.userInterestedRepository.create({
      email,
      is_interested: isInterested,
    });

    return this.userInterestedRepository.save(record);
  }
}
