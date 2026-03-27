/**
 * 测试：货架透视分页查询 + 大类筛选接口
 * 注意：这些测试不依赖真实数据库，仅验证 tRPC 路由的参数校验逻辑
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db 模块，避免真实数据库连接
vi.mock("./db", () => ({
  getLatestSessionId: vi.fn().mockResolvedValue(1),
  getUploadSessionById: vi.fn(async (sessionId: number) => ({
    id: sessionId,
    tenantId: sessionId === 2 ? 999 : 123,
    fileName: "test.xlsx",
    totalRows: 0,
    shelfCount: 0,
    productCount: 0,
    uploadedBy: null,
    createdAt: new Date(),
  })),
  getShelfDashboardStats: vi.fn().mockResolvedValue({
    totalRows: 100,
    totalShelfCodes: 50,
    totalProductCodes: 200,
    totalSalesAmount: 99999,
    totalSalesQty: 5000,
  }),
  getShelfSummaryList: vi.fn().mockResolvedValue([]),
  getShelfCodeList: vi.fn().mockResolvedValue(["A001", "A002", "B001"]),
  getUploadSessions: vi.fn().mockResolvedValue([]),
  getUploadSessionsForTenant: vi.fn().mockResolvedValue([]),
  getShelfPlanogramData: vi.fn().mockResolvedValue([]),
  getCategoryList: vi.fn().mockResolvedValue(["食品", "饮料", "日用品"]),
  getShelfSummaryListPaged: vi.fn().mockResolvedValue({
    rows: [
      {
        shelfCode: "A001",
        totalSalesAmount: 12345,
        totalGrossProfit: 3000,
        totalSalesQty: 500,
        productCount: 10,
      },
      {
        shelfCode: "A002",
        totalSalesAmount: 8000,
        totalGrossProfit: 2000,
        totalSalesQty: 300,
        productCount: 8,
      },
    ],
    total: 50,
  }),
  getShelfEfficiencyList: vi.fn().mockResolvedValue([]),
  getOverallEfficiencyStats: vi.fn().mockResolvedValue(null),
  getCategoryEfficiencyList: vi.fn().mockResolvedValue([]),
  getShelfProductEfficiency: vi.fn().mockResolvedValue([]),
  getSummaryStats: vi.fn().mockResolvedValue(null),
  getLatestSessionIdForTenant: vi.fn().mockResolvedValue(1),
  getTenantShelfData: vi.fn().mockResolvedValue([]),
  expireOverdueTenants: vi.fn().mockResolvedValue(0),
  createLicenseKey: vi.fn(),
  getLicenseKeyList: vi.fn().mockResolvedValue([]),
  disableLicenseKey: vi.fn(),
  deleteLicenseKey: vi.fn(),
  getTenantList: vi.fn().mockResolvedValue([]),
  getTenantById: vi.fn().mockResolvedValue(null),
  getAdminDashboardData: vi.fn().mockResolvedValue([]),
  compareUploadSessions: vi.fn().mockResolvedValue(null),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    tenant: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createTenantContext(tenantId = 123): TrpcContext {
  return {
    user: null,
    tenant: { tenantId, licenseKey: "TEST-KEY" },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("shelf.categoryList", () => {
  it("租户可以读取自己的大类列表", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.shelf.categoryList({ sessionId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain("食品");
    expect(result).toContain("饮料");
    expect(result).toContain("日用品");
  });

  it("未登录用户不能读取数据", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.shelf.categoryList({ sessionId: 1 })).rejects.toThrow();
  });

  it("租户不能读取其他租户 session", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.shelf.categoryList({ sessionId: 2 })).rejects.toThrow();
  });
});

describe("shelf.shelfListPaged", () => {
  it("默认分页参数返回正确结构", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.shelf.shelfListPaged({
      sessionId: 1,
      page: 1,
      pageSize: 20,
    });
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.rows)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("带大类筛选参数时正常调用", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.shelf.shelfListPaged({
      sessionId: 1,
      page: 1,
      pageSize: 20,
      category: "食品",
    });
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("total");
  });

  it("page 参数不能小于 1", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.shelf.shelfListPaged({ sessionId: 1, page: 0, pageSize: 20 })
    ).rejects.toThrow();
  });

  it("pageSize 不能超过 100", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.shelf.shelfListPaged({ sessionId: 1, page: 1, pageSize: 101 })
    ).rejects.toThrow();
  });

  it("返回的 rows 包含必要字段", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.shelf.shelfListPaged({
      sessionId: 1,
      page: 1,
      pageSize: 20,
    });
    if (result.rows.length > 0) {
      const row = result.rows[0];
      expect(row).toHaveProperty("shelfCode");
      expect(row).toHaveProperty("totalSalesAmount");
      expect(row).toHaveProperty("totalGrossProfit");
      expect(row).toHaveProperty("totalSalesQty");
      expect(row).toHaveProperty("productCount");
    }
  });
});
