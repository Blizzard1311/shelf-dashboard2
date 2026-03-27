import { COOKIE_NAME, TENANT_COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getLatestSessionId,
  getShelfDashboardStats,
  getShelfSummaryList,
  getShelfCodeList,
  getUploadSessions,
  getUploadSessionById,
  getUploadSessionsForTenant,
  getShelfPlanogramData,
  getCategoryList,
  getShelfSummaryListPaged,
  getShelfEfficiencyList,
  getOverallEfficiencyStats,
  getCategoryEfficiencyList,
  getShelfProductEfficiency,
  getSummaryStats,
  // 序列号 & 租户
  createLicenseKey,
  getLicenseKeyList,
  disableLicenseKey,
  deleteLicenseKey,
  getTenantList,
  getTenantById,
  getLatestSessionIdForTenant,
  getTenantShelfData,
  expireOverdueTenants,
  getAdminDashboardData,
  compareUploadSessions,
} from "./db";

type DataAccessContext = {
  user: { role?: string } | null;
  tenant: { tenantId: number } | null;
};

function assertDataViewer(ctx: DataAccessContext) {
  if (ctx.user?.role === "admin" || ctx.tenant?.tenantId) {
    return;
  }
  throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录后查看数据" });
}

async function assertSessionAccess(ctx: DataAccessContext, sessionId: number) {
  assertDataViewer(ctx);

  const session = await getUploadSessionById(sessionId);
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "上传批次不存在" });
  }

  if (ctx.user?.role === "admin") {
    return session;
  }

  if (session.tenantId !== ctx.tenant?.tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权访问其他序列号的数据" });
  }

  return session;
}

/**
 * 获取当前请求的有效 sessionId：
 * - 租户：取该租户最新的 sessionId
 * - 管理员：取全局最新（或指定租户的）sessionId
 * - 未登录：禁止访问
 */
async function resolveSessionId(ctx: { user: any; tenant: any }, overrideTenantId?: number): Promise<number | null> {
  assertDataViewer(ctx);
  // 管理员查看指定租户数据
  if (overrideTenantId && ctx.user?.role === 'admin') {
    return getLatestSessionIdForTenant(overrideTenantId);
  }
  // 租户登录
  if (ctx.tenant?.tenantId) {
    return getLatestSessionIdForTenant(ctx.tenant.tenantId);
  }
  // 管理员：全局最新
  return getLatestSessionId();
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(TENANT_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("admin_session_id", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── 序列号管理（管理员专用） ───
  license: router({
    // 生成序列号
    create: adminProcedure
      .input(z.object({
        maxUploads: z.number().min(0).default(3),   // 0=无限制
        validDays: z.number().min(0).default(30),   // 0=无限制
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createLicenseKey({
          maxUploads: input.maxUploads,
          validDays: input.validDays,
          ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        });
      }),

    // 序列号列表
    list: adminProcedure.query(async () => {
      await expireOverdueTenants();
      return getLicenseKeyList();
    }),

    // 停用序列号
    disable: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await disableLicenseKey(input.id);
        return { success: true };
      }),

    // 删除停用的序列号
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        try {
          await deleteLicenseKey(input.id);
          return { success: true };
        } catch (err) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: err instanceof Error ? err.message : 'Delete failed',
          });
        }
      }),
  }),

  // ─── 租户管理（管理员专用） ───
  tenantAdmin: router({
    // 租户列表
    list: adminProcedure.query(async () => {
      await expireOverdueTenants();
      return getTenantList();
    }),

    // 查看指定租户的最新 sessionId
    latestSession: adminProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        const sessionId = await getLatestSessionIdForTenant(input.tenantId);
        return { sessionId };
      }),

    // 导出租户数据（返回原始行，前端生成 Excel）
    exportData: adminProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ input }) => {
        return getTenantShelfData(input.tenantId);
      }),
  }),

  // ─── 货架透视相关接口（支持租户隔离） ───
  shelf: router({
    // 获取最新一次上传的 sessionId（租户隔离）
    latestSession: publicProcedure
      .input(z.object({ tenantId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const sessionId = await resolveSessionId(ctx, input?.tenantId);
        return { sessionId };
      }),

    // 看板统计数据
    dashboardStats: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getShelfDashboardStats(input.sessionId);
      }),

    // 货架方块列表（按货架编码汇总）
    shelfList: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getShelfSummaryList(input.sessionId);
      }),

    // 货架编码列表（用于筛选）
    shelfCodes: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getShelfCodeList(input.sessionId);
      }),

    // 上传历史列表
    uploadSessions: publicProcedure.query(async ({ ctx }) => {
      assertDataViewer(ctx);
      if (ctx.user?.role === "admin") {
        return getUploadSessions();
      }
      return getUploadSessionsForTenant(ctx.tenant!.tenantId);
    }),

    // 单货架棚格图数据
    planogram: publicProcedure
      .input(z.object({ sessionId: z.number(), shelfCode: z.string() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getShelfPlanogramData(input.sessionId, input.shelfCode);
      }),

    // 大类列表（用于筛选器下拉）
    categoryList: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getCategoryList(input.sessionId);
      }),

    // 分页获取货架汇总列表（支持大类筛选）
    shelfListPaged: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        category: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getShelfSummaryListPaged(
          input.sessionId,
          input.page,
          input.pageSize,
          input.category
        );
      }),

    // 全场汇总指标（生命力透视顶部卡片）
    overallEfficiency: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getOverallEfficiencyStats(input.sessionId);
      }),

    // 按大类汇总排面效率
    categoryEfficiency: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getCategoryEfficiencyList(input.sessionId);
      }),

    // 全货架排面效率列表（生命力透视第一层）
    shelfEfficiencyList: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        category: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getShelfEfficiencyList(input.sessionId, input.category);
      }),

    // 单货架商品排面效率详情（生命力透视第二层）
    shelfProductEfficiency: publicProcedure
      .input(z.object({ sessionId: z.number(), shelfCode: z.string() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getShelfProductEfficiency(input.sessionId, input.shelfCode);
      }),

    // 货架卡看板区域一汇总指标（支持大类筛选）
    summaryStats: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        category: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId);
        return getSummaryStats(input.sessionId, input.category);
      }),
  }),

  // 管理员仪表板
  admin: router({
    // 获取管理员仪表板数据（所有用户的统计信息和货架效率）
    dashboard: adminProcedure
      .query(async () => {
        return getAdminDashboardData();
      }),
  }),

  // 数据对比分析
  comparison: router({
    // 对比两个上传会话的数据
    compare: publicProcedure
      .input(z.object({ sessionId1: z.number(), sessionId2: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertSessionAccess(ctx, input.sessionId1);
        await assertSessionAccess(ctx, input.sessionId2);
        return compareUploadSessions(input.sessionId1, input.sessionId2);
      }),
  }),
});

export type AppRouter = typeof appRouter;
