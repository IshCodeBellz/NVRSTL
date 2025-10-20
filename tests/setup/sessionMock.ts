// Mock next-auth getServerSession for route handler unit/integration testing without Next.js request context
jest.mock("next-auth", () => {
  const original = jest.requireActual("next-auth");
  return {
    __esModule: true,
    ...original,
    getServerSession: jest.fn(async () => ({
      user: { id: "test-user", email: "test@example.com", isAdmin: true },
    })),
  };
});

// Provide a simple crypto.randomUUID polyfill if needed in node environment
if (!(global as any).crypto) {
  (global as any).crypto = {
    randomUUID: () => "uuid-" + Math.random().toString(16).slice(2, 10),
  } as any;
}
