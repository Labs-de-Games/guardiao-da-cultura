import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1777927558352 implements MigrationInterface {
  name = "InitialMigration1777927558352";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."game_event_type_enum" AS ENUM('game.started', 'game.paused', 'game.resumed', 'session.end', 'level.started', 'level.completed', 'level.failed', 'level.restarted', 'star.collected', 'clue.used', 'clue.unlocked', 'progression.updated', 'badge.earned', 'badge.viewed', 'event.logged', 'quiz.completed', 'quiz.failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "game_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying, "type" "public"."game_event_type_enum" NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}', "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d979b8a4d47b02b8f87322f33e0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."badge_type_enum" AS ENUM('level', 'collection', 'special')`,
    );
    await queryRunner.query(
      `CREATE TABLE "badge" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text NOT NULL, "iconUrl" character varying NOT NULL, "type" "public"."badge_type_enum" NOT NULL DEFAULT 'level', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76b7011c864d4521a14a5196c49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('player', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'player', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_badge" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "badgeId" uuid NOT NULL, "earnedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c5db2542e028558c5306c9d7f42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "currentLevel" integer NOT NULL DEFAULT '1', "totalStars" integer NOT NULL DEFAULT '0', "completedLevels" jsonb NOT NULL DEFAULT '{}', "clues" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_b5d0e1b57bc6c761fb49e79bf8" UNIQUE ("userId"), CONSTRAINT "PK_7b5eb2436efb0051fdf05cbe839" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" ADD CONSTRAINT "FK_dc6bb11dce7a0a591b5cae0af25" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" ADD CONSTRAINT "FK_8a49533f303db990198b8c9ddf7" FOREIGN KEY ("badgeId") REFERENCES "badge"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" ADD CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" DROP CONSTRAINT "FK_8a49533f303db990198b8c9ddf7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" DROP CONSTRAINT "FK_dc6bb11dce7a0a591b5cae0af25"`,
    );
    await queryRunner.query(`DROP TABLE "user_progress"`);
    await queryRunner.query(`DROP TABLE "user_badge"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "badge"`);
    await queryRunner.query(`DROP TYPE "public"."badge_type_enum"`);
    await queryRunner.query(`DROP TABLE "game_event"`);
    await queryRunner.query(`DROP TYPE "public"."game_event_type_enum"`);
  }
}
