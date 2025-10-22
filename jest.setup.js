import "@testing-library/jest-dom";

// Global polyfills for Node.js environment
global.Request =
  global.Request ||
  class Request {
    constructor(input, init) {
      Object.defineProperty(this, "url", {
        value: input,
        writable: false,
        enumerable: true,
        configurable: true,
      });
      this.method = init?.method || "GET";
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }

    async json() {
      if (this.body) {
        return JSON.parse(this.body);
      }
      return {};
    }

    async text() {
      return this.body || "";
    }

    async formData() {
      return new FormData();
    }

    async arrayBuffer() {
      return new ArrayBuffer(0);
    }

    async blob() {
      return new Blob();
    }
  };

global.Response =
  global.Response ||
  class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || "OK";
      this.headers = new Headers(init?.headers);
    }

    static json(data, init) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
    }
  };

global.Headers =
  global.Headers ||
  class Headers {
    constructor(init) {
      this.map = new Map();
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) =>
            this.map.set(key.toLowerCase(), value)
          );
        } else if (typeof init === "object") {
          Object.entries(init).forEach(([key, value]) =>
            this.map.set(key.toLowerCase(), value)
          );
        }
      }
    }

    get(name) {
      return this.map.get(name.toLowerCase());
    }

    set(name, value) {
      this.map.set(name.toLowerCase(), value);
    }

    has(name) {
      return this.map.has(name.toLowerCase());
    }

    delete(name) {
      this.map.delete(name.toLowerCase());
    }

    forEach(callback) {
      this.map.forEach(callback);
    }
  };

global.TextEncoder =
  global.TextEncoder ||
  class TextEncoder {
    encode(input) {
      return Buffer.from(input, "utf8");
    }
  };

global.TextDecoder =
  global.TextDecoder ||
  class TextDecoder {
    decode(input) {
      return Buffer.from(input).toString("utf8");
    }
  };

global.ReadableStream =
  global.ReadableStream ||
  class ReadableStream {
    constructor(underlyingSource) {
      this.underlyingSource = underlyingSource;
      this._locked = false;
    }

    getReader() {
      if (this._locked) {
        throw new Error("ReadableStream is locked");
      }
      this._locked = true;
      return {
        read: jest.fn().mockResolvedValue({
          done: false,
          value: new TextEncoder().encode(
            'event: order-status\ndata: {"orderId":"evt-1","status":"FULFILLING"}\n\n'
          ),
        }),
        releaseLock: jest.fn(() => {
          this._locked = false;
        }),
        closed: Promise.resolve(),
        cancel: jest.fn(),
      };
    }

    pipeTo(destination) {
      return Promise.resolve();
    }

    pipeThrough(transform) {
      return this;
    }

    tee() {
      return [this, this];
    }

    cancel(reason) {
      return Promise.resolve();
    }

    get locked() {
      return this._locked;
    }
  };

global.ReadableStreamDefaultController =
  global.ReadableStreamDefaultController ||
  class ReadableStreamDefaultController {
    constructor() {
      this.desiredSize = 1;
    }

    enqueue(chunk) {
      // Mock implementation
    }

    close() {
      // Mock implementation
    }

    error(error) {
      // Mock implementation
    }
  };

global.Uint8Array = global.Uint8Array || Uint8Array;

global.setImmediate =
  global.setImmediate ||
  ((callback, ...args) => {
    return setTimeout(callback, 0, ...args);
  });

global.clearImmediate = global.clearImmediate || clearTimeout;

// Mock NextRequest
global.NextRequest =
  global.NextRequest ||
  class NextRequest extends Request {
    constructor(input, init) {
      super(input, init);
      this.nextUrl = new URL(input);
      this.cookies = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        has: jest.fn(),
        getAll: jest.fn(),
      };
    }
  };

// Mock Next.js router
jest.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: {},
      asPath: "/",
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.DATABASE_URL =
  "postgresql://postgres:password@localhost:5432/nvrstl_test";
process.env.STRIPE_SECRET_KEY = "sk_test_123";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

// Mock Prisma with realistic implementations for tests
jest.mock("@/lib/server/prisma", () => {
  const mockData = {
    users: new Map(),
    products: new Map(),
    discountCodes: new Map(),
    orders: new Map(),
    categories: new Map(),
    brands: new Map(),
    addresses: new Map(),
    emailVerificationTokens: new Map(),
    passwordResetTokens: new Map(),
    wishlistItems: new Map(),
    wishlists: new Map(),
    productImages: new Map(),
    productMetrics: new Map(),
    processedWebhookEvents: new Map(),
    orderEvents: new Map(),
  };

  const createMockModel = (dataMap) => ({
    findMany: jest.fn().mockResolvedValue(Array.from(dataMap.values())),
    findUnique: jest.fn().mockImplementation(({ where }) => {
      // Handle different where clauses
      if (where.code) {
        // For discount codes, search by code field
        for (const record of dataMap.values()) {
          if (record.code === where.code) {
            return Promise.resolve(record);
          }
        }
        return Promise.resolve(null);
      }
      // Default behavior for other fields
      const key = Object.values(where)[0];
      return Promise.resolve(dataMap.get(key) || null);
    }),
    create: jest.fn().mockImplementation(({ data }) => {
      const id = data.id || `mock-${Date.now()}-${Math.random()}`;
      const record = { id, ...data };
      dataMap.set(id, record);
      return Promise.resolve(record);
    }),
    update: jest.fn().mockImplementation(({ where, data }) => {
      const key = Object.values(where)[0];
      const existing = dataMap.get(key);
      if (existing) {
        const updated = { ...existing, ...data };
        dataMap.set(key, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    }),
    delete: jest.fn().mockImplementation(({ where }) => {
      const key = Object.values(where)[0];
      const existing = dataMap.get(key);
      if (existing) {
        dataMap.delete(key);
        return Promise.resolve(existing);
      }
      return Promise.resolve(null);
    }),
    deleteMany: jest.fn().mockImplementation(() => {
      dataMap.clear();
      return Promise.resolve({ count: 0 });
    }),
    count: jest.fn().mockResolvedValue(dataMap.size),
    upsert: jest.fn().mockImplementation(({ where, create, update }) => {
      const key = Object.values(where)[0];
      const existing = dataMap.get(key);
      if (existing) {
        const updated = { ...existing, ...update };
        dataMap.set(key, updated);
        return Promise.resolve(updated);
      } else {
        const record = { id: key, ...create };
        dataMap.set(key, record);
        return Promise.resolve(record);
      }
    }),
  });

  return {
    prisma: {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
      $executeRaw: jest.fn(),
      $transaction: jest.fn().mockImplementation((callback) =>
        callback({
          user: createMockModel(mockData.users),
          product: createMockModel(mockData.products),
          discountCode: createMockModel(mockData.discountCodes),
          order: createMockModel(mockData.orders),
          category: createMockModel(mockData.categories),
          brand: createMockModel(mockData.brands),
          address: createMockModel(mockData.addresses),
          emailVerificationToken: createMockModel(
            mockData.emailVerificationTokens
          ),
          passwordResetToken: createMockModel(mockData.passwordResetTokens),
          wishlistItem: createMockModel(mockData.wishlistItems),
          wishlist: createMockModel(mockData.wishlists),
          productImage: createMockModel(mockData.productImages),
          productMetrics: createMockModel(mockData.productMetrics),
          processedWebhookEvent: createMockModel(
            mockData.processedWebhookEvents
          ),
          orderEvent: createMockModel(mockData.orderEvents),
          cart: createMockModel(new Map()),
          cartLine: createMockModel(new Map()),
          orderItem: createMockModel(new Map()),
          orderEvent: createMockModel(new Map()),
          paymentRecord: createMockModel(new Map()),
          shipment: createMockModel(new Map()),
          sizeVariant: createMockModel(new Map()),
          review: createMockModel(new Map()),
          emailVerificationToken: createMockModel(new Map()),
          wishlistItem: createMockModel(new Map()),
          wishlist: createMockModel(new Map()),
          productImage: createMockModel(new Map()),
          productMetrics: createMockModel(new Map()),
          processedWebhookEvent: createMockModel(new Map()),
          address: createMockModel(new Map()),
          passwordResetToken: createMockModel(new Map()),
        })
      ),
      user: createMockModel(mockData.users),
      product: createMockModel(mockData.products),
      discountCode: createMockModel(mockData.discountCodes),
      order: createMockModel(mockData.orders),
      category: createMockModel(mockData.categories),
      brand: createMockModel(mockData.brands),
      cart: createMockModel(new Map()),
      cartLine: createMockModel(new Map()),
      orderItem: createMockModel(new Map()),
      orderEvent: createMockModel(new Map()),
      paymentRecord: createMockModel(new Map()),
      shipment: createMockModel(new Map()),
      sizeVariant: createMockModel(new Map()),
      review: createMockModel(new Map()),
      emailVerificationToken: createMockModel(new Map()),
    },
  };
});

// Mock prismaX
jest.mock("@/lib/server/prismaEx", () => ({
  prismaX: {
    orderEvent: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    passwordResetToken: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

// Mock NextResponse and NextRequest
jest.mock("next/server", () => ({
  NextRequest: global.NextRequest,
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: {
        get: jest.fn((name) => {
          const headers = init?.headers || {};
          if (typeof headers === "object" && headers !== null) {
            return headers[name] || null;
          }
          return null;
        }),
        ...init?.headers,
      },
    })),
    redirect: jest.fn(),
    rewrite: jest.fn(),
  },
}));

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("next-auth", () => ({
  default: jest.fn(),
  getServerSession: jest.fn().mockResolvedValue(null),
}));

jest.mock("next-auth/next", () => ({
  NextAuth: jest.fn(),
}));

// Mock problematic ESM modules
jest.mock("jose", () => ({
  SignJWT: jest.fn().mockReturnValue({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mock-jwt-token"),
  }),
  jwtVerify: jest.fn().mockResolvedValue({ payload: {} }),
  generateKeyPair: jest.fn().mockResolvedValue({
    publicKey: "mock-public-key",
    privateKey: "mock-private-key",
  }),
  compactDecrypt: jest
    .fn()
    .mockResolvedValue({ plaintext: Buffer.from("mock") }),
  compactEncrypt: jest.fn().mockResolvedValue("mock-encrypted"),
}));

jest.mock("openid-client", () => ({
  Issuer: {
    discover: jest.fn().mockResolvedValue({
      Client: jest.fn().mockReturnValue({
        callback: jest.fn().mockResolvedValue({}),
        authorizationUrl: jest.fn().mockReturnValue("mock-auth-url"),
      }),
    }),
  },
}));

// Mock Stripe
jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(() =>
    Promise.resolve({
      redirectToCheckout: jest.fn(),
      confirmPayment: jest.fn(),
    })
  ),
}));

// Mock React Query
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setLevel: jest.fn(),
  startSpan: jest.fn((options, callback) => {
    const span = {
      setData: jest.fn(),
      setStatus: jest.fn(),
      finish: jest.fn(),
    };
    return callback ? callback(span) : span;
  }),
  withScope: jest.fn((callback) => callback({})),
  getCurrentScope: jest.fn(() => ({
    setContext: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    setLevel: jest.fn(),
  })),
  getClient: jest.fn(() => ({
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  })),
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
