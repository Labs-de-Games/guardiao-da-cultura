import { PasswordService } from "../../../src/modules/auth/services/password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes with argon2id", async () => {
    const hash = await service.hash("correct-horse-battery");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifies a matching password", async () => {
    const hash = await service.hash("correct-horse-battery");
    await expect(service.verify(hash, "correct-horse-battery")).resolves.toBe(
      true,
    );
  });

  it("rejects a wrong password", async () => {
    const hash = await service.hash("correct-horse-battery");
    await expect(service.verify(hash, "wrong-password")).resolves.toBe(false);
  });

  it("returns false instead of throwing on a malformed hash", async () => {
    await expect(service.verify("not-a-real-hash", "anything")).resolves.toBe(
      false,
    );
  });
});
