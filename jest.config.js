/** @type {import('jest').Config} */
const isSerial = process.env.JEST_SERIAL || process.env.JEST_SILENT_LOG;
/** @type {import('jest').Config} */
const base = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["<rootDir>/jest.env.setup.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/sessionMock.ts"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!app/**/page.tsx",
    "!app/**/layout.tsx",
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      statements: 70,
      branches: 60,
      functions: 65,
    },
  },
  // Increase timeout for integration tests
  testTimeout: 30000,
  // Force serial execution to avoid database deadlocks
  maxWorkers: 1,
};

module.exports = base;
