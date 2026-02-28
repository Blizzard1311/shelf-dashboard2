import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { extractTenantFromRequest } from "../tenant-auth";
import { extractAdminFromRequest } from "../admin-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** 租户信息（通过序列号登录时存在） */
  tenant: { tenantId: number; licenseKey: string } | null;
};

/**
 * 将管理员会话信息转换为 User 对象格式（兼容现有 adminProcedure 检查）
 * 不再调用 Manus OAuth SDK，完全本地 JWT 验证
 */
function adminToUser(admin: { username: string; role: "admin" }): User {
  return {
    id: 0,
    openId: `admin:${admin.username}`,
    name: admin.username,
    email: null,
    loginMethod: "password",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let tenant: { tenantId: number; licenseKey: string } | null = null;

  // 优先检查管理员会话（本地 JWT，无需访问 Manus OAuth）
  try {
    const admin = await extractAdminFromRequest(opts.req);
    if (admin) {
      user = adminToUser(admin);
    }
  } catch {
    user = null;
  }

  // 尝试提取租户信息（序列号登录）
  try {
    tenant = await extractTenantFromRequest(opts.req);
  } catch {
    tenant = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenant,
  };
}
