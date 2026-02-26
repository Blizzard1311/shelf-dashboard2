import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { extractTenantFromRequest } from "../tenant-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** 租户信息（通过序列号登录时存在） */
  tenant: { tenantId: number; licenseKey: string } | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let tenant: { tenantId: number; licenseKey: string } | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // 尝试提取租户信息（序列号登录）
  try {
    tenant = await extractTenantFromRequest(opts.req);
  } catch (error) {
    tenant = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenant,
  };
}
