import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedBadges1777927558353 implements MigrationInterface {
  name = "SeedBadges1777927558353";

  private badges = [
    {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      name: "Explorador",
      description: "Inspecionou todos os objetos.",
      iconUrl: "/badges/badge_explorer.png",
      type: "special",
    },
    {
      id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      name: "Restaurador",
      description: "Resolveu sem erros.",
      iconUrl: "/badges/badge_restorer.png",
      type: "special",
    },
    {
      id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
      name: "Curador",
      description: "Acertou 100% do quiz.",
      iconUrl: "/badges/badge_curator.png",
      type: "special",
    },
    {
      id: "d4e5f6a7-b8c9-0123-defa-234567890123",
      name: "Detetive",
      description: "Coletou pista secreta.",
      iconUrl: "/badges/badge_detective.png",
      type: "special",
    },
    {
      id: "e5f6a7b8-c9d0-1234-efab-345678901234",
      name: "Persistente",
      description: "Concluiu o quiz após uma falha anterior.",
      iconUrl: "/badges/badge_persistent.png",
      type: "special",
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const badge of this.badges) {
      await queryRunner.query(
        `INSERT INTO "badge" ("id", "name", "description", "iconUrl", "type", "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
        [badge.id, badge.name, badge.description, badge.iconUrl, badge.type],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ids = this.badges.map((b) => `'${b.id}'`).join(", ");
    await queryRunner.query(`DELETE FROM "badge" WHERE "id" IN (${ids})`);
  }
}
