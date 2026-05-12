import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBadgeStatFields1777927558354 implements MigrationInterface {
  name = "AddBadgeStatFields1777927558354";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "badge" ADD COLUMN IF NOT EXISTS "statRequired" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "badge" ADD COLUMN IF NOT EXISTS "condition" character varying NOT NULL DEFAULT '>='`,
    );
    await queryRunner.query(
      `ALTER TABLE "badge" ADD COLUMN IF NOT EXISTS "goalValue" integer NOT NULL DEFAULT 1`,
    );

    await queryRunner.query(
      `UPDATE "badge" SET "statRequired" = 'objects_inspected', "condition" = '>=', "goalValue" = 10 WHERE "name" = 'Explorador'`,
    );
    await queryRunner.query(
      `UPDATE "badge" SET "statRequired" = 'puzzles_solved_flawlessly', "condition" = '>=', "goalValue" = 1 WHERE "name" = 'Restaurador'`,
    );
    await queryRunner.query(
      `UPDATE "badge" SET "statRequired" = 'quiz_perfect_score', "condition" = '==', "goalValue" = 1 WHERE "name" = 'Curador'`,
    );
    await queryRunner.query(
      `UPDATE "badge" SET "statRequired" = 'secret_clues_collected', "condition" = '>=', "goalValue" = 1 WHERE "name" = 'Detetive'`,
    );
    await queryRunner.query(
      `UPDATE "badge" SET "statRequired" = 'quiz_solved_after_failure', "condition" = '==', "goalValue" = 1 WHERE "name" = 'Persistente'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "badge" DROP COLUMN "goalValue"`);
    await queryRunner.query(`ALTER TABLE "badge" DROP COLUMN "condition"`);
    await queryRunner.query(`ALTER TABLE "badge" DROP COLUMN "statRequired"`);
  }
}
