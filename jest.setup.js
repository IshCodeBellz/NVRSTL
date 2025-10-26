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

// Mock fetch for Node.js environment
global.fetch =
  global.fetch ||
  jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(""),
  });

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

// Shared mock data for both Prisma and prismaX mocks
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
  cartLines: new Map(),
  carts: new Map(),
  orderItems: new Map(),
  paymentRecords: new Map(),
  shipments: new Map(),
  sizeVariants: new Map(),
  reviews: new Map(),
  productReview: new Map(),
  reviewAnalytics: new Map(),
  reviewReport: new Map(),
  productVariants: new Map(),
  userBehaviors: new Map(),
  productBundles: new Map(),
  analyticsEvents: new Map(),
  categoryAnalytics: new Map(),
  productAnalytics: new Map(),
  inventoryAlerts: new Map(),
  inventoryItems: new Map(),
  notifications: new Map(),
  systemSettings: new Map(),
  contentPages: new Map(),
  contentSections: new Map(),
  categoryCards: new Map(),
  siteSettings: new Map(),
  shopCategories: new Map(),
  shopSubcategories: new Map(),
  shopTeams: new Map(),
};

// Make mockData globally accessible for resetDb function
global.__mockData = mockData;

const createMockModel = (dataMap) => ({
  findMany: jest.fn().mockImplementation(({ where, include } = {}) => {
    if (!where) {
      // Return unique records by ID to avoid duplicates
      const records = Array.from(dataMap.values());
      const uniqueRecords = records.filter(
        (record, index, self) =>
          index === self.findIndex((r) => r.id === record.id)
      );
      return Promise.resolve(uniqueRecords);
    }

    let filtered = Array.from(dataMap.values());

    // Remove duplicates first
    filtered = filtered.filter(
      (record, index, self) =>
        index === self.findIndex((r) => r.id === record.id)
    );

    // Apply filters in sequence
    if (where.orderId) {
      filtered = filtered.filter((record) => record.orderId === where.orderId);
    }
    if (where.gender && where.gender.in) {
      // Handle gender filtering with 'in' operator
      filtered = filtered.filter((record) =>
        where.gender.in.includes(record.gender)
      );
    }
    if (where.category && where.category.slug) {
      // Handle category filtering by slug
      filtered = filtered.filter((record) => {
        if (record.category && record.category.slug) {
          // If category is already included, use it directly
          return record.category.slug === where.category.slug;
        } else if (record.categoryId) {
          // Otherwise, look up the category by ID
          const category = mockData.categories.get(record.categoryId);
          return category && category.slug === where.category.slug;
        }
        return false;
      });
    }
    if (where.isActive !== undefined) {
      filtered = filtered.filter(
        (record) => record.isActive === where.isActive
      );
    }
    if (where.deletedAt === null) {
      filtered = filtered.filter((record) => record.deletedAt === null);
    }
    if (where.isPublished !== undefined) {
      filtered = filtered.filter(
        (record) => record.isPublished === where.isPublished
      );
    }

    // Handle include relationships
    if (include) {
      filtered = filtered.map((record) => {
        const result = { ...record };

        if (include.category && record.categoryId) {
          // Find the category by ID
          const category = mockData.categories.get(record.categoryId);
          if (category) {
            result.category = category;
          }
        }

        if (include.brand && record.brandId) {
          // Find the brand by ID
          const brand = mockData.brands.get(record.brandId);
          if (brand) {
            result.brand = brand;
          }
        }

        if (include.images) {
          // Find images for this product
          const images = Array.from(mockData.productImages.values())
            .filter((img) => img.productId === record.id)
            .sort((a, b) => a.position - b.position);
          result.images = images;
        }

        if (include.sizeVariants) {
          // Find size variants for this product
          const sizeVariants = Array.from(
            mockData.sizeVariants.values()
          ).filter((sv) => sv.productId === record.id);
          result.sizeVariants = sizeVariants;
        }

        if (include.items) {
          // Find order items for this order
          const items = Array.from(mockData.orderItems.values())
            .filter((item) => item.orderId === record.id)
            .map((item) => {
              // Apply select fields if specified
              if (include.items.select) {
                const selectedItem = {};
                Object.keys(include.items.select).forEach((field) => {
                  if (include.items.select[field]) {
                    selectedItem[field] = item[field];
                  }
                });
                return selectedItem;
              }
              return item;
            });
          result.items = items;
        }

        if (include.user) {
          // Find the user by ID
          const user = mockData.users.get(record.userId);
          if (user) {
            result.user = user;
          }
        }

        if (include.shippingAddress) {
          // Find the shipping address by ID
          const address = mockData.addresses.get(record.shippingAddressId);
          if (address) {
            result.shippingAddress = address;
          }
        }

        return result;
      });
    }

    return Promise.resolve(filtered);
  }),
  findUnique: jest.fn().mockImplementation(({ where, include }) => {
    // Handle different where clauses
    // Check for cart by userId first, before other conditions
    if (where.userId) {
      // For carts, search by userId field and include lines
      for (const record of dataMap.values()) {
        if (record.userId === where.userId) {
          // Get cart lines for this cart
          const cartLines = Array.from(mockData.cartLines.values())
            .filter((line) => line.cartId === record.id)
            .map((line) => {
              const lineResult = { ...line };

              // Handle nested include for product
              if (include?.lines?.include?.product) {
                const product = mockData.products.get(line.productId);
                if (product) {
                  lineResult.product = { ...product };

                  // Handle nested include for sizeVariants
                  if (include.lines.include.product.include?.sizeVariants) {
                    const sizeVariants = Array.from(
                      mockData.sizeVariants.values()
                    ).filter((sv) => sv.productId === product.id);
                    lineResult.product.sizeVariants = sizeVariants;
                  }
                } else {
                  // Fallback product data
                  lineResult.product = {
                    id: line.productId,
                    deletedAt: null,
                    isActive: true,
                    priceCents: line.priceCentsSnapshot,
                    name: "Test Product",
                    description: "Test Description",
                    sku: "TEST-SKU",
                    sizeVariants: include?.lines?.include?.product?.include
                      ?.sizeVariants
                      ? []
                      : undefined,
                  };
                }
              }

              return lineResult;
            });
          return Promise.resolve({
            ...record,
            lines: cartLines, // Include actual cart lines
          });
        }
      }
      return Promise.resolve(null);
    }
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
    if (where.token) {
      // For email verification tokens, search by token field
      for (const record of dataMap.values()) {
        if (record.token === where.token) {
          // Include user if requested
          if (include?.user && record.userId) {
            const user = mockData.users.get(record.userId);
            return Promise.resolve({ ...record, user });
          }
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    if (where.userId) {
      // For email verification tokens, search by userId field
      for (const record of dataMap.values()) {
        if (record.userId === where.userId) {
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    if (where.email) {
      // For users, search by email field
      for (const record of dataMap.values()) {
        if (record.email === where.email) {
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    if (where.id) {
      // For orders, include items and payments if requested
      const record = dataMap.get(where.id);
      if (record) {
        const result = { ...record };
        if (include?.items) {
          result.items = Array.from(mockData.orderItems.values()).filter(
            (item) => item.orderId === record.id
          );
        }
        if (include?.payments) {
          result.payments = Array.from(mockData.paymentRecords.values()).filter(
            (payment) => payment.orderId === record.id
          );
        }
        return Promise.resolve(result);
      }
      return Promise.resolve(null);
    }
    if (where.provider && where.providerRef) {
      // For payment records, search by provider and providerRef fields
      for (const record of dataMap.values()) {
        if (
          record.provider === where.provider &&
          record.providerRef === where.providerRef
        ) {
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    if (where.userId && where.checkoutIdempotencyKey) {
      // For orders, search by userId and checkoutIdempotencyKey fields
      for (const record of dataMap.values()) {
        if (
          record.userId === where.userId &&
          record.checkoutIdempotencyKey === where.checkoutIdempotencyKey
        ) {
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    // Default behavior for other fields
    const key = Object.values(where)[0];
    return Promise.resolve(dataMap.get(key) || null);
  }),
  findFirst: jest.fn().mockImplementation(({ where } = {}) => {
    // Handle different where clauses
    if (!where) {
      // Return first record if no where clause
      return Promise.resolve(Array.from(dataMap.values())[0] || null);
    }
    if (where && where.orderId) {
      // For payment records, search by orderId field
      for (const record of dataMap.values()) {
        if (record.orderId === where.orderId) {
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    if (where.provider && where.providerRef) {
      // For payment records, search by provider and providerRef fields
      for (const record of dataMap.values()) {
        if (
          record.provider === where.provider &&
          record.providerRef === where.providerRef
        ) {
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    if (where.userId && where.checkoutIdempotencyKey) {
      // For orders, search by userId and checkoutIdempotencyKey fields
      for (const record of dataMap.values()) {
        if (
          record.userId === where.userId &&
          record.checkoutIdempotencyKey === where.checkoutIdempotencyKey
        ) {
          return Promise.resolve(record);
        }
      }
      return Promise.resolve(null);
    }
    // Handle multiple field matching (e.g., { productId: "...", label: "M" })
    for (const record of dataMap.values()) {
      let matches = true;
      for (const [field, value] of Object.entries(where)) {
        if (record[field] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return Promise.resolve(record);
      }
    }
    return Promise.resolve(null);
  }),
  create: jest.fn().mockImplementation(({ data, include } = {}) => {
    const id = data.id || `mock-${Date.now()}-${Math.random()}`;
    const record = {
      id,
      ...data,
      // Ensure deletedAt is null for products if not specified
      deletedAt: data.deletedAt !== undefined ? data.deletedAt : null,
      // Ensure createdAt is set for all records
      createdAt: data.createdAt || new Date(),
    };
    dataMap.set(id, record);
    // Also store by email if it exists (for user lookups)
    if (data.email) {
      dataMap.set(data.email, record);
    }
    // Handle cart creation with user connection
    if (data.user && data.user.connect) {
      record.userId = data.user.connect.id;
      dataMap.set(data.user.connect.id, record);
    }

    // Handle cart creation with lines
    if (dataMap === mockData.carts) {
      if (data.lines && data.lines.create) {
        const cartLineId = `cartline-${id}-0`;
        const cartLineRecord = {
          id: cartLineId,
          cartId: id,
          productId: data.lines.create.productId,
          qty: data.lines.create.qty,
          priceCentsSnapshot: data.lines.create.priceCentsSnapshot,
          product: {
            id: data.lines.create.productId,
            deletedAt: null,
            isActive: true,
            priceCents: data.lines.create.priceCentsSnapshot,
            name: "Test Product",
            description: "Test Description",
            sku: "TEST-SKU",
            sizeVariants: [],
          },
        };
        mockData.cartLines.set(cartLineId, cartLineRecord);
        record.lines = [cartLineRecord];
      } else {
        // Ensure cart always has lines array, even if empty
        record.lines = [];
      }
    }

    // Handle nested creates for images and size variants
    if (
      data.images &&
      data.images.create &&
      Array.isArray(data.images.create)
    ) {
      const createdImages = data.images.create.map((imgData, index) => {
        const imageId = `img-${id}-${index}`;
        const imageRecord = {
          id: imageId,
          productId: id,
          url: imgData.url,
          alt: imgData.alt || null,
          position: imgData.position || index,
        };
        mockData.productImages.set(imageId, imageRecord);
        return imageRecord;
      });
      record.images = createdImages;
    }

    if (
      data.sizeVariants &&
      data.sizeVariants.create &&
      Array.isArray(data.sizeVariants.create)
    ) {
      const createdSizeVariants = data.sizeVariants.create.map(
        (sizeData, index) => {
          const sizeId = `size-${id}-${index}`;
          const sizeRecord = {
            id: sizeId,
            productId: id,
            label: sizeData.label,
            stock: sizeData.stock,
          };
          mockData.sizeVariants.set(sizeId, sizeRecord);
          return sizeRecord;
        }
      );
      record.sizeVariants = createdSizeVariants;
    }

    // Handle include relationships
    if (include) {
      const result = { ...record };

      if (include.images) {
        // Find images for this product
        const images = Array.from(mockData.productImages.values())
          .filter((img) => img.productId === record.id)
          .sort((a, b) => a.position - b.position);
        result.images = images;
      }

      if (include.sizeVariants) {
        // Find size variants for this product
        const sizeVariants = Array.from(mockData.sizeVariants.values()).filter(
          (sv) => sv.productId === record.id
        );
        result.sizeVariants = sizeVariants;
      }

      if (include.category && record.categoryId) {
        // Find the category by ID
        const category = mockData.categories.get(record.categoryId);
        if (category) {
          result.category = category;
        }
      }

      if (include.brand && record.brandId) {
        // Find the brand by ID
        const brand = mockData.brands.get(record.brandId);
        if (brand) {
          result.brand = brand;
        }
      }

      return Promise.resolve(result);
    }

    return Promise.resolve(record);
  }),
  update: jest.fn().mockImplementation(({ where, data }) => {
    const key = Object.values(where)[0];
    const existing = dataMap.get(key);
    if (existing) {
      const updated = { ...existing };

      // Handle Prisma increment syntax
      Object.keys(data).forEach((field) => {
        if (
          data[field] &&
          typeof data[field] === "object" &&
          data[field].increment !== undefined
        ) {
          updated[field] = (updated[field] || 0) + data[field].increment;
        } else {
          updated[field] = data[field];
        }
      });

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
  count: jest.fn().mockImplementation(() => {
    const records = Array.from(dataMap.values());
    const uniqueRecords = records.filter(
      (record, index, self) =>
        index === self.findIndex((r) => r.id === record.id)
    );
    return Promise.resolve(uniqueRecords.length);
  }),
  groupBy: jest.fn().mockImplementation(({ by, _count, _sum } = {}) => {
    // Mock groupBy for order and payment stats
    const records = Array.from(dataMap.values());

    // Remove duplicates first
    const uniqueRecords = records.filter(
      (record, index, self) =>
        index === self.findIndex((r) => r.id === record.id)
    );

    const groups = new Map();

    uniqueRecords.forEach((record) => {
      const key = by.map((field) => record[field]).join("|");
      if (!groups.has(key)) {
        groups.set(key, {
          ...by.reduce(
            (acc, field) => ({ ...acc, [field]: record[field] }),
            {}
          ),
          _count: { _all: 0 },
          _sum: {},
        });
      }
      const group = groups.get(key);
      group._count._all += 1;

      // Handle _sum fields
      if (_sum) {
        Object.keys(_sum).forEach((field) => {
          if (!group._sum[field]) group._sum[field] = 0;
          group._sum[field] += record[field] || 0;
        });
      }
    });

    return Promise.resolve(Array.from(groups.values()));
  }),
  aggregate: jest.fn().mockImplementation(({ _avg } = {}) => {
    // Mock aggregate for average calculations
    const records = Array.from(dataMap.values());

    // Remove duplicates first
    const uniqueRecords = records.filter(
      (record, index, self) =>
        index === self.findIndex((r) => r.id === record.id)
    );

    if (uniqueRecords.length === 0) {
      return Promise.resolve({ _avg: { priceCents: 0 } });
    }

    const sum = uniqueRecords.reduce(
      (acc, record) => acc + (record.priceCents || 0),
      0
    );
    const avg = sum / uniqueRecords.length;

    return Promise.resolve({ _avg: { priceCents: avg } });
  }),
  upsert: jest.fn().mockImplementation(({ where, create, update }) => {
    const key = Object.values(where)[0];
    const existing = dataMap.get(key);
    if (existing) {
      const updated = { ...existing, ...update };
      dataMap.set(key, updated);
      return Promise.resolve(updated);
    } else {
      // Generate a unique ID for carts instead of using userId
      const recordId =
        dataMap === mockData.carts
          ? `cart-${Date.now()}-${Math.random()}`
          : key;
      const record = {
        id: recordId,
        ...create,
        createdAt: create.createdAt || new Date(), // Ensure createdAt is always set
      };
      dataMap.set(recordId, record);
      // Handle cart creation with user connection
      if (create.user && create.user.connect) {
        record.userId = create.user.connect.id;
      }
      // Also store by email if it exists (for user lookups)
      if (create.email) {
        dataMap.set(create.email, record);
      }
      return Promise.resolve(record);
    }
  }),
});

// Mock Prisma with realistic implementations for tests
jest.mock("@/lib/server/prisma", () => {
  return {
    prisma: {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn().mockImplementation((template) => {
        // Handle SELECT 1 queries for health checks
        if (template && template.toString().includes("SELECT 1")) {
          return Promise.resolve([{ "?column?": 1 }]);
        }
        return Promise.resolve([{ id: 1 }]);
      }),
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ purchases: 1 }]),
      $executeRaw: jest.fn(),
      $executeRawUnsafe: jest.fn().mockImplementation((sql, ...params) => {
        // Mock implementation for raw SQL updates
        // For the inventory test, we need to simulate conditional updates
        if (
          sql.includes('UPDATE "SizeVariant" SET "stock" = "stock" -') ||
          sql.includes("UPDATE SizeVariant SET stock = stock -")
        ) {
          // Extract the size variant ID and qty from params
          let sizeVariantId, qty;
          if (sql.includes('UPDATE "SizeVariant"')) {
            // Postgres syntax: qty is first param, sizeVariantId is second
            qty = params[0];
            sizeVariantId = params[1];
          } else {
            // SQLite syntax: qty is first param, sizeVariantId is second, qty is third (for WHERE condition)
            qty = params[0];
            sizeVariantId = params[1];
          }

          // Find the size variant in mock data
          const sizeVariant = mockData.sizeVariants.get(sizeVariantId);
          if (sizeVariant && sizeVariant.stock >= qty) {
            // Update the stock
            sizeVariant.stock -= qty;
            mockData.sizeVariants.set(sizeVariantId, sizeVariant);
            return Promise.resolve(1); // Return number of affected rows
          }
          return Promise.resolve(0); // No rows affected
        }
        return Promise.resolve(0);
      }),
      $transaction: jest.fn().mockImplementation((operations) => {
        // Handle both callback-style and array-style transactions
        if (typeof operations === "function") {
          // Create a transaction context that shares the same data maps
          // This ensures updates in the transaction are reflected in the main prisma instance
          const txContext = {
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
            cart: createMockModel(mockData.carts),
            cartLine: createMockModel(mockData.cartLines),
            orderItem: createMockModel(mockData.orderItems),
            paymentRecord: createMockModel(mockData.paymentRecords),
            shipment: createMockModel(mockData.shipments),
            sizeVariant: createMockModel(mockData.sizeVariants),
            review: createMockModel(mockData.reviews),
            productReview: createMockModel(mockData.productReview),
            reviewAnalytics: createMockModel(mockData.reviewAnalytics),
            reviewReport: createMockModel(mockData.reviewReport),
            productVariant: createMockModel(mockData.productVariants),
            userBehavior: createMockModel(mockData.userBehaviors),
            productBundle: createMockModel(mockData.productBundles),
            analyticsEvent: createMockModel(mockData.analyticsEvents),
            categoryAnalytics: createMockModel(mockData.categoryAnalytics),
            productAnalytics: createMockModel(mockData.productAnalytics),
            inventoryAlert: createMockModel(mockData.inventoryAlerts),
            inventoryItem: createMockModel(mockData.inventoryItems),
            notification: createMockModel(mockData.notifications),
            systemSetting: createMockModel(mockData.systemSettings),
            contentPage: createMockModel(mockData.contentPages),
            contentSection: createMockModel(mockData.contentSections),
            categoryCard: createMockModel(mockData.categoryCards),
            siteSetting: createMockModel(mockData.siteSettings),
            shopCategory: createMockModel(mockData.shopCategories),
            shopSubcategory: createMockModel(mockData.shopSubcategories),
            shopTeam: createMockModel(mockData.shopTeams),
            $executeRawUnsafe: jest
              .fn()
              .mockImplementation((sql, ...params) => {
                // Mock implementation for raw SQL updates within transactions
                if (
                  sql.includes(
                    'UPDATE "SizeVariant" SET "stock" = "stock" -'
                  ) ||
                  sql.includes("UPDATE SizeVariant SET stock = stock -")
                ) {
                  let sizeVariantId, qty;
                  if (sql.includes('UPDATE "SizeVariant"')) {
                    // Postgres syntax: qty is first param, sizeVariantId is second
                    qty = params[0];
                    sizeVariantId = params[1];
                  } else {
                    // SQLite syntax: qty is first param, sizeVariantId is second, qty is third (for WHERE condition)
                    qty = params[0];
                    sizeVariantId = params[1];
                  }

                  const sizeVariant = mockData.sizeVariants.get(sizeVariantId);
                  if (sizeVariant && sizeVariant.stock >= qty) {
                    sizeVariant.stock -= qty;
                    mockData.sizeVariants.set(sizeVariantId, sizeVariant);
                    return Promise.resolve(1);
                  }
                  return Promise.resolve(0);
                }
                return Promise.resolve(0);
              }),
          };
          return operations(txContext);
        } else {
          // Handle array-style transactions (like in password reset and webhook)
          return Promise.all(
            operations.map((op) => {
              // Handle different types of operations in transactions
              if (op.paymentRecord && op.paymentRecord.update) {
                return op.paymentRecord.update(op.where, op.data);
              }
              if (op.order && op.order.update) {
                return op.order.update(op.where, op.data);
              }
              if (op.cartLine && op.cartLine.deleteMany) {
                return op.cartLine.deleteMany(op.where);
              }
              if (op.user && op.user.update) {
                return op.user.update(op.where, op.data);
              }
              // Handle prismaX.passwordResetToken operations
              if (op.passwordResetToken && op.passwordResetToken.update) {
                const token = op.where.token;
                const existing = mockData.passwordResetTokens.get(token);
                if (existing) {
                  const updated = { ...existing, ...op.data };
                  mockData.passwordResetTokens.set(token, updated);
                  return Promise.resolve(updated);
                }
                return Promise.resolve(null);
              }
              if (op.passwordResetToken && op.passwordResetToken.deleteMany) {
                const userId = op.where.userId;
                const expiredAt = op.where.expiresAt.lt;
                let deletedCount = 0;
                for (const [
                  token,
                  record,
                ] of mockData.passwordResetTokens.entries()) {
                  if (
                    record.userId === userId &&
                    record.expiresAt < expiredAt
                  ) {
                    mockData.passwordResetTokens.delete(token);
                    deletedCount++;
                  }
                }
                return Promise.resolve({ count: deletedCount });
              }
              if (op.cart && op.cart.findUnique) {
                return op.cart.findUnique(op.where);
              }
              // Mock the operations that are called in the password reset transaction
              return Promise.resolve({});
            })
          );
        }
      }),
      user: createMockModel(mockData.users),
      product: createMockModel(mockData.products),
      discountCode: createMockModel(mockData.discountCodes),
      order: createMockModel(mockData.orders),
      category: createMockModel(mockData.categories),
      brand: createMockModel(mockData.brands),
      address: createMockModel(mockData.addresses),
      emailVerificationToken: createMockModel(mockData.emailVerificationTokens),
      passwordResetToken: createMockModel(mockData.passwordResetTokens),
      wishlistItem: createMockModel(mockData.wishlistItems),
      wishlist: createMockModel(mockData.wishlists),
      productImage: createMockModel(mockData.productImages),
      productMetrics: createMockModel(mockData.productMetrics),
      processedWebhookEvent: createMockModel(mockData.processedWebhookEvents),
      orderEvent: createMockModel(mockData.orderEvents),
      cart: createMockModel(mockData.carts),
      cartLine: createMockModel(mockData.cartLines),
      orderItem: createMockModel(mockData.orderItems),
      paymentRecord: createMockModel(mockData.paymentRecords),
      shipment: createMockModel(mockData.shipments),
      sizeVariant: createMockModel(mockData.sizeVariants),
      review: createMockModel(mockData.reviews),
      productReview: createMockModel(mockData.productReview),
      reviewAnalytics: createMockModel(mockData.reviewAnalytics),
      reviewReport: createMockModel(mockData.reviewReport),
      productVariant: createMockModel(mockData.productVariants),
      userBehavior: createMockModel(mockData.userBehaviors),
      productBundle: createMockModel(mockData.productBundles),
      analyticsEvent: createMockModel(mockData.analyticsEvents),
      categoryAnalytics: createMockModel(mockData.categoryAnalytics),
      productAnalytics: createMockModel(mockData.productAnalytics),
      inventoryAlert: createMockModel(mockData.inventoryAlerts),
      inventoryItem: createMockModel(mockData.inventoryItems),
      notification: createMockModel(mockData.notifications),
      systemSetting: createMockModel(mockData.systemSettings),
      contentPage: createMockModel(mockData.contentPages),
      contentSection: createMockModel(mockData.contentSections),
      categoryCard: createMockModel(mockData.categoryCards),
      siteSetting: createMockModel(mockData.siteSettings),
      shopCategory: createMockModel(mockData.shopCategories),
      shopSubcategory: createMockModel(mockData.shopSubcategories),
      shopTeam: createMockModel(mockData.shopTeams),
    },
  };
});

// Mock prismaX
jest.mock("@/lib/server/prismaEx", () => ({
  prismaX: {
    orderEvent: createMockModel(mockData.orderEvents),
    passwordResetToken: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        // Mock implementation for password reset tokens
        if (where.token) {
          // Check if token exists in mock data
          const tokenRecord = mockData.passwordResetTokens.get(where.token);
          if (tokenRecord) {
            return Promise.resolve(tokenRecord);
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const tokenRecord = {
          id: "mock-token-id",
          ...data,
          createdAt: new Date(),
        };
        // Store the token in mock data for later retrieval
        if (data.token) {
          mockData.passwordResetTokens.set(data.token, tokenRecord);
        }
        return Promise.resolve(tokenRecord);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const token = where.token;
        const existing = mockData.passwordResetTokens.get(token);
        if (existing) {
          const updated = { ...existing, ...data };
          mockData.passwordResetTokens.set(token, updated);
          return Promise.resolve(updated);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockResolvedValue({ id: "mock-id" }),
    },
    productImage: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "mock-id" }),
      update: jest.fn().mockResolvedValue({ id: "mock-id" }),
      delete: jest.fn().mockResolvedValue({ id: "mock-id" }),
    },
    address: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "mock-id" }),
      update: jest.fn().mockResolvedValue({ id: "mock-id" }),
      delete: jest.fn().mockResolvedValue({ id: "mock-id" }),
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

// Mock address validation
jest.mock("@/lib/server/address/validateAddress", () => ({
  validateAndNormalizeAddress: jest.fn().mockResolvedValue({
    valid: true,
    normalized: null,
  }),
}));

// Mock auth functions
jest.mock("@/lib/server/auth", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed-password"),
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

// Mock mailer
jest.mock("@/lib/server/mailer", () => ({
  getMailer: jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue({}),
  }),
  buildPasswordResetHtml: jest
    .fn()
    .mockReturnValue("<html>Reset password</html>"),
  buildOrderConfirmationHtml: jest.fn().mockImplementation((order) => {
    return `<html>
          <head><title>Order #${order.id} received</title></head>
          <body>
            <h1>Order #${order.id} received</h1>
            <p>Thanks for your order</p>
            <p>Total: £${(order.totalCents / 100).toFixed(2)}</p>
          </body>
        </html>`;
  }),
  buildPaymentReceiptHtml: jest.fn().mockImplementation((order) => {
    return `<html>
          <head><title>Payment received for #${order.id}</title></head>
          <body>
            <h1>Payment received for #${order.id}</h1>
            <p>Amount: £${(order.totalCents / 100).toFixed(2)}</p>
          </body>
        </html>`;
  }),
  sendEmailVerification: jest.fn().mockResolvedValue({}),
  sendOrderConfirmation: jest.fn().mockImplementation(async (user, order) => {
    // Simulate console logging when RESEND_API_KEY is not set
    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[CONSOLE MAILER] Order confirmation for ${user.email}: Order #${order.id} confirmation`
      );
    }
    const mailer = { send: jest.fn().mockResolvedValue({}) };
    const html = `<html>
        <head><title>Order #${order.id} received</title></head>
        <body>
          <h1>Order #${order.id} received</h1>
          <p>Thanks for your order</p>
          <p>Total: £${(order.totalCents / 100).toFixed(2)}</p>
        </body>
      </html>`;
    await mailer.send({
      to: user.email,
      subject: `Order #${order.id} confirmation`,
      text: `We received your order totaling £${(
        order.totalCents / 100
      ).toFixed(2)}. Thank you!`,
      html,
    });
  }),
  sendPaymentReceipt: jest.fn().mockImplementation(async (user, order) => {
    // Simulate console logging when RESEND_API_KEY is not set
    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[CONSOLE MAILER] Payment receipt for ${user.email}: Payment received for order #${order.id}`
      );
    }
    const mailer = { send: jest.fn().mockResolvedValue({}) };
    const html = `<html>
        <head><title>Payment received for #${order.id}</title></head>
        <body>
          <h1>Payment received for #${order.id}</h1>
          <p>Amount: £${(order.totalCents / 100).toFixed(2)}</p>
        </body>
      </html>`;
    await mailer.send({
      to: user.email,
      subject: `Payment received for order #${order.id}`,
      text: `Your payment for £${(order.totalCents / 100).toFixed(
        2
      )} has been captured. We'll start processing your order.`,
      html,
    });
  }),
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
  getServerSession: jest.fn().mockResolvedValue({
    user: { id: "admin-u", email: "admin@example.com", isAdmin: true },
  }),
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
