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

  async registerInterest(email: string): Promise<UserInterested> {
    const existingRecord = await this.userInterestedRepository.findOne({
      where: { email },
    });

    if (existingRecord) {
      return this.userInterestedRepository.save(existingRecord);
    }

    return this.userInterestedRepository.save({ email });
  }
}
