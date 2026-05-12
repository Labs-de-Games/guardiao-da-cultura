import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserBadgeUniqueConstraint1778260203437
  implements MigrationInterface
{
  name = "AddUserBadgeUniqueConstraint1778260203437";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_badge" ADD CONSTRAINT "UQ_user_badge_userId_badgeId" UNIQUE ("userId", "badgeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_badge" DROP CONSTRAINT "UQ_user_badge_userId_badgeId"`,
    );
  }
}
