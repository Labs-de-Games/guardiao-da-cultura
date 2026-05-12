import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserEntity1778520132998 implements MigrationInterface {
  name = "UpdateUserEntity1778520132998";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_badge" DROP CONSTRAINT "UQ_user_badge_userId_badgeId"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."magic_link_token_type_enum" AS ENUM('magic_link', 'verification')`,
    );
    await queryRunner.query(
      `CREATE TABLE "magic_link_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "type" "public"."magic_link_token_type_enum" NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "usedAt" TIMESTAMP, "deviceNonce" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userAgent" character varying, "ipAddress" character varying, "userId" uuid, CONSTRAINT "PK_dd1d00fdff85260e45d6e72f979" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "revokedAt" TIMESTAMP, "replacedByToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userAgent" character varying, "ipAddress" character varying, "userId" uuid, CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "username"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "nickname" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_e2364281027b926b879fa2fa1e0" UNIQUE ("nickname")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "firstName" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "lastName" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "dateOfBirth" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "lastLoginAt" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('player', 'institution', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum" USING "role"::"text"::"public"."user_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'player'`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "user_badge" ADD CONSTRAINT "UQ_be9b63df63d3d091441ae9b003c" UNIQUE ("userId", "badgeId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "magic_link_token" ADD CONSTRAINT "FK_addd46b404fa8329fecc16494de" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_8e913e288156c133999341156ad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_8e913e288156c133999341156ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "magic_link_token" DROP CONSTRAINT "FK_addd46b404fa8329fecc16494de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" DROP CONSTRAINT "UQ_be9b63df63d3d091441ae9b003c"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum_old" AS ENUM('player', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'player'`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isEmailVerified"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dateOfBirth"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "firstName"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_e2364281027b926b879fa2fa1e0"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "nickname"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "username" character varying NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "refresh_token"`);
    await queryRunner.query(`DROP TABLE "magic_link_token"`);
    await queryRunner.query(`DROP TYPE "public"."magic_link_token_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "user_badge" ADD CONSTRAINT "UQ_user_badge_userId_badgeId" UNIQUE ("userId", "badgeId")`,
    );
  }
}
