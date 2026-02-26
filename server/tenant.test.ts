import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME, TENANT_COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext() {
  const clearedCookies: CookieCall[] = [];
  const setCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    tenant: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies, setCookies };
}

function createTenantContext(tenantId: number, licenseKey: string) {
  const ctx: TrpcContext = {
    user: null,
    tenant: { tenantId, licenseKey },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext() {
  const ctx: TrpcContext = {
    user: null,
    tenant: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("license management (admin)", () => {
  it("admin can create a license key", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.license.create({
      maxUploads: 3,
      validDays: 30,
      note: "test-license",
    });

    expect(result).toBeDefined();
    expect(result.key).toBeDefined();
    expect(typeof result.key).toBe("string");
    expect(result.key.length).toBeGreaterThan(0);
  });

  it("admin can list license keys", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.license.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot create a license key", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.license.create({ maxUploads: 3, validDays: 30 })
    ).rejects.toThrow();
  });
});

describe("tenant admin (admin)", () => {
  it("admin can list tenants", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenantAdmin.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot list tenants", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tenantAdmin.list()).rejects.toThrow();
  });
});

describe("data isolation", () => {
  it("tenant context resolves session for their own data", async () => {
    // Tenant with id=999 (no data) should get null sessionId
    const { ctx } = createTenantContext(999, "TEST-KEY");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shelf.latestSession();
    // Should return null since tenant 999 has no uploads
    expect(result.sessionId).toBeNull();
  });

  it("admin without override gets global session", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shelf.latestSession();
    // Admin gets global latest session (may be null or a number)
    expect(result).toHaveProperty("sessionId");
  });
});

describe("auth.logout clears both cookies", () => {
  it("clears session and tenant cookies", async () => {
    const { ctx, clearedCookies } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(2);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[1]?.name).toBe(TENANT_COOKIE_NAME);
  });
});
