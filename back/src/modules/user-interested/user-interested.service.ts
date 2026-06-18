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
    // For null emails (anonymous), always create new record
    if (!email) {
      return this.userInterestedRepository.save({
        email: null,
        is_interested: isInterested,
      });
    }

    // Check for existing record with this email
    const existingRecord = await this.userInterestedRepository.findOne({
      where: { email },
    });

    if (existingRecord) {
      // Update existing record (preserves created_at, updates updated_at)
      existingRecord.is_interested = isInterested;
      return this.userInterestedRepository.save(existingRecord);
    }

    // Create new record if email doesn't exist
    return this.userInterestedRepository.save({
      email,
      is_interested: isInterested,
    });
  }
}
