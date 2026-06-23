import { type MigrationInterface, type QueryRunner } from "typeorm";

export class DropIsInterestedColumn1780000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_interested_is_interested"`);
    await queryRunner.query(
      `ALTER TABLE "user_interested" DROP COLUMN "is_interested"`,
    );
  }

  public async down(): Promise<void> {}
}
