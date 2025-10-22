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
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.STRIPE_SECRET_KEY = "sk_test_123";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

// Mock Prisma
jest.mock("@/lib/server/prisma", () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    cart: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    cartLine: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    orderEvent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    paymentRecord: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    shipment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    brand: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    sizeVariant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    discountCode: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock NextResponse
jest.mock("next/server", () => ({
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
