import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getLatestSessionId,
  getShelfDashboardStats,
  getShelfSummaryList,
  getShelfCodeList,
  getUploadSessions,
} from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 货架透视相关接口
  shelf: router({
    // 获取最新一次上传的 sessionId
    latestSession: publicProcedure.query(async () => {
      const sessionId = await getLatestSessionId();
      return { sessionId };
    }),

    // 看板统计数据
    dashboardStats: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return getShelfDashboardStats(input.sessionId);
      }),

    // 货架方块列表（按货架编码汇总）
    shelfList: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return getShelfSummaryList(input.sessionId);
      }),

    // 货架编码列表（用于筛选）
    shelfCodes: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return getShelfCodeList(input.sessionId);
      }),

    // 上传历史列表
    uploadSessions: publicProcedure.query(async () => {
      return getUploadSessions();
    }),
  }),
});

export type AppRouter = typeof appRouter;
