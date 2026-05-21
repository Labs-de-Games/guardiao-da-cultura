import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/test-setup.ts"],
};

export default createJestConfig(config);
